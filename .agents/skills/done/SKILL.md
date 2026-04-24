---
name: done
description: "구현 완료 후처리 (plan 체크, archive, TODO→DONE, commit). Use when: 완료, 끝, done, 마무리, 완료처리"
---

# 구현 완료 후처리

구현 완료 후 문서 정리와 커밋을 자동으로 처리합니다.

## 트리거

- "완료", "끝", "done", "마무리"
- 구현이 끝났을 때

## 실행 단계

### 0단계: 고아 pytest 선제 정리

done 실행 전 이전 세션 잔여 pytest가 메모리를 점유하고 있을 수 있다.

Bash로 실행:
```powershell
# 1순위: 현재 프로젝트 스크립트
if (Test-Path ".\scripts\kill-orphan-procs.ps1") {
  powershell.exe -ExecutionPolicy Bypass -File ".\scripts\kill-orphan-procs.ps1"
}
# 2순위(선택): 공용 fallback 경로가 존재할 때만 실행
elseif (Test-Path "D:\work\project\tools\monitor-page\scripts\kill-orphan-procs.ps1") {
  powershell.exe -ExecutionPolicy Bypass -File "D:\work\project\tools\monitor-page\scripts\kill-orphan-procs.ps1"
}
```

실패하거나 스크립트가 없으면 무시하고 1단계로 진행.

### 1단계: 관련 plan 문서 찾기

**프로젝트 경로 해석:**
```powershell
$projectConfigPath = "D:\work\project\service\wtools\.agents\projects.json"
if (-not (Test-Path $projectConfigPath)) {
  $projectConfigPath = "D:\work\project\service\wtools\.claude\projects.json"
}
$config = Get-Content $projectConfigPath | ConvertFrom-Json
# 각 프로젝트의 절대경로: $config.projects[].path
```

**wtools 감지**: 현재 디렉토리에 `common/tools/` 폴더 존재 여부로 판단
- **있으면**: wtools 내부 → AGENTS.md 문서 위치 규칙의 plan 경로 확인
- **없으면**: 외부 프로젝트 → AGENTS.md 문서 위치 규칙의 plan 경로 확인 (기본: `docs/plan/`)

### 1.1단계: 대상 plan anchor precedence (고정)

- **1순위**: 사용자가 plan 파일 경로를 명시했다면 그 경로만 primary anchor로 사용한다. (예: `/done D:\...\plan\2026-...md`)
- **2순위**: 직전 `/merge-test` 또는 `/implement` 흐름에서 `worktree-owner`/parent plan 경로가 명시돼 있으면 그 plan을 primary anchor로 고정한다.
- **3순위**: 위 둘이 없고 현재 대화에서 plan 링크가 **단 1개**면 그 plan을 anchor로 삼는다.
- **4순위**: 후보가 2개 이상이면 자동 선택하지 말고 **중단**하고 사용자에게 explicit plan 경로를 요청한다. (auto-switch 금지)
- unrelated active/dirty plan은 primary anchor에서 제외하고, 필요 시 "연관 plan 참고"로만 분류한다.

아래 **모든 경로**에서 현재 작업과 관련된 계획 문서를 찾습니다:

```
AGENTS.md 문서 위치 규칙의 plan 경로/*.md
```

### 1.2단계: main 기존 수정사항 무시 모드 (사용자 명시 지시 시)

사용자가 "main의 기존 수정사항을 고려하지 말라"고 명시한 경우:

- 실행 지시문(고정): **"상관없는 main 변경 감지는 무시하고, 현재 plan 대상 레포 변경만 처리한다."**
- 루트(main worktree)의 기존 `dirty`/`untracked` 파일은 done 중단 사유로 취급하지 않는다.
- 루트(main)의 기존 수정 파일은 읽기/수정/복구/스테이징 대상에서 제외한다.
- plan 완료 판정, TODO→DONE 이동, 커밋 대상 판단은 현재 작업 워크트리(impl/\*) 변경분만 기준으로 수행한다.
- 무시 모드는 "중단 판정 완화"에만 적용되며, 판정 범위를 제외한 동작은 기존 규칙을 유지한다.
- 단, `.git` 보호 규칙과 파괴적 명령 금지 규칙은 그대로 유지한다.

### 2단계: plan 문서 완료 체크 & 진행률 업데이트

**구현 순서 섹션의 항목 체크:**
```markdown
## 구현 순서

1. [x] P0: 완료된 항목   ← [ ] 또는 [→WORKER-ID] → [x] 변경
2. [ ] P1: 미완료 항목
```

**충돌 방지 마킹 해제**:
- `[→WORKER-ID]` 패턴을 `[x]`로 변환 (정규식: `\[→[^\]]+\]` → `[x]`)
- `[ ]`도 여전히 `[x]`로 변환 (기존 동작 유지)

**진행률 계산 후 헤더·푸터 업데이트:**
```markdown
> 상태: 구현중
> 진행률: 1/2 (50%)       ← [x] 개수 / 전체 개수
...
*상태: 구현중 | 진행률: 1/2 (50%)*
```

**완료 판단 시 MANUAL_TASKS 항목은 제외합니다.** (수동 검증은 사용자 몫)

**코드블럭/인라인 코드 내 `[ ]`는 체크박스 카운트에서 제외됩니다.** (파싱 시 자동 필터링)
- 단, plan 작성 시에는 예시 체크박스를 `☐`(U+2610)로 표기 권장
- 참고: `/plan` 스킬의 "## 코드블럭 내 체크박스 규칙"

### 1.5단계: 사전 검증 (구현완료 설정 전 게이트)

> **🔴 이 검증은 상태를 "구현완료"로 변경하기 전에 반드시 통과해야 한다.**
> 검증 실패 시 상태 변경 없이 즉시 중단한다.

**2.5 branch/worktree 검증 (수동 `/done` 전용):**

> 자동 파이프라인(plan-runner Stage 6)에서는 MergeWorkflow가 이미 worktree를 삭제했으므로 면제.

1. plan 헤더에서 `> branch:` 또는 `> worktree:` 필드 유무 확인
2. **필드가 있으면** → 중단:
   ```
   ⚠️ plan에 활성 branch/worktree가 있습니다: {branch}
   worktree 사용 케이스이므로 먼저 /merge-test를 실행하여 머지 + 통합테스트를 완료하세요.
   (_todo-N.md라면 같은 `> 계획서:` parent를 가진 항목을 배치로 함께 처리)
   done 처리 중단.
   ```
3. **필드가 없으면** → 계속 진행
   - 이 직접 경로는 worktree 미사용 구현일 때만 허용한다.

**2.6 fix: plan 재발 경로 검증:**

plan/todo 파일명에 `_fix-`/`_fix_`가 포함되거나 제목이 `fix:`로 시작하면:

1. plan/todo 내용에서 "재발 경로 분석" 또는 "Phase R" 문자열 검색
2. **없으면** → 경고 출력 + 중단:
   ```
   ⚠️ fix: plan에 재발 경로 분석(Phase R)이 없습니다.
   /implement에서 Phase R을 먼저 실행하세요.
   done 처리 중단.
   ```
3. **있으면** → Phase R 섹션(### Phase R ~ 다음 ### 사이) 내에서만 "미방어" 문자열 검색 (코드블럭·템플릿 텍스트 제외)
4. Phase R 섹션 내 "미방어" 경로가 남아있으면 → 경고 + 중단:
   ```
   ⚠️ 재발 경로 분석에 미방어 경로가 남아있습니다.
   미방어 경로를 모두 수정한 후 다시 /done 하세요.
   ```
5. 전부 "방어됨"이면 → 정상 통과

**2.7 DB-direct evidence gate:**

plan 또는 archive 본문에 `Phase DB-Direct`가 있으면:

1. 완료 근거에서 `실행 SQL/명령`, `존재 확인 쿼리`, `live API 또는 runtime 결과` 3종 존재 여부를 확인
2. **하나라도 없으면** → 경고 출력 + 중단:
   ```
   ⚠️ Phase DB-Direct 실행 증거가 부족합니다.
   `DB-direct 미실행`, `live 검증 미실행`, `직접 실행 대기` 상태이므로 /done에서 `구현완료` 또는 `완료`로 닫을 수 없습니다.
   먼저 /merge-test에서 running DB 반영 + 존재 검증 + live/runtime 검증 evidence를 남기세요.
   done 처리 중단.
   ```
3. 3종이 모두 있으면 → 정상 통과

> 1.5단계를 통과한 경우에만 아래 2단계(구현완료 상태 설정 + 반영일시 기록)로 진행한다.

**모든 항목 완료 시 상태 변경:**
```markdown
> 상태: 구현완료
> 반영일시: YYYY-MM-DD HH:MM
> 진행률: 2/2 (100%)
...
*상태: 구현완료 | 진행률: 2/2 (100%)* 
```

`반영일시`는 상태를 `구현완료`로 변경하는 시점의 로컬 시각을 분 단위로 기록한다.
관련 plan에 `Phase DB-Direct`가 있으면 `running DB 반영 여부`, `존재 검증 여부`, `live 검증 여부`가 모두 확인된 경우에만 위 상태 변경을 수행한다.
`문서/테스트는 끝났지만 running DB 반영은 아직` 상태를 `완료`, `마무리`, `닫힘`으로 표현하면 안 된다.

### 3단계: plan 문서 아카이브 (모든 항목 완료 시)

plan 문서의 모든 체크박스가 `[x]`이면:

**🔴 TODO 파일 동반 아카이브 필수**

- `/done` 실행 시 Codex가 선택하는 **primary 파일은 TODO 파일**이다.
  (`_todo.md` 단일 파일 또는 `_todo-N.md` 복수 파일)
- **복수 TODO (`_todo-N.md`)**: 같은 stem의 `{stem}_todo-*.md`를 glob 탐색하여 **모든 `_todo-N.md`가 완료**(`[ ]` 잔존 없음)일 때만 전체 archive 진행. 대표 문서(`{stem}.md`)도 함께 archive.
  대표 문서의 진행률 = 모든 `_todo-N.md`의 `[x]` 합계 / 전체 체크박스 합계.
- **단일 TODO (`_todo.md`)**: 기존 동작 유지 — plan 원본도 함께 archive. (하위 호환)
- **단일 파일 plan** (TODO 분리 없음): plan 파일 하나만 아카이브.

**아카이브 이동 대상:**

| 형태 | primary | 동반 파일 |
|---|---|---|
| 분리 | `_todo-1.md`, `_todo-2.md`, ... | 대표 문서 `{stem}.md` |
| 단일 TODO | `_todo.md` | plan 원본 `{stem}.md` (archive에 있으면 스킵) |
| 단일 파일 | plan `.md` | 없음 |

1. **plan**: AGENTS.md 문서 위치 규칙의 plan 경로 → AGENTS.md 문서 위치 규칙의 archive 경로
4. **아카이브 이동 시 반드시 `git mv` 사용** (git 히스토리 보존):

```powershell
# ✅ 올바른 방법 — _todo.md와 원본 plan 둘 다 이동
git mv -f "docs/plan/YYYY-MM-DD_{주제}_todo.md" "docs/archive/YYYY-MM-DD_{주제}_todo.md"
# 원본 plan이 docs/plan/ 에 남아있으면 함께 이동 (이미 archive에 있으면 스킵)
# git mv -f "docs/plan/YYYY-MM-DD_{주제}.md" "docs/archive/YYYY-MM-DD_{주제}.md"

# 이동 후 archive 헤더 추가 (Set-Content 또는 Edit 도구)
git add "docs/archive/YYYY-MM-DD_{주제}_todo.md"

# ❌ FORBIDDEN: Move-Item / Remove-Item — 히스토리 유실
# Move-Item -Path "{plan경로}" -Destination "{archive경로}"
# Remove-Item -Path "{plan경로}" -Force
```

- plans 워크트리에서는 `Resolve-DocsCommitRoot` 기준 cwd로 이동하고 `Resolve-DocsCommitCandidates` 반환 파일만 add한다.
- `git add -A`는 plans 워크트리에서도 금지한다.
- wtools 공통 plan/archive도 `Resolve-DocsCommitRoot`/`Resolve-DocsCommitCandidates` helper를 따른다. `.worktrees/plans/docs/*`가 있으면 plans lineage 이동/커밋을 우선 사용하고, legacy `common/docs/*`는 fallback으로만 유지한다.

5. 아카이브 헤더 추가 (`git mv` 이동 후 Edit 도구 또는 Set-Content로 파일 상단에 삽입):

```markdown
# {제목}

> 완료일: YYYY-MM-DD
> 아카이브됨
> 진행률: N/N (100%)
> 요약: {원본 plan에서 복사}
```

### 3.5단계: 금지어 체크 (fix: plan만)

fix: plan인 경우, 안내 텍스트와 커밋 메시지에 아래 표현이 포함되면 경고 후 대체:
- ❌ "근본 수정", "근본 해결", "완전 해결", "최종 수정", "영구 수정"
- ✅ 대체: "N개 경로 방어 완료", "재발 경로 M개 중 M개 방어됨"

### 4단계: TODO → DONE 이동 (수동 검증 항목 분리)

**대상 프로젝트의 TODO.md 확인:**
```
{project}/TODO.md
```

**수동 검증 항목 식별 절차:**

A. plan 문서의 `## 구현 순서` 아래 모든 체크박스 항목(`- [ ]`, `- [x]`) 텍스트를 스캔
B. 각 항목 텍스트에 수동 작업 판단 키워드가 포함되어 있는지 확인
C. 매칭된 항목을 추출하여 리스트로 수집

**수동 작업 판단 키워드**: `common/docs/guide/project-management/manual-tasks-format.md` 참조
- 한국어: `브라우저`, `UI`, `디자인`, `육안`, `시각`, `레이아웃`, `가독성`, `실기기`, `모바일`, `스크린샷`, `스타일`, `색상`, `폰트`
- 영어: `Android`, `iOS`
- **수동이 아닌 것** (CLI/curl/에이전트로 검증 가능):
  - 배포 확인, Firebase Console, Supabase Dashboard, 로그인 테스트
  - E2E 테스트, HTTP 통합 테스트, API 응답 확인 → `auto-test-e2e` 에이전트 전담
  - 스크립트 실행 확인, 빌드 확인, pytest, npm test
- **판별 원칙**: 사람의 눈/판단이 필수인 경우만 수동. CLI로 실행+검증 가능하면 수동 아님

**MANUAL_TASKS.md 생성/갱신:**

1. **파일 위치**: `{project}/MANUAL_TASKS.md` (프로젝트 루트)
2. **파일이 없으면**: 표준 형식 템플릿으로 신규 생성
   ```markdown
   # MANUAL_TASKS

   > 이 문서의 항목은 브라우저 테스트, UI 육안 확인 등 CLI로 검증 불가능한 작업입니다.
   > Codex는 이 항목을 "/next" 작업 후보에서 제외합니다.

   ## 미완료

   - [ ] {작업 내용} — from: {plan파일명.md}#{항목번호} ({날짜})

   ## 완료
   ```

3. **파일이 있으면**: `## 미완료` 섹션 하단에 새 항목 추가
4. **각 항목 형식**: `- [ ] {작업 내용} — from: {plan파일명.md}#{항목번호} ({오늘날짜})`
5. **중복 방지**: 이미 같은 `from:` 참조가 있으면 스킵
6. **plan 문서 표시**: 수동 항목은 `[x]`로 체크하고 항목 뒤에 `(→ MANUAL_TASKS)` 태그 추가

**예시:**

plan 문서에서:
```markdown
## 구현 순서
1. [x] P0: API 구현
2. [x] P1: 브라우저에서 UI 레이아웃 확인 (→ MANUAL_TASKS)
3. [x] P2: 다크모드 가독성 검증 (→ MANUAL_TASKS)
```

`{project}/MANUAL_TASKS.md`에:
```markdown
# MANUAL_TASKS

> 이 문서의 항목은 브라우저 테스트, UI 육안 확인 등 CLI로 검증 불가능한 작업입니다.
> Codex는 이 항목을 "/next" 작업 후보에서 제외합니다.

## 미완료

- [ ] 브라우저에서 UI 레이아웃 확인 — from: calendar-plan.md#2 (2026-02-08)
- [ ] 다크모드 가독성 검증 — from: calendar-plan.md#3 (2026-02-08)

## 완료
```

**완료 상태는 MANUAL_TASKS 제외 후 판단합니다.** 수동 검증 항목이 남아있어도 나머지가 모두 완료되면 "완료"로 처리합니다.

**완료된 항목을 docs/DONE.md로 이동:**

TODO.md에서:
```markdown
## In Progress
- [ ] 캘린더 내보내기   ← 제거
```

docs/DONE.md 상단에 추가:
```markdown
# DONE

- [x] 2026-01-08: 캘린더 내보내기
```

### 5단계: DONE.md 아카이브 (10개 초과 시)

docs/DONE.md 항목이 10개를 초과하면:
1. 오래된 항목 → `{project}/docs/archive/DONE-YYYY-MM.md`로 이동
2. docs/DONE.md는 최근 5개만 유지

### 6단계: wtools/TODO.md 동기화 (wtools만 해당)

**wtools 감지 조건**: 현재 디렉토리에 `common/tools/` 폴더가 있는지 확인
- **있으면**: wtools 내부 → 아래 동기화 실행
- **없으면**: 외부 프로젝트 → 이 단계 **스킵**

wtools/TODO.md를 열어 해당 프로젝트 섹션을 갱신합니다:

1. 완료된 항목 반영 (제거 또는 ~~취소선~~)
2. 진행률 수치 업데이트
3. 해당 프로젝트의 모든 TODO 완료 시 "완료 ✅" 섹션으로 이동
4. "마지막 업데이트" 날짜를 오늘로 갱신

### 6.5단계: plans/TODO.md 동기화 (plans worktree)

**대상 파일**: `D:\work\project\service\wtools\.worktrees\plans\TODO.md`

plans/TODO.md에서 **동일 제목 key 1건만** 찾아 아래처럼 정규화한다 (0건/2건 이상이면 즉시 중단):

- 완료된 plan이 archive로 이동된 경우: `[x]` + `[archive](docs/archive/...)` + `(N/N, 100%)`

수동 실행 예시 (복사-붙여넣기):

```powershell
Set-Location "D:\work\project\service\wtools\.worktrees\plans"
rg -n "{plan title seed}" TODO.md
# TODO.md 라인 수정(checkbox/link/progress)
git add TODO.md
& "D:\work\project\tools\common\commit.ps1" "docs: sync plans TODO — mark {plan title seed} done"
```

### 7단계: 완료 검증

**전제 조건 확인 (먼저 실행):**

> branch/worktree 검증은 1.5단계에서 이미 수행했으므로 여기서는 생략한다.

- plan 상태가 `구현완료`가 아니면 → 경고 출력:
  - 상태가 `구현중`이고 `> branch:` 없으면 → 계속 진행 (worktree 미사용 직접 구현)
  - 상태가 `수정필요`이면 → "현재 상태: 수정필요. merge-test 후속 수정이 끝나지 않았습니다. `/implement`로 continuation 입력을 반영한 뒤 다시 `/merge-test` 또는 `/done`을 진행하세요." + 중단
  - 그 외 상태 → "현재 상태: {상태}. `/merge-test` 또는 `/implement` 먼저 완료하세요." + 중단

커밋 전 실제로 정리가 되었는지 확인합니다:

1. **plan 문서 확인**: AGENTS.md 문서 위치 규칙의 plan 경로에 완료된 작업의 plan이 남아있지 않은지 확인
2. **프로젝트 TODO 확인**: `{project}/TODO.md`에서 완료 항목이 제거되었는지 확인
3. **wtools/TODO.md 확인**: 해당 프로젝트 섹션 진행률이 갱신되었는지 확인
4. **plans/TODO.md 확인**: plan 링크가 `docs/archive/...`를 가리키고 진행률이 `100%`인지 확인
5. **DONE.md 확인**: 완료 항목이 추가되었는지 확인

6. **워크트리/브랜치 정리 확인**: `git worktree list`에 `impl-` 패턴 없음, `git branch --list 'impl/*'`에 현재 plan 관련 브랜치 없음

누락된 항목이 있으면 돌아가서 처리합니다.

### 7.2단계: /reflect 누락 금지 체크

- 최근 실행 로그/plan 본문에서 `build/check/test` 실패 이력을 탐지한다.
- 실패 이력이 있으면 완료 안내에 아래 문구를 추가한다:
  - `⚠️ 최근 검증 실패 이력이 있어 /reflect에서 Q4 누락 금지 체크를 수행하세요.`
- 실패 이력이 없으면 기존 안내만 유지한다.
- 관련 plan에 `Phase DB-Direct`가 있었다면 완료 안내에 `running DB 반영 여부`, `live 검증 여부`를 짧은 체크 항목으로 함께 남긴다.

### 대안: auto-done.ps1 스크립트 (plan-runner 전용)

**plan-runner 워크플로우**에서는 `common/tools/auto-done.ps1 -PlanFile <경로>`로 1~8단계를 자동 처리합니다.

- **사용 시점**: plan-runner가 plan 완료를 감지했을 때 (Phase 3.5)
- **처리 범위**: plan 상태 갱신, 아카이브 이동, TODO→DONE, plans/TODO.md 동기화, wtools/TODO.md 동기화, 커밋
- **수동 실행**: `powershell -File "common\tools\auto-done.ps1" -PlanFile "path/to/plan.md"`

done 스킬은 **수동 작업 시** 또는 **auto-done.ps1 실패 시** fallback으로 사용합니다.

### 7.5단계: version-bump 판단

커밋 메시지의 prefix를 확인하여 버전 bump 여부를 결정합니다:

| prefix | 액션 |
|--------|------|
| `feat:` | minor bump |
| `fix:` | patch bump |
| `feat!:` / BREAKING CHANGE | major bump |
| `refactor:` / `style:` / `perf:` / `test:` / `docs:` / `chore:` | skip (bump 없음) |

**bump 필요 시 실행:**
```powershell
# 1순위: PowerShell
& "D:\work\project\tools\common\version-bump.ps1" -BumpType <patch|minor|major> -ProjectDir (Get-Location).Path
# 2순위: bash
bash "/d/work/project/tools/common/version-bump.sh" "<patch|minor|major>" "."
```

**CHANGELOG.md 항목 추가** (Keep a Changelog 형식):
```markdown
## [새버전] - YYYY-MM-DD
### Added      ← feat:
### Fixed       ← fix:
### Breaking    ← feat!:
- 변경 내용 설명
```
CHANGELOG.md가 없으면 파일 자동 생성 후 추가.

**변경 파일 추가 스테이징**: `git add package.json CHANGELOG.md`

**커밋 후 태그 생성**: `git tag v{새버전}`

---

### 7.6단계: plans dirty 사전 점검

세션 종료 전 `Test-PlansDirty $RepoRoot`를 호출한다. true이면 plans 워크트리의 현재 실행 수정분과 기존 잔존 dirty를 분리한다.

- 에이전트 컨텍스트(`$env:CLAUDE_RUNNER_CONTEXT` 또는 auto-impl/auto-done/plan-runner/dev-runner)면 `Resolve-DocsCommitRoot` 기준 cwd로 이동한 뒤 `Resolve-DocsCommitCandidates` 반환 파일만 add하여 자동 커밋을 1회 시도한다.
- 사람 세션(Opus 채팅)이면 경고만 출력하고 수동 복구를 안내한다.
- `git add -A`는 사용하지 않는다.

경고 템플릿:
```powershell
⚠️ plans 워크트리에 미커밋 변경 N건. main cwd의 git status에서는 보이지 않습니다.
현재 실행이 수정한 파일만 add하세요. 기존 잔존 dirty와 묶어서 커밋하지 마세요.
Set-Location "$RepoRoot\.worktrees\plans"
git status --porcelain
git add <파일명>   # 이번 실행이 수정한 파일만 개별 add
& "D:\work\project\tools\common\commit.ps1" "docs: plans manual recovery"
# push는 literal `origin plans` 대신 현재 docs commit root가 추적하는 upstream으로만 수행한다.
git push
```

### 8단계: 커밋

**🔴 이 단계를 건너뛰면 문서 변경이 uncommitted 상태로 남습니다. 반드시 실행하세요.**

**git mutation 직렬화 (필수):**
- `git add`, `git reset`, `git stash`, `commit.ps1` 같은 mutation은 **한 번에 하나씩**만 실행한다. (병렬 실행 금지 — `.git/index.lock` 재발 방지)

**🚨 CRITICAL: 반드시 PowerShell commit 함수 사용**

**💡 코드 변경과 문서 변경이 모두 unstaged 상태이면 한번에 커밋하세요.**

변경된 파일들을 커밋:
```powershell
# ✅ CORRECT
commit "docs: update plan and done"
commit "feat: {기능명}"

# ❌ WRONG - 절대 사용 금지!
git commit -m "..."
```
plans 워크트리에서 문서 변경이 있으면 `Resolve-DocsCommitRoot` 기준 cwd로 이동하고, `Resolve-DocsCommitCandidates` 반환 파일만 add한다. `git add -A`는 사용하지 않는다.

**docs-only staged exact-match 검증 (문서 화이트리스트만 add하는 경우 필수):**
- `git diff --cached --name-only` 결과가 이번 실행의 plan/archive/TODO/DONE 화이트리스트와 정확히 일치해야 한다.
- `git diff --cached --name-status` 또는 `git status --porcelain`에 `D`, `R`, `RM`, `??` 비대칭이 보이면 커밋을 중단한다.
- 비화이트리스트 파일이나 orphaned delete가 보이면 `git reset HEAD {파일}`로 일부만 제거하고 계속 진행하지 않는다.
- 복구는 `전체 unstage -> 원하는 파일만 다시 add` 패턴으로 스테이징을 처음부터 다시 구성한다.

**강제 체크:**
- [ ] `git commit` 명령어를 사용하려고 하는가? → 즉시 중단
- [ ] `commit "message"` 사용했는가? → 진행

## 체크리스트

실행 전 확인사항:

- [ ] 구현 코드가 완료되었는가?
- [ ] 테스트가 통과했는가?
- [ ] 빌드가 성공했는가?
- [ ] DB 마이그레이션 SQL 파일을 생성했다면 실행했는가? (미실행 시 API 장애)

실행 후 확인사항:

- [ ] **커밋 완료** 🔴
- [ ] plan 문서 항목 체크됨 (AGENTS.md 문서 위치 규칙의 plan 경로)
- [ ] 완료된 plan은 archive로 이동됨
- [ ] {project}/TODO.md에서 항목 제거됨
- [ ] {project}/docs/DONE.md에 항목 추가됨
- [ ] **plans/TODO.md 동기화됨**
- [ ] **wtools/TODO.md 동기화됨**
- [ ] **7단계 검증 통과** (누락 없이 모두 정리됨)

**완료 후 안내:** 모든 단계가 끝나면 아래 안내를 출력한다:
```
회고가 필요하면 /reflect를 실행하세요.
(우려점, 유사 문제, 리팩토링, 미발견 오류를 분석하고 필요시 계획서를 생성합니다)
최근 검증 실패가 있었다면 실패 명령/종료코드 표를 먼저 작성하고 Q4 해당 없음 판정을 금지하세요.
```

## 파일 경로 규칙

| 문서 | 경로 |
|------|------|
| 계획 문서 | AGENTS.md 문서 위치 규칙의 plan 경로 |
| 아카이브 | AGENTS.md 문서 위치 규칙의 archive 경로 |
| 프로젝트 TODO | `{project}/TODO.md` |
| 프로젝트 DONE | `{project}/docs/DONE.md` |

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **커밋**: `commit "message"` **필수** (git commit 명령어 절대 사용 금지)

## 🚨 절대 금지 명령어

```bash
# ❌ FORBIDDEN
git commit
git commit -m "..."
git commit -am "..."
git commit --amend

# ✅ REQUIRED — 아래 순서로 시도
# 1순위: bash에서 powershell.exe 경유 (bash 환경에서 가장 안정적)
powershell.exe -Command "Set-Location '{레포경로}'; & 'D:\work\project\tools\common\commit.ps1' 'message'"

# 2순위: bash에서 commit.sh (반드시 cd 먼저 — commit.sh 내부 git이 현재 디렉토리 기준)
cd "/d/work/project/service/wtools/{project}" && bash "/d/work/project/tools/common/commit.sh" "message"
```

**중요**: commit.sh 실패 시 `git commit` 직접 사용 절대 금지. powershell.exe 방식으로 전환.
