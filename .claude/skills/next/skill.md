---
name: next
description: "다음 작업 자동 선택 및 즉시 구현. Use when: 뭐 할까, 다음, 시작, next, what's next"
---

# 다음 작업 자동 선택

TODO, plan, 개선 아이디어에서 다음 작업을 찾아 즉시 구현을 시작합니다.

## 작업 소스 스캔 순서

1. **TODO In Progress** - 이미 진행 중인 작업 (최우선)
2. **TODO Pending + Plan 문서** - 동등한 우선순위로 모두 스캔
   - `{project}/TODO.md`의 Pending 항목
   - `common/docs/plan/*.md`의 미완료 항목
   - `{project}/docs/plan/*.md`의 미완료 항목 (프로젝트별 계획)
   - 모든 항목을 분석하여 **가장 중요하고 영향력 있는 작업** 선택
   - 고려 요소: 기능 중요도, 사용자 경험 개선, 기술 부채 해결, 의존성
3. **개선 아이디어** - `common/docs/*improvement*.md` (P0 → P1 순)

**스캔 제외 대상**:
- 파일명에 `MANUAL_TASKS`가 포함된 파일은 스캔 대상에서 완전 제외
- `{project}/MANUAL_TASKS.md` — 수동 작업 목록 (사용자 전용)
- plan 문서 내 `(→ MANUAL_TASKS)` 태그가 붙은 항목도 작업 후보에서 제외

## 충돌 방지 메커니즘

### WORKER-ID 생성

각 세션은 고유 WORKER-ID를 생성합니다:

```powershell
$workerId = "$env:COMPUTERNAME/$((Split-Path -Leaf $PWD))@$(Get-Date -Format 'MMdd-HHmm')"
# 예: DESKTOP-A/wtools@0208-1430
```

- PC명 + 프로젝트명 + 시작시간으로 고유 식별
- 같은 PC, 같은 프로젝트를 여러 경로에 클론해도 시작시간으로 구분

### 진행 중 마킹 형식

```markdown
- [ ] 미완료 항목                           ← 선택 가능
- [→DESKTOP-A/wtools@0208-1430] 진행중 항목  ← 다른 세션이 작업 중, 스킵
- [x] 완료 항목                             ← 스킵
```

### 스캔 시 처리

**정규식**: `\[→([^\]]+)\]`로 진행 중 항목 매칭

**Stale 판단**: `@MMdd-HHmm` 시작시간이 6시간 이상 경과하면 stale로 판단
- Stale 항목은 `[→...]` → `[ ]`로 자동 해제
- 해제된 항목은 선택 가능 (비정상 종료된 세션 자동 정리)

**스캔 로직**:
1. plan/TODO 파일에서 체크박스 스캔
2. `[→...]` 패턴 발견 시:
   - 시작시간 파싱 (`@(\d{4}-\d{4})`)
   - 현재 시간과 비교하여 6시간 이상이면 stale 판단
   - stale이면 `[ ]`로 되돌리고 선택 가능
   - stale 아니면 해당 항목 스킵
3. `[ ]` 항목만 선택 후보에 포함

## 실행 단계

### 1단계: 작업 소스 스캔

```powershell
# 프로젝트 목록 읽기 (projects.json에서)
$configPath = Join-Path $PSScriptRoot "..\..\projects.json"
$config = Get-Content $configPath | ConvertFrom-Json

# 각 프로젝트의 절대경로는 $config.projects[].path 사용
# 모든 15개 프로젝트를 순회하며 각 프로젝트의 docs/plan/ 스캔
```

**TODO.md 확인:**
- projects.json의 각 프로젝트 경로에서 `TODO.md` 파일 확인
- `## In Progress` 섹션에 항목 있으면 → 해당 작업 선택
- 없으면 `## Pending` 섹션 첫 번째 항목 선택

**Plan 문서 확인:**
- wtools 감지 (현재 디렉토리에 `common/` 폴더 존재 여부):
  - **있으면**: `common/docs/plan/*.md` 파일들도 스캔 (공통 계획)
  - **없으면**: 현재 프로젝트의 `docs/plan/*.md`만 스캔
- projects.json의 각 `{proj.path}/docs/plan/*.md` 파일들 스캔 (모든 15개 프로젝트)
- `[ ]` 또는 `[→TODO]` 상태인 항목 찾기
- `[→WORKER-ID]` 패턴은 다른 세션이 작업 중이므로 **스킵** (6시간 이상 경과 시 stale로 자동 해제)
- **상태 필터**: `구현완료`, `보류` 상태의 plan은 스킵. `초안`, `검토대기`, `검토완료`, `구현중`, `수정필요` 상태만 스캔
- **"상태:" 태그가 없는 plan**도 체크박스(`[ ]`) 존재 여부로 미완료 판단
- `_todo.md`, `_todo-N.md` 파일도 함께 스캔
- 우선순위(P0 > P1 > P2) 높은 것 선택

**개선 아이디어 확인:**
- `common/docs/*improvement*.md` 파일 스캔
- `완료` 표시 없는 P0 항목 찾기
- 없으면 P1 항목 찾기

### 2단계: 작업 선택 및 출력

선택된 작업 정보 출력:

```
📋 다음 작업 선택됨

소스: {소스 파일}
프로젝트: {프로젝트명}
작업: {작업 내용}
우선순위: {P0/P1/P2}

→ 구현 시작합니다...
```

### 2.5단계: 충돌 방지 마킹 (plan/TODO 파일만 해당)

선택한 작업이 plan 또는 TODO 파일의 체크박스 항목이면 마킹:

1. **WORKER-ID 생성**:
   ```powershell
   $workerId = "$env:COMPUTERNAME/$((Split-Path -Leaf $PWD))@$(Get-Date -Format 'MMdd-HHmm')"
   ```

2. **파일 수정**: 선택한 항목의 `[ ]` → `[→$workerId]`로 변경
   - plan 파일: `common/docs/plan/*.md` 또는 `{project}/docs/plan/*.md`
   - TODO 파일: `{project}/TODO.md` 또는 `wtools/TODO.md`

3. **Git 동기화 (선택적)**:
   ```bash
   git add {변경된 파일}
   powershell.exe -Command "Set-Location '{레포경로}'; & 'D:\work\project\tools\common\commit.ps1' 'chore: mark task in progress by $workerId'"
   git push
   ```
   - push 실패 시: 경고 출력하되 작업은 계속 진행
   - 로컬 마킹은 유지되므로 해당 세션에서 중복 선택 방지됨

### 워크트리 크래시 복구 안내

plan 헤더에 `> branch:` 필드가 있으면 해당 워크트리가 이미 존재하는 것이므로, `/implement` 실행 시 크래시 복구 흐름으로 자동 재개된다. 별도 처리 불필요.

### 3단계: implement 워크플로우 실행

선택된 작업으로 implement 스킬 로직 실행:

1. **TODO.md 업데이트**
   - Pending → In Progress로 이동
   - plan에서 선택 시: `[→TODO]` 표시

2. **구현**
   - 코드 작성
   - 테스트 (빌드 확인)

3. **완료 처리 → `/done` 스킬 호출**
   - 구현 완료 후 반드시 `/done` 스킬을 호출
   - done 스킬이 처리: plan 체크, TODO→DONE, 아카이브, wtools/TODO.md 동기화, 검증, 커밋

## 선택 우선순위 로직

```
# 사전 필터: MANUAL_TASKS 파일 제외
# 스캔 대상에서 MANUAL_TASKS.md 파일은 완전 제외
# plan 문서 내 "(→ MANUAL_TASKS)" 태그가 붙은 항목도 제외

if (TODO In Progress 있음):
    return In Progress 첫 번째 항목
elif (TODO Pending 또는 Plan 문서에 미완료 있음):
    # TODO Pending + Plan 문서를 모두 수집
    # 각 항목의 내용을 분석:
    #   - 기능의 중요도 (핵심 기능 > 부가 기능)
    #   - 사용자 경험 개선 효과
    #   - 다른 작업에 대한 의존성/선행 필요 여부
    #   - 기술 부채 해결 효과
    # 가장 중요하고 영향력 있는 작업 선택
    return AI가 판단한 최적 항목
elif (개선 아이디어에 P0 미완료 있음):
    return P0 첫 번째 항목
elif (개선 아이디어에 P1 미완료 있음):
    return P1 첫 번째 항목
else:
    return "현재 할 일이 없습니다. plan 문서를 작성하거나 TODO를 추가하세요."
```

## 할 일 없을 때

모든 소스에서 작업을 찾지 못하면:

```
✅ 현재 할 일이 없습니다!

다음 중 하나를 해보세요:
1. common/docs/plan/에 새 계획 문서 작성
2. 프로젝트 TODO.md에 작업 추가
3. common/docs/*improvement*.md 검토
```

## 0단계: wtools/TODO.md 최신 여부 확인

**스캔 시작 전** wtools/TODO.md의 "마지막 업데이트" 날짜를 확인합니다:

1. wtools/TODO.md의 "마지막 업데이트" 날짜 읽기
2. 오늘 날짜와 비교
3. **당일이면** → 그대로 wtools/TODO.md에서 스캔 (빠름)
4. **이전 날짜면** → 각 프로젝트 TODO.md의 In Progress 항목만 빠르게 수집하여 wtools/TODO.md 갱신 후 스캔

> wtools/TODO.md가 최신이면 이 파일 하나만 읽으면 되므로 빠름.
> `/implement`, `/done`, `/plan` 실행 시 자동 갱신되므로 대부분 최신 상태.

## 스캔 범위 옵션

- `/next` → **wtools/TODO.md**에서 In Progress → Pending 순서로 확인 (빠름, 기본)
- `/next --all` → TODO + plan 문서 + 개선 아이디어까지 전체 스캔 (아래 "작업 소스 스캔 순서" 전체 실행)
- **Agent 자동 모드** → `--all`이 기본 (wtools/TODO.md에 없어도 프로젝트 plan에서 작업 발견 가능)

> **기본 동작을 경량화하는 이유**: 인사이트 분석에서 "파일 스캔 중 세션 종료" 문제가 지적됨.
> wtools/TODO.md가 최신이면 파일 1개만 읽어서 즉시 실행하여 세션 완료율 향상.

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
