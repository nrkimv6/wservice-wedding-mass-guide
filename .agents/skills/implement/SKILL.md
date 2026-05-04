---
name: implement
description: "구현 워크플로우 (plan→TODO→DONE). Use when: 구현해, 진행해, 시작해, implement"
---


> Routing gate: branch/worktree present -> /merge-test; absent -> /done
# 구현 워크플로우

> **본문 분리 원칙**: 호출 컨텍스트가 다르면 본문도 다르다. 공유 레시피는 [`_recipes.md`](./_recipes.md)로만.
> **호출 컨텍스트**: 독립 워커(Codex/plan-runner). 결과는 plan 파일 체크박스 갱신 + artifact 출력 기준으로 구조화.

## Skill Path Precedence
- 사용자가 `[$implement](...SKILL.md)` 또는 파일시스템 경로로 local/project skill 파일을 명시한 경우, 반드시 그 exact file을 Read 기준으로 삼는다.
- 같은 name의 global/duplicate skill(`C:\Users\Narang\.codex\skills\implement\SKILL.md` 등)은 대체 사용하지 않는다.
- 명시 경로가 없거나 읽기 실패한 경우에만 fallback 후보를 검토하며, fallback 사용 전에는 실제로 읽을 경로와 이유를 사용자에게 먼저 보고한다.
- 예: 입력이 `D:\work\project\tools\monitor-page\.agents\skills\implement\SKILL.md`이면 `C:\Users\Narang\.codex\skills\implement\SKILL.md`를 읽지 않는다.

## PRE-EDIT HARD GATE
- `/implement`의 첫 액션은 구현 파일 수정이 아니라 workflow 준비다.
- 대상 파일을 건드리기 전에 plan 상태를 `구현중`으로 맞춘다.
- 같은 시점에 `TODO.md` 현재 작업 항목을 먼저 동기화한다.
- plan 상단 `> branch:`, `> worktree:`, `> worktree-owner:`가 모두 채워지기 전에는 구현 파일을 수정하지 않는다.
- 편집이 먼저 시작됐더라도 메타 누락 상태면 추가 수정 전에 plan/TODO/worktree 메타부터 복구한다.
- SSOT 위치와 edit 허용 위치를 혼동하지 않는다. `.agents/skills/`, `.claude/skills/`, `.worktrees/plans/docs/*`가 canonical 원본이어도 현재 impl worktree 밖이면 직접 수정 금지다.
- unrelated `main` dirty를 무시할 수는 있어도 이 gate 자체는 생략할 수 없다.

## PRE-WRITE SCOPE GATE
- leaf 체크박스의 backtick 경로를 절대경로로 해석했을 때, 수정 대상은 현재 `> worktree:` 루트 하위여야 한다.
- 같은 repo의 root/main 경로로 떨어지면 `root_dirty_only`로 판정하고 direct edit 대신 현재 impl worktree 대응 경로로 옮겨서 계속한다.
- plans lineage, sibling repo, 다른 canonical surface처럼 현재 worktree 밖 경로면 `reroute_required`로 판정하고 soft-stop 후 대상 repo/worktree에서 이어간다.
- canonical SSOT 경로라는 이유만으로 direct edit 허용으로 승격하지 않는다.

## Git Guard Session Gate
- wtools에서 `/implement`를 실행할 때 첫 git mutation 전 `common\tools\enable-git-guard.ps1 -Action enable-session`을 실행한다.
- 이어서 `common\tools\enable-git-guard.ps1 -Action status`로 현재 세션 PATH가 `common\tools`를 앞세우고 `git`이 `common\tools\git.cmd`를 해석하는지 확인한다.
- guard entrypoint가 없거나 session 활성화/상태 확인이 실패하면 `GIT_GUARD_NOT_ACTIVE`로 중단한다. linked worktree에서 `git checkout main`/`git switch main`이 가능한 상태로 계속 진행하면 안 된다.
- `.agents`와 `.claude`는 문구를 맞추는 대상이 아니지만, 이 guard 불변조건은 두 엔진 표면에서 동등해야 한다.

## 세션 targets / continue 계약 (필수)

- 사용자가 같은 세션에 plan 경로를 2개 이상 명시하면, 그 목록은 **session targets**로 고정한다.
- 사용자가 명시한 경로가 대표 plan(`*_todo-N.md` 아님)이고 `> **실행 TODO:**` 링크 또는 sibling `_todo-*.md`가 있으면, 미완료 `_todo` 전부를 **session targets**에 자동 추가한다.
  - 출력은 `대표 plan`, `discovered _todo`, `session targets 추가`, `남은 target N개` 형식으로 남긴다.
  - 현재 작업 대상은 첫 번째 실행 가능한 `_todo` 1개뿐이며, 나머지는 **remaining targets**로 유지한다.
  - `_todo`가 남아 있는 동안 `대표 plan 전체 완료`, `session 종료` 표현을 금지한다.
- 현재 target의 구현이 끝났더라도 **remaining targets**가 있으면 전체 완료로 말하지 않는다.
  - 출력은 `현재 target 완료, 남은 target N개` 형태로 남기고, 다음 target으로 **같은 턴에서 계속** 진행한다.
- explicit continue 재지시가 없어도 **current target에 실행 가능한 leaf가 남아 있으면 같은 턴에서 계속 진행**한다.
- `leaf 몇 개 완료`, `Phase 일부 완료`, `현재 target 일부 완료`는 종료 사유가 아니다.
- 사용자가 `계속`, `멈추지마`, `끝날 때까지` 등으로 재지시한 경우:
  - 중간 성공(leaf 몇 개 완료, T1/T2 통과)은 종료점이 아니라 **진행 업데이트**다.
  - owner chain의 다음 단계(`/merge-test`, `/done` 등)가 deterministic하게 남아 있으면 설명으로 멈추지 말고 **같은 턴에서 계속 실행**한다.
  - 실제 중단은 hard blocker(충돌/필수 게이트 실패 등)에서만 허용한다.

## 실행 대상 계약 (leaf-only, 필수)

- 실행 대상은 **자식 없는 미완료 체크박스(leaf)** 만 허용한다.
- 부모 체크박스는 **직접 실행/직접 체크 금지**다. 자식이 모두 끝난 뒤 자동 승격만 허용한다.
- 각 leaf 완료 후에는 plan을 다시 파싱해 다음 실행 가능한 leaf를 고른다.
- current target에 남은 executable leaf가 있으면 다음 leaf를 같은 턴에서 바로 선택한다. current target을 비우기 전에는 다음 target 또는 다음 owner step으로 넘어가지 않는다.
- 종료/closeout 직전에는 반드시 `remaining executable leaf`, `remaining targets`, `split _todo-* 미완료`, `next owner step`, `remote evidence`를 다시 계산한다.
  - 셋 이상 중 하나라도 남아 있으면 `구현완료`, `전체 완료`, `마무리` 표현을 금지하고 진행 업데이트 후 계속 실행하거나 hard blocker를 보고한다.
  - 대표 plan와 split `_todo-N` plan은 parent/child 완료 판정을 분리해 read-back한다.
  - leaf 본문에 `push`, `origin/main`, `remote`, 외부 repo 목록이 있으면 local commit만으로 체크하지 않고 `git ls-remote origin main`, `git show origin/main:<path>`, 또는 대상 repo의 `origin/main` content read-back evidence를 요구한다.
  - remote evidence가 없으면 해당 leaf를 `[x]`로 올리지 않고 `remote evidence 대기`로 남긴다.

plan → TODO → DONE 흐름으로 작업을 관리합니다.

## 파일 위치

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

**경로 규칙**: AGENTS.md `문서 위치 규칙` 테이블을 참조하라. 테이블이 없으면 기본 경로(`docs/plan/`, `docs/archive/`)를 사용. 상세: [`_path-rules.md`](../plan/_path-rules.md)

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

### 4. 완료 후 owner 선택

구현이 끝나면 plan 헤더의 worktree metadata로 다음 owner를 선택합니다.
- `> branch:` 또는 `> worktree:`가 있으면 `/merge-test`를 호출한다. `/done`은 이 상태를 차단한다.
- 두 필드가 모두 없으면 `/done`을 직접 호출한다.

수동 안내 템플릿:
```text
Detected: branch={branch|none}, worktree={worktree|none}
Decision: /merge-test | /done
Gate: branch/worktree present -> /merge-test; absent -> /done
```

`/done` owner는 TODO→DONE 이동, plan 체크, archive, DONE.md 정리, wtools/TODO.md 동기화, 완료 검증, 커밋을 처리합니다.

## 실행 단계

Codex가 구현 요청 받으면:

### Phase A: 사용자 입력 확인

**-1. 탐색성/상담성 입력은 구현 요청이 아니다.**

아래 입력은 구현 승인으로 간주하지 않는다:
- "있을까?", "가능할까?", "추천해줘", "어떻게 할까?", "좋겠어"
- "가능 여부", "현황 확인", "이런 방향 어때?", "이렇게 하면 좋겠어"

이 경우 `/implement`를 시작하지 않는다. 상세 검토, 후보 정리, 계획 확장, 반례 점검까지는 가능하지만 코드/문서 수정, DB/프로세스 변경, `git add`/`git stash`/`git worktree`/커밋 같은 git mutation은 금지한다.
응답은 현재 상태 요약, 가능한 선택지, 실행 시 필요한 명시 승인 문장까지로 제한한다.

구현 요청으로 볼 수 있는 입력:
- "구현해", "진행해", "고쳐", "수정해", "적용해", "지금 붙여"
- "가능하면 바로 고쳐", "문제 맞으면 수정해", "검토 후 적용해"처럼 같은 발화에 조건부 실행 의도가 포함된 경우

단, 실행 의도가 있어도 이후 worktree/precondition gate는 그대로 통과해야 한다. "조사해줘" 계열은 AGENTS.md의 조사 read-only gate가 우선한다.

**0. 사용자가 구현할 항목을 명시했는가?**

구현 요청의 형태에 따라 task selection 단계를 결정한다:
- **명시적 입력**: "구현해 Phase 1", "fix: 섹션 A", "test_foo.py 수정" 등 → 해당 항목으로 직진. 단, **대표 plan 경로 입력은 아래 0.5 enumeration gate를 먼저 수행**한다.
- **일반 입력**: "구현해", "다음 작업" 등 → **Step 1로 진행** (plan 확인 필수)

**0.5. explicit 대표 plan _todo enumeration gate**
   - 사용자가 대표 plan 경로를 직접 넘겼고 `_todo` 분리 plan이면, `> **실행 TODO:**` 링크 또는 sibling `_todo-*.md`를 즉시 enumerate한다.
   - 입력 경로 fallback: review-plan/SKILL.md의 "입력 경로 fallback (키워드 기반)" 섹션과 동일한 절차를 적용한다.
   - archive/`완료` 상태가 아닌 `_todo`는 전부 session targets에 추가한다.
   - 첫 번째 실행 가능한 `_todo`만 현재 작업 대상으로 잡고, 나머지는 remaining targets로 유지한다.
   - enumeration 결과 없이 대표 plan을 단일 target처럼 처리하거나, child 1개 완료 후 대표 plan 전체 완료로 말하면 안 된다.

### Phase B: 선택적 plan 스캔 (사용자 미명시 시)

**1. plan 확인** (선택적 — 사용자가 항목을 명시하지 않은 경우에만 필수)
   - AGENTS.md 문서 위치 규칙의 plan 경로에서 관련 계획 확인
   - plan 파일에 `> **실행 TODO:**` 링크가 있으면 (분리된 대형 계획):
     각 링크 대상 `_todo-N.md`를 Read하여 미완료(`[ ]`)가 남은 첫 번째 파일을 **현재 작업 대상**으로 선택하고, 나머지는 remaining targets로 유지
   - `> **실행 TODO:**` 링크가 없으면: plan 파일 자체 또는 기존 `_todo.md` 단일 파일에서 체크박스 읽기 (하위 호환)
   - 없으면 사용자 요청을 바로 TODO에 추가
   - **plans 워크트리 도입 프로젝트 — impl 워크트리에서의 plan 접근**:
     - impl 워크트리(`.worktrees/impl-{slug}/`)에서 plan 파일은 파일시스템 상 형제 디렉토리에 있음
     - 상대경로 `../plans/docs/plan/` 또는 절대경로 `{RepoRoot}/.worktrees/plans/docs/plan/`으로 접근
     - plan 헤더의 `> branch:`, `> worktree:` Edit 대상은 plans 워크트리 내 절대경로 사용

### Phase C: 필수 메타 준비 (모든 경우)

**1.1. 부모 계획서(owner) 식별 (필수)**
   - 작업 대상이 `_todo.md` 또는 `_todo-N.md`이면 헤더의 `> 계획서:` 링크를 해석해 **부모 계획서 절대경로**를 `parent_plan_path`로 저장한다.
   - 작업 대상이 대표 plan/단일 plan이면 현재 파일 절대경로를 `parent_plan_path`로 사용한다.
   - `> 계획서:` 링크가 없거나 깨져서 부모 경로를 확정할 수 없으면 즉시 중단한다. (다른 계획서 워크트리 오사용 방지)
   - 이후 branch/worktree 생성·재개·정리는 모두 `parent_plan_path` 기준으로만 허용한다.
   - `parent_plan_path`는 **owner set의 primary owner**(첫 항목)다. 단일 plan 작업 시 owner set = `[parent_plan_path]` (길이 1). attach 모드에서는 owner set 길이가 2 이상이 된다.

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
   - **자동 컨텍스트 attach 차단 (D6)**: `PLAN_RUNNER_WORKTREE_PATH` 세팅 상태이면서 대상 plan 헤더 `> worktree-owner:` 값이 쉼표를 포함하거나(owner set 길이 ≥ 2) → `ATTACH_IN_AUTOMATED_CONTEXT_REJECTED` 에러 로그 후 즉시 중단. attach 모드는 수동 세션 전용이다.

   **B~E 분기 요약표** — 상세 절차/PowerShell 의사코드는 [`_recipes.md`](./_recipes.md) 참조:

   | 분기 | 트리거 조건 | 동작 요약 | 실패 시 |
   |------|------------|---------|--------|
   | **B** 잔여 감지 | `git worktree list` 결과 잔여 존재 | 소유권 판정 → 내 잔여면 재개 후보, 타 소유면 무시 | 3후보 충돌 → `"현재 plan worktree 확보 실패"` 후 중단 |
   | **C** 신규 생성 | `> branch:` 비어 있음 | main 확인 → (필요 시 stash) → `git worktree add` → lock → 헤더 기록 | `IMPL_STASH_PUSH_FAILED` / `IMPL_STASH_APPLY_FAILED` / `IMPL_STASH_DROP_FAILED` → 즉시 중단 |
   | **C** 크래시 복구 | `> branch:` 채워져 있음 | 소유권 검증 → 경로 존재 확인 → 재개 또는 신규 생성 흐름으로 | 소유권 불일치 → 즉시 중단 |
   | **D** cwd 설정 | 항상 | 이후 모든 작업 cwd를 워크트리 경로로 설정 | — |
   | **E** attach 모드 | 사용자가 "attach"+"대상 경로" 명시 | primary plan branch/worktree 복사 → 헤더 동기화 → owner append → commit | primary plan 미발견 → 중단 |

1.2.1. **Phase 0 / Phase Z owner 규칙**

   - plan에 `### Phase 0: Worktree 준비`가 있으면, 이 phase는 **임의 git 작업 지시**가 아니라 위 1.2 단계에서 생성/재개한 worktree 상태를 문서에 고정하는 gate로 해석한다.
   - `Phase 0` 체크박스는 `> branch:`, `> worktree:`, `> worktree-owner:`가 채워진 뒤에만 완료할 수 있다.
   - 이미 현재 세션이 worktree 안에 있으면, 같은 plan에 대해 두 번째 worktree를 만들려고 하지 않는다.
   - plan에 `### Phase Z: Post-Merge Cleanup (/merge-test owner)`가 있으면, 이 phase는 `/implement`가 아니라 `/merge-test` 소유다.
   - `/implement`는 `Phase Z` 체크박스를 완료 처리하지 않으며, 해당 phase는 구현 완료 판정과 auto-impl 재진입 판단에서 제외되는 것으로 해석한다.

1.3. **main 기존 수정사항 무시 모드 (사용자 명시 지시 시)**

   사용자가 "main의 기존 수정사항을 고려하지 말라"고 명시한 경우:
   - 실행 지시문(고정): **"상관없는 main 변경 감지는 무시하고, 현재 plan 대상 레포 변경만 처리한다."**
   - 루트(main worktree)의 기존 `dirty`/`untracked` 파일은 충돌/중단 사유로 취급하지 않는다.
   - `plan-runner` git safety 감지는 **현재 plan 대상 레포 범위로만** 수행하고, 다른 레포/루트(main)의 기존 dirty는 무시한다.
   - 루트(main)의 기존 수정 파일은 읽기/수정/복구하지 않는다.
   - 구현/테스트/체크박스/커밋 판단은 현재 impl 워크트리 변경분만 기준으로 진행한다.
   - 무시 모드는 "중단 판정 완화"에만 적용되며, 판정 범위를 제외한 동작은 기존 규칙을 유지한다.
   - 단, `.git` 보호 및 파괴적 명령 금지 규칙은 그대로 적용한다.

1.4. **fix: plan 하드 게이트 (Phase R 필수)**

   - plan 파일명에 `_fix-`가 있거나 헤더 제목이 `fix:`로 시작하면 **fix: plan**으로 판정한다.
   - fix: plan이면 `plan/todo` 본문에서 `### Phase R` 또는 `재발 경로 분석` 문자열이 존재해야 한다.
   - 미존재 시 즉시 중단한다:
     - 메시지: `fix: plan이므로 Phase R(재발 경로 분석) 없이는 구현을 시작할 수 없습니다.`

1.5. **수동 작업 필터링 (TODO/plan 스캔 시 공통) — 필수**

   `MANUAL_TASKS.md` 항목 / `(→ MANUAL_TASKS)` 태그 / 수동 키워드 매칭은 작업 후보에서 **완전 제외**하고 사용자에게도 노출하지 않는다.
   - 키워드 예시: `육안 확인`, `디자인 일치`, `레이아웃 미관` — 전체 목록: [manual-tasks-format.md](../../common/docs/guide/project-management/manual-tasks-format.md) 및 [`_recipes.md`](./_recipes.md) 참조
   - CLI 실행 가능한 것(스크립트 실행, T1/T2/T3 테스트)은 제외하지 않고 직접 실행
   - `frontend verify` 해당 시 `merge-test` 전용 intent로 보고 즉시 중단
   - **T4(E2E)/T5(HTTP 통합)는 implement에서 실행/체크 금지** — `/merge-test`에서 main 머지 후 실행
   - **T3(재현/통합TC)는 implement에서 T2 직후 실행** — fix: plan이면 필수

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
   - **T4/T5 실행 금지 조건 3축**: (1) **pre-merge** — impl 워크트리 구현 단계 (아직 main 머지 전), (2) **non-root-worktree** — `.worktrees/*` 경로 (원본 main worktree 아님), (3) **non-main** — impl/* 브랜치 (main 브랜치 아님)
   - 3축 중 하나라도 해당하면 T4/T5 금지. **post-merge + root-worktree + main** 세 조건이 모두 충족될 때만 `/merge-test`에서 실행 가능.
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
   - **테스트 파일 네이밍 가드**: `_e2e` 접미사는 실서버/Playwright 필요 테스트에만 사용. mock/AsyncMock 기반이면 `_integration` 또는 도메인명 접미사를 사용한다.
   - 코드 작성
   - **DB 마이그레이션 SQL 파일을 생성한 경우 → 즉시 실행** (커밋 전 필수, 실행 안 하면 API 장애)
   - **plan 또는 `_todo`에 `Phase DB-Direct`가 있으면 running DB 직접 실행은 아직 미완료로 남긴다** — worktree 단계에서는 `DB-direct 미실행`, `live 검증 미실행`, `직접 실행 대기` 상태를 유지하고 `/merge-test` owner step으로 넘긴다.
   - 기존 테스트 통과 확인
   - **⚠️ frontend verify (webapp-testing / `npm run build` / `npm run check` / `npm run check:watch` / `svelte-kit sync` / `svelte-check` / `vite build` / `node ... svelte-kit.js sync`)는 워크트리에서 실행 금지** — 반드시 `/merge-test`에서 main 머지 후 실행
   - `_build_worktree.ps1` 같은 helper 예외는 setup 전용이며, implement 중 임의 probe의 근거로 쓰면 안 된다.

5. **완료 처리**
   - plan 또는 `_todo`에 `Phase DB-Direct`가 있으면 종료 안내에 아래 잔여 항목을 반드시 남긴다: `main 머지 후 running DB 직접 실행 필요`, `실행 SQL/명령`, `존재 확인 쿼리`, `live API 또는 runtime 결과`
   - 위 잔여 항목이 남아 있는 상태를 `구현완료`, `마무리`, `닫힘`으로 표현하지 않는다. 이 상태는 `DB-direct 미실행`, `live 검증 미실행`, `직접 실행 대기`로만 보고한다.
   - 기본: 구현 체크박스를 마치고 plan 상태를 `머지대기`로 올린 뒤 `/merge-test` 스킬 호출 — 워크트리 머지 + T4/T5 통합테스트 + 완료 처리(archive, TODO→DONE, 커밋)까지 일괄 실행
   - `_todo-N.md` 작업이고 같은 `parent_plan_path`의 다른 `_todo-*`가 이미 `머지대기` 상태면 `/merge-test`를 **부모 묶음 배치 모드**로 1회 실행해 같은 부모의 워크트리를 한 번에 정리한다.
   - `/merge-test`가 `수정필요`로 종료되면 현재 iteration은 실패로 버려지는 것이 아니라 **다음 iteration continuation anchor를 남긴 상태**로 종료된 것으로 본다.
   - 다음 iteration 입력은 최소 `충돌 파일 목록 또는 stash ref`, `merge-test failure reason`, `현재 parent_plan_path` 세 가지를 포함해야 한다.
   - 다음 iteration은 `수정필요 -> 구현중`으로 상태를 되돌린 뒤, 위 입력을 기준으로 수정 -> 재검증 -> `/merge-test` 재시도 순서로 진행한다.
   - 수동 안내에는 아래 3줄을 포함한다:
     ```text
     Detected: branch={branch|none}, worktree={worktree|none}
     Decision: /merge-test | /done
     Gate: branch/worktree present -> /merge-test; absent -> /done
     ```
   - 워크트리 미사용 시에는 `/merge-test`를 건너뛰고 `/done`을 직접 호출한다. 이 분기는 `/done`의 branch/worktree 차단 게이트와 같은 계약이다.

## plan 문서 상태 & 진행률

상세 상태 정의: [plan SKILL.md](../plan/SKILL.md)의 `## 문서 상태 & 진행률` 섹션 참조.

implement 고유 핵심 상태:

| 상태 | implement 의미 |
|------|---------------|
| `초안` | /plan 스킬로 최초 작성됨 |
| `구현중` | 워크트리 준비 + 구현 착수됨 |
| `머지대기` | /implement 완료, `/merge-test` 대기. `Phase DB-Direct`가 있으면 `DB-direct 미실행` 상태 포함 |
| `구현완료` | 모든 항목 완료. `Phase DB-Direct` plan은 running DB 직접 실행 + evidence 3종 확보 후 |
| `수정필요` | `/merge-test` 실패 후 다음 iteration 입력 대기 (continuation anchor) |
| `완료` | /done으로 archive 처리됨 |

**진행률 계산:** `[x]` 개수 / 전체 체크박스 개수 → 헤더·푸터 동시 업데이트

## 커밋 규칙

plan, TODO.md, DONE.md 변경도 함께 커밋:
```powershell
commit "feat: 기능 구현"
```
plans 워크트리가 있으면 `Resolve-DocsCommitRoot` 기준 cwd로 이동하고, `Resolve-DocsCommitCandidates` 반환 파일만 `git add`한다. `git add -A`는 사용하지 않는다.
wtools 공통 plan도 `Resolve-DocsCommitRoot`/`Resolve-DocsCommitCandidates` helper를 따른다. `.worktrees/plans/docs/plan/`을 canonical 경로로 커밋한다.

**워크트리 내에서 커밋 시**: commit.sh의 cwd를 워크트리 경로로 설정해야 한다.
```bash
cd "{worktree_path}" && bash "/d/work/project/tools/common/commit.sh" "feat: ..."
```
> 워크트리 경로에서 커밋해야 impl/{slug} 브랜치에 커밋된다. 원본 디렉토리에서 커밋하면 main에 쌓인다.

## 반복 패턴 체크

> 상세 표: @recurring-patterns 스킬 / [`_recipes.md`](./_recipes.md)의 "반복 패턴 체크" 섹션 참조

구현 중 아래 상황에서는 recurring-patterns 스킬이 지정한 패턴을 반드시 사용한다:
- 체크박스 선택 + 벌크 액션 → `createSelection()` 유틸 (Array 기반 직접 선언 금지)
- 사용자 알림 → `toast.success/error/warning()` (`alert()`/`confirm()` 금지)
- POST/DELETE 성공 후 목록 갱신 → 로컬 상태 직접 갱신 (`loadItems()` 전체 재요청 금지)
- 5초+ 소요 작업 API → 202 반환 + Redis 큐 + 폴링 엔드포인트

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용

