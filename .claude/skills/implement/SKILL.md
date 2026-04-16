---
name: implement
description: "구현 워크플로우 (plan→TODO→DONE). Use when: 구현해, 진행해, 시작해, implement"
---

# 구현 워크플로우

## PRE-EDIT HARD GATE
- `/implement`의 첫 액션은 구현 파일 수정이 아니라 workflow 준비다.
- 대상 파일을 건드리기 전에 plan 상태를 `구현중`으로 맞춘다.
- 같은 시점에 `TODO.md` 현재 작업 항목을 먼저 동기화한다.
- plan 상단 `> branch:`, `> worktree:`, `> worktree-owner:`가 모두 채워지기 전에는 구현 파일을 수정하지 않는다.
- 편집이 먼저 시작됐더라도 메타 누락 상태면 추가 수정 전에 plan/TODO/worktree 메타부터 복구한다.
- unrelated `main` dirty를 무시할 수는 있어도 이 gate 자체는 생략할 수 없다.

plan → TODO → DONE 흐름으로 작업을 관리합니다.

## 파일 위치

**프로젝트 경로 해석:**
```powershell
$configPath = "D:\work\project\service\wtools\.claude\projects.json"
$config = Get-Content $configPath | ConvertFrom-Json
# 각 프로젝트의 절대경로: $config.projects[].path
```

**wtools 감지**: 현재 디렉토리에 `common/tools/` 폴더 존재 여부로 판단

**경로 규칙**: CLAUDE.md `문서 위치 규칙` 테이블을 참조하라. 테이블이 없으면 기본 경로(`docs/plan/`, `docs/archive/`)를 사용. 상세: [`_path-rules.md`](../plan/_path-rules.md)

## 워크플로우

```
plan (아이디어) → TODO (선택/진행) → DONE (완료)
```

### 0. 고아 pytest 선제 정리

구현 시작 전 이전 세션 잔여 pytest를 정리한다.

Bash로 실행:
```
powershell.exe -ExecutionPolicy Bypass -File "D:\work\project\tools\monitor-page\scripts\kill-orphan-procs.ps1"
```

실패하거나 스크립트가 없으면 무시하고 계속 진행.

### 1. plan → TODO 선택

plan 문서에서 구현할 항목 선택 시:

**plan 문서 업데이트:**
```markdown
## 구현 순서 제안
1. [→TODO] P1: 캘린더 내보내기 → {project}/TODO.md   ← 선택됨 + 목적지 표시
2. [ ] P2: 지역 필터
```

**TODO.md에 추가:**
```markdown
# TODO

## In Progress

## Pending
- [ ] 캘린더 내보내기 (from: plan/2026-01-06_activity-hub#P1)
```
> `#P1`처럼 우선순위 태그를 붙여 plan 내 어떤 항목인지 역추적 가능하게 한다.

**plan 상태 및 진행률 변경:**
```markdown
> 상태: 구현중
> 진행률: 0/3 (0%)
...
*상태: 구현중 | 진행률: 0/3 (0%)*
```

### 2. TODO 작업 진행

```markdown
# TODO

## In Progress
- [ ] 캘린더 내보내기 (from: plan/2026-01-06_activity-hub)

## Pending
```

### 3. TODO → DONE 완료

**TODO.md에서 제거, docs/DONE.md 상단에 추가:**
```markdown
# DONE (최근 20개)

- [x] 2025-01-07: 캘린더 내보내기 (plan/2026-01-06_activity-hub#P1)
```

**plan 문서 업데이트 (체크 + 진행률):**
```markdown
> 상태: 구현중
> 진행률: 1/3 (33%)
...
## 구현 순서 제안
1. [x] P1: 캘린더 내보내기   ← 완료
2. [ ] P2: 지역 필터
3. [ ] P2: 알림 설정
...
*상태: 구현중 | 진행률: 1/3 (33%)*
```
> 항목 완료 시마다 헤더와 푸터의 진행률을 함께 업데이트한다.

### 4. 완료 → `/done` 스킬

구현이 끝나면 `/done` 스킬을 호출합니다. done 스킬이 아래를 모두 처리:
- TODO→DONE 이동, plan [x] 체크, plan 아카이브
- DONE.md 5개 초과 시 아카이브
- wtools/TODO.md 동기화, 완료 검증, 커밋

## 실행 단계

Claude가 구현 요청 받으면:

1. **plan 확인**
   - `_path-rules.md` 동적 폴백 로직으로 plan 루트 결정 (`Get-PlanRoot` 참조):
     - `.worktrees/plans/docs/plan/` 존재 시: 이 경로에서 plan 검색
     - 없으면: CLAUDE.md 문서 위치 규칙의 plan 경로 (기본: `docs/plan/`)
   - plan 파일에 `> **실행 TODO:**` 링크가 있으면 (분리된 대형 계획):
     각 링크 대상 `_todo-N.md`를 Read하여 미완료(`[ ]`)가 남은 첫 번째 파일을 작업 대상으로 선택
   - `> **실행 TODO:**` 링크가 없으면: plan 파일 자체 또는 기존 `_todo.md` 단일 파일에서 체크박스 읽기 (하위 호환)
   - 없으면 사용자 요청을 바로 TODO에 추가
   - **plans 워크트리 도입 프로젝트 — impl 워크트리에서의 plan 접근**:
     - impl 워크트리(`.worktrees/impl-{slug}/`)에서 plan 파일은 파일시스템 상 형제 디렉토리에 있음
     - 상대경로 `../plans/docs/plan/` 또는 절대경로 `{RepoRoot}/.worktrees/plans/docs/plan/`으로 접근
     - plan 헤더의 `> branch:`, `> worktree:` Edit 대상은 plans 워크트리 내 절대경로 사용

1.1. **부모 계획서(owner) 식별 (필수)**
   - 작업 대상이 `_todo.md` 또는 `_todo-N.md`이면 헤더의 `> 계획서:` 링크를 해석해 **부모 계획서 절대경로**를 `parent_plan_path`로 저장한다.
   - 작업 대상이 대표 plan/단일 plan이면 현재 파일 절대경로를 `parent_plan_path`로 사용한다.
   - `> 계획서:` 링크가 없거나 깨져서 부모 경로를 확정할 수 없으면 즉시 중단한다. (다른 계획서 워크트리 오사용 방지)
   - 이후 branch/worktree 생성·재개·정리는 모두 `parent_plan_path` 기준으로만 허용한다.

1.2. **워크트리 준비 (수동 세션 main 오염 방지)**

   > 이 단계는 `/implement` 수동 세션에서 워크트리를 생성하여 독립된 디렉토리+브랜치에서 작업하기 위한 것이다.
   > 모든 커밋(emergency 포함)은 impl 브랜치에 쌓이므로 main은 오염되지 않는다.
   >
   > 🔴 **파일 유형(md/py/ts/svelte 등)에 관계없이 워크트리 생성을 스킵하지 않는다.**
   > "문서만 수정", "markdown만", "코드 수정 없음" 등 어떤 사유로도 이 단계를 건너뛰지 않는다.
   > 유일한 예외: Step A의 plan-runner 환경 감지뿐이다.
   >
   > 🔴 **루트(main worktree) 브랜치 고정 규칙 (절대)**
   > 원본 프로젝트 루트의 현재 브랜치는 항상 `main`이어야 한다.
   > 루트에서 `git switch impl/*`, `git checkout impl/*`, `git switch -c impl/*`, `git checkout -b impl/*` 실행을 금지한다.
   > impl/plan 브랜치 작업은 `.worktrees/...` 경로에서만 허용한다.
   > 루트가 `main`이 아니면 자동 전환하지 말고 즉시 중단 후 사용자에게 보고한다.

   **A. plan-runner 환경 감지:**
   - 환경변수 `PLAN_RUNNER_WORKTREE_PATH`가 설정되어 있고 **AND** 해당 경로가 현재 프로젝트의 `.worktrees/` 하위인 경우에만 → 이 단계 전체 **스킵** (이미 격리됨)
     - 이 경우 루트 stash 로직도 호출하지 않는다.
   - 환경변수는 설정되어 있지만 경로가 다른 프로젝트를 가리키는 경우 → 환경변수를 무시하고 신규 worktree 생성 흐름(Step 1.2.B~D)으로 진행

   **B. 잔여 워크트리/브랜치 감지:**
   - `git worktree list`에서 `.worktrees/impl-` 패턴 스캔
   - `git branch --list "impl/*"` 스캔
   - 잔여분이 있으면 소유권을 먼저 판정한다:
     - `{plan경로}/**/*.md`에서 동일 `> branch:`/`> worktree:`를 검색
     - 검색된 파일이 가리키는 부모 계획서(`> 계획서:` 링크 또는 자기 자신)가 `parent_plan_path`와 같으면 **내 잔여분**
     - 부모가 다르면 **타 계획서 소유**로 간주하고 절대 자동 삭제/재사용하지 않는다.
   - 신규 워크트리 생성 시 이름 충돌이 있으면 타 계획서 소유일 가능성이 크므로 `{slug}-2` 같은 우회 생성 대신 즉시 중단하고 사용자에게 보고한다.

   **C. plan 헤더에서 `> branch:` 및 `> worktree:` 필드 확인:**

   - **필드가 없으면 (신규):**
     0. **메인 레포 main 브랜치 확인**: `git rev-parse --abbrev-ref HEAD` 실행
        - `main`이면 → 다음 단계로
        - `main`이 아니면 → 아래 안전 절차 실행 (기본형 `git stash pop` 금지)
          1. `$timestamp = Get-Date -Format "yyyyMMddHHmmss"`
          2. slug를 즉시 계산할 수 있으면 `$stashTag = "implement/{slug}/$timestamp"`, 아직 확정 전이면 `$stashTag = "implement/root/$timestamp"` 사용
          3. `git stash push --include-untracked -m $stashTag`
             - 실패 시 즉시 중단 (`IMPL_STASH_PUSH_FAILED`)
          4. `$stashMatches = @(git stash list | Select-String ([regex]::Escape($stashTag)))`
             - 0건 → stash 미생성, `$stashRef = $null`
             - 1건 → `$stashRef = (($stashMatches[0].Line -split ':')[0]).Trim()`
             - 2건 이상 → 즉시 중단 (`IMPL_STASH_REF_DUPLICATE`)
          5. `git checkout main`
             - 실패 시 `$stashRef`가 있으면 `git stash apply $stashRef` → 성공 시 `git stash drop $stashRef` 복구 시도 후 중단
          6. checkout 성공 후 `$stashRef`가 있으면 `git stash apply $stashRef`
             - 실패/충돌 시 즉시 중단 (`IMPL_STASH_APPLY_FAILED`)
          7. `git stash drop $stashRef`
             - 실패 시 즉시 중단 (`IMPL_STASH_DROP_FAILED`)
        - 자동 전환 후 `git rev-parse --abbrev-ref HEAD` 재확인 결과가 `main`이 아니면 중단
     1. slug를 plan 파일명에서 추출 (`YYYY-MM-DD_{slug}.md` → `{slug}`)
     2. `git worktree add .worktrees/impl-{slug} -b impl/{slug}` 실행
     2.5. **워크트리 생성 직후 lock 실행** (단일 `--force`로 실수 삭제 방지):
        ```bash
        git worktree lock .worktrees/impl-{slug} --reason "impl/{slug} 구현 진행 중"
        ```
        - lock된 워크트리는 `git worktree remove --force` 한 번으로는 삭제 불가 (`--force --force` 필요)
        - lock 실패 시 경고만 출력하고 계속 진행 (lock은 안전장치, 필수 중단 조건 아님)
        - lock 실패 경고는 stash 실패와 다르다. stash 관련 단계는 모두 hard stop이다.
     3. **워크트리 생성 후 메인 레포 브랜치 재확인**: `git rev-parse --abbrev-ref HEAD`
        - `main`이면 → 정상, 다음 단계로
        - `main`이 아니면 → 생성된 워크트리 제거 (`git worktree remove .worktrees/impl-{slug} --force`) + 사용자에게 "워크트리 생성 후 메인 레포가 main에서 벗어남. 수동 확인 필요." 경고 후 중단
     4. plan 헤더에 Edit으로 추가:
        ```
        > branch: impl/{slug}
        > worktree: .worktrees/impl-{slug}
        > worktree-owner: {parent_plan_path}
        ```

   - **필드가 있으면 (크래시 복구):**
     1. 소유권 검증:
        - `> worktree-owner:` 필드가 있으면 값이 `parent_plan_path`와 정확히 일치해야 한다.
        - 불일치하면 즉시 중단: "다른 부모 계획서 소유 워크트리이므로 사용 금지"
        - 레거시 파일처럼 `> worktree-owner:`가 없으면 `{plan경로}/**/*.md`에서 동일 `branch/worktree` 사용 파일을 검색해 부모를 역추적한다.
        - 역추적 결과 부모가 다르면 즉시 중단한다.
        - 역추적 결과가 현재 부모와 일치하면 해당 파일에 `> worktree-owner: {parent_plan_path}`를 보강 기록한다.
        - 보강 기록이 발생하면 즉시 `git status`로 변경 여부 확인 후, 변경이 있으면 해당 plan 파일을 `git add`하고 `commit "chore: worktree-owner 기록"`으로 즉시 커밋한다.
     2. 워크트리 경로가 파일시스템에 존재하는지 확인
     3. 존재하면 → 그대로 재개 (cwd를 워크트리로 설정)
     4. 존재하지 않으면 → plan에서 `> branch:` + `> worktree:` + `> worktree-owner:` 필드 제거 후 **신규 생성** 흐름으로

   **D. 이후 모든 작업의 cwd를 워크트리 경로로 설정한다.**

1.3. **main 기존 수정사항 무시 모드 (사용자 명시 지시 시)**

   사용자가 "main의 기존 수정사항을 고려하지 말라"고 명시한 경우:
   - 실행 지시문(고정): **"상관없는 main 변경 감지는 무시하고, 현재 plan 대상 레포 변경만 처리한다."**
   - 루트(main worktree)의 기존 `dirty`/`untracked` 파일은 충돌/중단 사유로 취급하지 않는다.
   - `plan-runner` git safety 감지는 **현재 plan 대상 레포 범위로만** 수행하고, 다른 레포/루트(main)의 기존 dirty는 무시한다.
   - 루트(main)의 기존 수정 파일은 읽기/수정/복구하지 않는다.
   - 구현/테스트/체크박스/커밋 판단은 현재 impl 워크트리 변경분만 기준으로 진행한다.
   - 무시 모드는 "중단 판정 완화"에만 적용되며, 판정 범위를 제외한 동작은 기존 규칙을 유지한다.
   - 단, `.git` 보호 및 파괴적 명령 금지 규칙은 그대로 적용한다.

1.5. **수동 작업 필터링 (TODO/plan 스캔 시 공통)**
   - 다음 항목은 작업 후보에서 **완전 제외**하고, 사용자에게 **언급하지 않는다**:
     - `MANUAL_TASKS.md` 파일 내 항목
     - `(→ MANUAL_TASKS)` 태그가 붙은 항목
     - 수동 작업 키워드가 포함된 항목 (`육안 확인`, `디자인 일치`, `레이아웃 미관` 등)
     - 키워드 전체 목록: [manual-tasks-format.md](../../common/docs/guide/project-management/manual-tasks-format.md) 참조
   - **수동이 아닌 것**: 스크립트 실행, 빌드 확인, T1/T2 테스트 등 CLI로 실행 가능한 것은 **제외하지 않고 직접 실행**
   - **단, T4(E2E)/T5(HTTP 통합)는 implement에서 실행/체크 금지** — `/merge-test`에서 main 머지 후 실행
   - **T3(재현/통합TC)는 implement에서 T2 직후 실행** — 서버 불필요, 워크트리에서 실행 가능
   - 후보 목록 출력 시에도 수동 항목은 표시하지 않는다

1.6. **fix: plan Phase R 존재 검증 (하드 게이트)**

   plan 파일명이 `_fix-` 또는 `_fix_`를 포함하거나 제목이 `fix:`로 시작하는 경우:
   1. plan 본문에서 `### Phase R` 또는 `재발 경로 분석` 문자열을 검색한다
   2. **미존재 시 즉시 중단**:
      ```
      ⚠️ fix: plan에 Phase R(재발 경로 분석) 섹션이 없습니다.
      /expand-todo를 실행하여 Phase R을 자동 추가하거나, 수동으로 추가하세요.
      구현 중단.
      ```
   3. 존재하면 → 정상 진행

2. **TODO.md 업데이트**
   - plan에서 선택 시: `[→TODO]` 표시, plan 상태 "구현중"
   - TODO.md의 Pending에 추가 (출처 표시)
   - 작업 시작 시 In Progress로 이동

3. **wtools/TODO.md 동기화 (wtools만 해당)**
   - **wtools 감지 조건**: 현재 디렉토리에 `common/tools/` 폴더가 있는지 확인
     - **있으면**: wtools 내부 → 아래 동기화 실행
     - **없으면**: 외부 프로젝트 → 이 단계 **스킵**
   - wtools/TODO.md 열기
   - 해당 프로젝트 섹션 찾기
   - 변경된 항목 반영 (Pending → In Progress 이동, 진행률 갱신)
   - "마지막 업데이트" 날짜를 오늘로 갱신

   ### 🔴 항목 완료 후 반드시 실행 (다음 항목 진행 전 게이트)
   1. plan 파일 Edit → `[ ]` → `[x]` 변환
   2. Read로 plan 파일 다시 읽어 `[x]`가 반영됐는지 확인
   3. 확인 완료 후에만 다음 항목으로 넘어감
   > **이 게이트를 건너뛰면 안 된다.** 체크박스 누락은 전체 워크플로우를 망가뜨린다.

   ### 🔴 T4/T5 테스트 Phase 체크박스 터치 금지
   - T4(E2E), T5(HTTP 통합) Phase의 체크박스는 **implement에서 절대 `[x]`로 변경하지 않는다**
   - T4/T5 실행 및 체크는 `/merge-test` 스킬이 전담한다
   - "단위 TC로 커버됨", "수동 테스트", "실제 환경 필요" 등의 사유로 스킵 체크하는 것도 금지
   - T1(TC 작성), T2(TC 검증)는 implement에서 직접 실행하고 체크한다
   - **T3(재현/통합TC)는 implement에서 T2 직후 실행하고 체크한다** — fix: plan이면 필수

3.5. **T3 실행 (재현/통합 TC)**
   - plan에 T3 Phase 체크박스가 있으면 T2 직후 실행
   - 워크트리에서 `pytest {T3 테스트 경로} -v` 실행
   - 통과 시 T3 체크박스 `[x]`로 업데이트
   - 실패 시 코드 수정 → 재실행 → 통과까지 반복

4. **구현** (@implementing-features 스킬 사용)
   - **🔴 모든 구현 작업은 워크트리 디렉토리 내에서 수행한다** — Bash 명령의 cwd, Read/Edit/Write의 파일 경로 모두 워크트리 기준. 워크트리가 없는 경우(plan-runner 환경, 워크트리 미생성)에만 원본 디렉토리 사용.
   - 유사 컴포넌트 참조 (같은 디렉토리/모듈 내 유사 파일의 기능 목록 확인)
   - **반복 패턴 가이드 준수** (아래 "반복 패턴 체크" 참조)
   - 테스트 작성 (RIGHT-BICEP)
   - 코드 작성
   - **테스트 파일 네이밍 규칙**: `_e2e` 접미사는 실서버(localhost) 또는 실브라우저(Playwright) 필요 테스트에만 사용. mock/AsyncMock 기반 테스트는 `_integration` 또는 도메인명만 사용 (예: `test_coupang_monitor_integration.py`)
   - **DB 마이그레이션 SQL 파일을 생성한 경우 → 즉시 실행** (커밋 전 필수, 실행 안 하면 API 장애)
   - 기존 테스트 통과 확인
   - **⚠️ 빌드 확인 (webapp-testing 스킬)은 워크트리에서 실행 금지** — 반드시 `/merge-test`에서 main 머지 후 실행

5. **완료 처리**
   - 기본: `/merge-test` 스킬 호출 — 워크트리 머지 + T4/T5 통합테스트 + 완료 처리(archive, TODO→DONE, 커밋)까지 일괄 실행
   - `_todo-N.md` 작업이고 같은 `parent_plan_path`의 다른 `_todo-*`가 이미 구현완료(머지 대기) 상태면 `/merge-test`를 **부모 묶음 배치 모드**로 1회 실행해 같은 부모의 워크트리를 한 번에 정리한다.
   - 워크트리 미사용 시에도 `/merge-test` 호출 (머지 스킵하고 done 처리만 실행)

## plan 문서 상태 & 진행률

| 상태 | 의미 |
|------|------|
| `초안` | /plan 스킬로 최초 작성됨 |
| `검토대기` | 검토 요청 상태 |
| `검토완료` | auto-plan 보완 완료 |
| `구현중` | 구현 착수됨 |
| `검증중` | 구현 결과 검증 단계 (auto-verify) |
| `테스트중` | 테스트 실행 단계 |
| `머지대기` | verify/test 통과 후 머지 대기 |
| `통합테스트중` | /merge-test: main 머지 후 T4/T5 실행 중 |
| `구현완료` | 모든 항목 완료 (/merge-test 이후 또는 직접 구현 완료) |
| `수정필요` | 검토 후 변경 필요 |
| `보류` | 우선순위 밀림 |
| `완료` | /done으로 archive 처리됨 |

**상태 명명 규칙:** legacy alias(`계획중`, `검토필요`)는 사용 금지. 각각 `초안`, `검토대기`만 사용한다.

**진행률 계산:** `[x]` 개수 / 전체 체크박스 개수 → 헤더·푸터 동시 업데이트

## 커밋 규칙

plan, TODO.md, DONE.md 변경도 함께 커밋:
```powershell
commit "feat: 기능 구현"
```
plans 워크트리가 있으면 `Resolve-DocsCommitRoot` 기준 cwd로 이동하고, `Resolve-DocsCommitCandidates` 반환 파일만 `git add`한다. `git add -A`는 사용하지 않는다.

**워크트리 내에서 커밋 시**: commit.sh의 cwd를 워크트리 경로로 설정해야 한다.
```bash
cd "{worktree_path}" && bash "/d/work/project/tools/common/commit.sh" "feat: ..."
```
> 워크트리 경로에서 커밋해야 impl/{slug} 브랜치에 커밋된다. 원본 디렉토리에서 커밋하면 main에 쌓인다.

## 반복 패턴 체크

> 상세: @recurring-patterns 스킬 참조

구현 중 아래 상황이 발생하면 해당 패턴을 반드시 따른다:

### 프론트엔드

| 상황 | 패턴 | 금지 |
|------|------|------|
| 체크박스 선택 + 벌크 액션 | `createSelection()` 유틸 사용 | Array 기반 선택 코드 |
| 사용자 알림/피드백 | `toast.success/error/warning()` | `alert()`, `confirm()` |
| POST/DELETE 성공 후 목록 갱신 | 로컬 상태 직접 갱신 | `await loadItems()` 전체 재요청 |
| 인증 에러 (401) 처리 | 토스트 + 쿨다운 가드 | `window.location.reload()` |

### 백엔드 (monitor-page)

| 상황 | 패턴 | 금지 |
|------|------|------|
| 5초+ 소요 작업 API | 202 반환 + Redis 큐 + 폴링 엔드포인트 | 동기 응답으로 블로킹 |
| Session 0에서 subprocess 필요 | Redis 큐로 유저 세션 워커에 위임 | API에서 직접 subprocess |
| 워커 내 개별 작업 | `_safe_execute()` 예외 격리 | 예외 전파로 워커 사망 |

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
