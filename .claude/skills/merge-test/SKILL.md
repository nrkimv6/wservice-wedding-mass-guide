---
name: merge-test
description: "워크트리 브랜치를 main에 머지하고 T4/T5 통합테스트를 실행 + 완료처리까지 일괄 실행. /implement 완료 후 호출."
triggers: ["머지 테스트", "merge-test", "머지후테스트", "통합테스트", "merge test"]
---

# 머지 후 통합테스트 게이트

> **본문 분리 원칙**: 호출 컨텍스트가 다르면 본문도 다르다. 공유 레시피는 [`_recipes.md`](./_recipes.md)로만.

`/implement`로 worktree에서 구현 완료 후, main에 머지하고 T4/T5 통합테스트를 실행하고 완료처리(archive + 문서정리 + 커밋)까지 일괄 실행합니다.

## 워크플로우 위치

```
/implement (worktree 구현 + T1/T2 단위테스트 + T3 재현/통합TC)
  → /merge-test  ← 지금 여기 (머지 + T4/T5 + done 일괄 실행)
```

## Execute-Or-Abort Contract

- 사용자가 `/merge-test`를 명시 호출한 경우 이 스킬은 두 결과만 허용한다:
  1. `precondition 통과 -> merge 실행 -> T4/T5 -> done`
  2. `precondition 실패 -> 실패 이유를 보고하고 즉시 중단`
- `merge-test 완료`는 아래 3조건이 모두 충족된 경우에만 선언한다:
  1. 실제 `git merge`가 실행되어 대상 branch가 main에 반영됨
  2. plan에 존재하는 T4/T5가 계약에 맞게 실행됨
  3. `/done` 후처리(archive/문서정리/커밋)가 완료됨
- 첫 응답은 아래 3항목 형식을 따른다:
  1. `precondition 검증 결과`: 통과/실패 + 이유
  2. `merge target`: branch/worktree/parent plan 정보
  3. `next action`: `merge` 또는 `abort`
- `next action`은 `merge` 또는 `abort`만 허용한다. 추가 탐색, 상태 설명만 제공, 인접 스킬 단독 실행으로 대체하지 않는다.
- **금지된 대체 행동**:
  - precondition 판정 전에 unrelated 테스트, 로그 탐색, 커밋 히스토리 분석으로 턴을 소비하는 행동
  - 머지 없이 파일 탐색/상태 설명만 반복하는 행동
  - `done` 또는 `reflect`를 단독 수행해 `merge-test`를 우회하는 행동
  - `git status`, branch list, 테스트 파일 목록 등 상태 요약만 반복하고 `merge` 또는 `abort`로 진행하지 않는 행동

`frontend verify(sync/check/build)`는 `/merge-test`가 sole owner다. implement는 코드 수정과 워크트리 단위 검증까지만 담당하고, 프론트엔드 verify 계열은 main 머지 후 여기서만 실행한다.
`/merge-test`는 "모든 마무리" owner가 아니라, **실제 merge 결과·merged main tree·main 서비스 상태**를 입력으로 쓰는 단계만 owner다. 실제 merge, restart-api/restart, frontend verify, live T4/T5, Phase Z cleanup이 여기에 포함된다.
bounded `safe-doc semantic merge`도 `/merge-test` owner action이지만, 허용 범위는 `TODO.md`/Markdown/Text docs-only conflict + dirty-preserve 조건 충족 케이스로 제한한다. mixed/code conflict는 여전히 abort다.

**T4/T5 실행 허용 조건 3축 (3가지 모두 충족해야 실행 가능):**
1. **post-merge** — main에 머지 완료 이후
2. **root-worktree** — 원본 main worktree (`.worktrees/*` 경로 제외)
3. **main 브랜치** — `main` 브랜치 체크아웃 상태

3축 중 하나라도 미충족이면 T4/T5 실행 금지. 이 조건은 스킬 실행 시작 시점에 확인하며, 조건 미충족 시 T4/T5 없이 종료하거나 조건 충족 후 재시도를 안내한다.

## 세션 targets / continue 계약 (필수)

- 사용자가 같은 세션에 plan 경로를 2개 이상 명시하면, 그 목록은 **session targets**로 고정한다.
- 현재 target을 머지/테스트/완료처리 했더라도 **remaining targets**가 있으면 전체 완료로 말하지 않는다.
  - 출력은 `현재 target 완료, 남은 target N개` 형태로 남기고, 다음 target 처리로 **같은 턴에서 계속** 진행한다.
- 사용자가 `계속`, `멈추지마`, `끝날 때까지` 등으로 재지시한 경우:
  - 중간 성공(머지 성공, T4/T5 통과, done 단계 완료)은 종료점이 아니라 **진행 업데이트**다.
  - 실제 중단은 merge conflict, stash 실패, T4/T5 실패 같은 hard blocker에서만 허용한다.

## 전제 조건 확인

실행 전 다음 조건을 모두 확인한다:

| # | 조건 | 실패 동작 |
|---|------|----------|
| 1 | plan 헤더에 `> branch:` 존재 | 없으면 → `/done` 직접 호출 |
| 2 | plan 상태 `머지대기` | `구현중`(legacy)이면 경고+계속, 그 외 중단 |
| 3 | 모든 구현 체크박스 `[x]` (T4/T5 제외) | 미완료 있으면 경고 후 계속 여부 확인 |
| 4 | 루트 브랜치 `main` | 아니면 0단계 자동 전환 (실패 시 중단) |
| 5 | worktree-owner 일치 | 불일치 시 중단 |
| 6 | owner set 전원 `머지대기` 이상 | `OWNER_SET_NOT_READY` 중단 |
| 7 | attached owner면 primary가 `구현완료` 이상 | `PRIMARY_MUST_MERGE_FIRST` 중단 |

### precondition failure 처리 규칙

- **Hard stop (질문 없이 즉시 중단)**:
  - `> branch:` 또는 `> worktree:`가 없어 merge target을 확정할 수 없음
  - `worktree-owner`가 현재 parent plan과 불일치함
  - `OWNER_SET_NOT_READY`, `PRIMARY_MUST_MERGE_FIRST`, `TODO_COMPLETENESS_NOT_READY` 같은 소유권/선행조건 오류
  - merge 대상 branch 또는 worktree를 찾을 수 없거나 더 이상 merge할 target이 없음
- **경고 + 확인 후 계속 가능**:
  - legacy 상태 `구현중`
  - T4/T5 외 미완료 체크박스 잔존
  - service_lock 같은 경고형 preflight
- hard stop 항목에서는 다른 테스트나 탐색 없이 즉시 중단한다. 경고형 항목만 사용자 확인 후 `merge`로 진행할 수 있다.

## main 기존 수정사항 무시 모드 (사용자 명시 지시 시)

지시문: **"상관없는 main 변경 감지는 무시하고, 현재 plan 대상 레포 변경만 처리한다."**
- 루트의 기존 dirty/untracked: 중단 사유로 취급 안 함, 읽기/수정/스테이징 대상 제외
- 머지/테스트/완료 판정: 현재 impl 워크트리 + 현재 plan 변경분만 기준
- 루트 브랜치 `main` 확인 규칙과 `.git` 보호 규칙은 유지

## Git Guard Session Gate

- 0단계 루트 브랜치 자동 전환 또는 merge 관련 git mutation 전에 `common\tools\enable-git-guard.ps1 -Action enable-session`을 실행한다.
- 이어서 `common\tools\enable-git-guard.ps1 -Action status`로 현재 세션 PATH가 `common\tools`를 앞세우고 `git`이 `common\tools\git.cmd`를 해석하는지 확인한다.
- guard entrypoint가 없거나 session 활성화/상태 확인이 실패하면 `GIT_GUARD_NOT_ACTIVE`로 중단한다.
- guard는 root worktree의 `checkout main` 예외를 막지 않지만, linked worktree에서 `checkout main`/`switch main`을 차단해야 한다. 이 불변조건을 우회하기 위해 `git.exe`를 직접 호출하지 않는다.

## Stash 안전 계약

Stash는 merge-test/{scope}/{timestamp} tag로 push, ref는 git stash list 매칭으로 확정한다.
apply 성공 조건: LASTEXITCODE -eq 0 AND unmerged(UU|AA|DD) 0-hit. 조건 만족 시에만 drop.
PowerShell stash@{n} literal은 반드시 따옴표로 감싼다. 기본형 git stash pop 금지.
stash 실패 시 머지 커밋은 보존한다. git reset / git merge --abort 금지.
merge --abort는 merge conflict에만 사용한다.
상세 계약 및 실수 시 fsck 복구 절차: [_recipes.md](./_recipes.md) 참조.

## 실패 상태 전이 계약

| 실패 유형 | 루트 작업 트리 상태 | plan/todo 상태 | 다음 iteration 입력 |
|----------|----------------------|----------------|---------------------|
| `merge conflict` | `git merge --abort`로 clean state 복귀 | `수정필요` | 충돌 파일 목록, 실패 단계, 부모 plan 경로 |
| `ROOT_STASH_APPLY_FAILED`, `STASH_APPLY_FAILED`, `STASH_DROP_FAILED` | 머지 커밋 보존 + stash ref 유지 가능 | `수정필요` | stash ref, 실패 단계, 부모 plan 경로 |
| `frontend build/check`, `T4/T5` 실패 | 머지 커밋 롤백 후 워크트리 보존 | `수정필요` | 실패 명령, 로그 근거, 재시도 대상 테스트 |
| `frontend build lock/permission` | 머지 커밋 롤백 후 워크트리 보존 | `수정필요` | 실패 명령, 잠금/권한 로그(`EPERM`, `Access is denied`), 잠긴 경로, `restart-frontend --public` 재현 여부 |
| `frontend dependency failure` | 머지 커밋 롤백 후 워크트리 보존 | `수정필요` | 실패 명령, 누락 의존성 로그(`vite.cmd`, module/package not found), `Test-Path frontend\\node_modules\\.bin\\vite.cmd` 결과 |
| `MERGE_LOCK_TIMEOUT` | 머지 커밋 미발생 (acquire 단계에서 중단) | `수정필요` | lock holder runner_id, 대기 시간, 부모 plan 경로 |

`수정필요`는 수동 종료 딱지가 아니라 `/implement`가 다음 iteration에서 읽을 continuation anchor다. 이 스킬은 실패 시 충돌 파일 목록, stash ref, 실패 단계 같은 재진입 입력을 plan/todo에 남기고 중단한다.

## 실행 단계

### 0단계: 루트 브랜치 자동 전환 (필요 시)

원본 프로젝트 루트 브랜치를 확인한다. `main`이면 1단계로 진행한다.
`main`이 아니면 `stash push -> checkout main -> stash apply -> stash drop` 절차로 자동 전환한다.
수동 세션에서는 stash push 전에 사용자 확인을 받는다.
실패 코드: `ROOT_STASH_PUSH_FAILED` / `ROOT_STASH_REF_DUPLICATE` / `ROOT_CHECKOUT_FAILED` / `ROOT_STASH_APPLY_FAILED` / `ROOT_STASH_APPLY_PARTIAL` / `ROOT_STASH_DROP_FAILED`
apply 성공 + conflicts 0-hit 조건 미충족 시 drop 금지. stash 실패 시 머지 커밋 보존.
PowerShell 의사코드 및 예시 로그: [`_recipes.md`](./_recipes.md) '0단계 루트 브랜치 자동 전환 의사코드' 참조.

### 1단계: plan 정보 추출

plan 헤더에서 다음을 읽는다:
```
> branch: impl/{slug}
> worktree: .worktrees/impl-{slug}
> worktree-owner: {parent_plan_path}
```

slug, branch명, worktree 경로를 변수로 저장.

**plans-aware 문서 루트(`Resolve-DocsCommitRoot`/`_path-rules.md` helper 기준):**
- 공통 plan 파일은 `.worktrees/plans/docs/plan/`을 canonical 경로로 사용한다.
- `반영일시`/`머지커밋` Edit 대상은 plans 워크트리 내 절대경로 사용
- Edit 후 plans lineage worktree(`.worktrees/plans` 또는 `origin/plans` descendant sync worktree)에서 `Resolve-DocsCommitRoot` 반환 cwd로 이동하고 `Resolve-DocsCommitCandidates` 반환 파일만 `git add`한 뒤 `git commit -m "chore: {slug} 머지 완료 기록"`을 수행한다. push는 literal `origin plans`가 아니라 현재 docs commit root가 추적하는 upstream으로만 진행하고, root `main`/일반 feature branch면 중단한다.
- `git add -A`는 plans 워크트리에서도 금지한다.

### 1.1단계: 부모 계획서(owner) 식별

- 현재 파일이 `_todo.md`/`_todo-N.md`이면 `> 계획서:` 링크를 절대경로로 해석하여 `parent_plan_path`로 저장
- 대표 plan/단일 plan이면 현재 파일 절대경로를 `parent_plan_path`로 사용
- 부모 경로를 확정할 수 없으면 즉시 중단

### 1.2단계: worktree 소유권 검증

- `> worktree-owner:` 있으면: 쉼표 split+trim 후 `parent_plan_path` 포함 여부 확인 (대소문자/슬래시 무시). 불포함 시 중단.
- `> worktree-owner:` 없으면(레거시): `{plan경로}/**/*.md`에서 동일 branch/worktree로 부모 역추적. 불일치 시 중단. 일치 시 `> worktree-owner:` 보강 기록 + 즉시 커밋(`commit "chore: worktree-owner 기록"`).

### 머지 전 게이트 체크리스트 (1.5~1.8단계)

| 게이트 | 트리거 조건 | 통과 조건 | 실패 시 동작 |
|--------|------------|-----------|-------------|
| T3 검증 (1.5) | plan에 T3 체크박스 있음 | `[x]` 완료 | `[ ]` → 중단. fix: plan + 스킵만 체크 → 경고 + y/N |
| fix: 재발 경로 (1.6) | 파일명 `_fix-` 또는 제목 `fix:` | Phase R 섹션 + 미방어 0건 | Phase R 없음 → 경고 + y/N. 미방어 남음 → 경고 + y/N |
| T4/T5 Glob 재검증 (1.7) | plan에 T4/T5 `해당 없음` 표기 | Glob 0-hit | 1개 이상 → 해당 없음 거부, TC 자동 작성 후 실행 |
| 금지어 체크 (1.8) | fix: plan 머지 커밋 메시지 | 금지어 미포함 | 금지어 포함 → 경고 후 대체 |

fix 금지어: `근본 수정`, `근본 해결`, `완전 해결`, `최종 수정`, `영구 수정` → `N개 경로 방어 완료`로 대체.
T4/T5 Glob 자동 복구: `> T4 해당 없음:` 블록쿼트 삭제 + TC 작성 + 실행 + 체크 (중단 없음 — dev-runner 파이프라인 호환).
mock 기반 파일(`tests/**/*e2e*`) 발견 시 Read로 확인: AsyncMock/MagicMock 기반이면 T3(integration) 재분류, 실서버/Playwright면 T4 실행.

### 1.9단계: 동일 부모 배치 대상 수집 (_todo-N / 다중 프로젝트 공통)

> **attach 모드 비포함**: 배치 수집은 `parent_plan_path` 단일 기준. attached plan은 배치 자동 포함 안 됨.

- 현재 입력이 대표 plan(`*_todo-N.md` 아님)이면 1.9 시작 전에 `> **실행 TODO:**` 또는 sibling `_todo-*.md`를 enumerate한다.
- `완료`/archive 외 sibling `_todo` 중 `머지대기` 미만 상태가 하나라도 남아 있으면 `TODO_COMPLETENESS_NOT_READY`로 중단한다.
  - 이 경우 attach owner-set 미준비(`OWNER_SET_NOT_READY`)와 구분한다.
  - 대표 plan 전체 완료로 말하지 않고 `현재 target 머지 보류, 남은 _todo N개` 형식으로만 보고한다.

- **수집 기준**: `> **실행 TODO:**` 링크 또는 `{plan경로}/**/*_todo*.md` 스캔 → `> 계획서:`가 같은 sibling 후보 → `> branch:` + `> worktree:` 있는 파일만 채택
- **채택 조건**: `> 대상 프로젝트:`/`> 테스트명령:`/`> 선행조건:`/`> 실행순서:` 파싱. 선행조건 미완료 후보 제외 + 경고 출력
- **실행 순서**: `실행순서(N)` 오름차순 (child → parent). 동일 N/누락 시 현재 파일 우선. 하나라도 실패 시 이후 중단

### 1.95단계: merge turn lock 획득 (대기 허용)

프로젝트에 `scripts/plan_runner/merge_lock_cli.py`가 있고 `> 대상 프로젝트:`가 monitor-page(또는 merge_lock_cli.py 존재 프로젝트)인 경우에만 실행한다. wtools 자체 plan 머지 시에는 skip + 경고로 넘어간다.

```powershell
# runner_id: manual-{YYYYMMDDHHmmss}-{pid}-{slug}
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$pid = [System.Diagnostics.Process]::GetCurrentProcess().Id
$slug = # parent_plan_path에서 YYYY-MM-DD_ 제거한 파일명 stem
$runner_id = "manual-$timestamp-$pid-$slug"

$merge_lock_cli = "{project_root}/scripts/plan_runner/merge_lock_cli.py"
$lock_acquired = $false

if (Test-Path $merge_lock_cli) {
  Write-Host "[merge-test] merge turn lock 획득 시도: $runner_id"
  # 이 호출은 큐 대기 형태로 블로킹된다 (자기 차례까지 BRPOP 대기)
  # stderr에 WAITING ... 라인이 5초마다 출력됨 — 사용자에게 그대로 전달
  python "{project_root}/scripts/plan_runner/merge_lock_cli.py" acquire $runner_id
  $lockExitCode = $LASTEXITCODE

  if ($lockExitCode -eq 0) {
    Write-Host "[merge-test] lock 획득 완료: $runner_id"
    $lock_acquired = $true
  } elseif ($lockExitCode -eq 2) {
    # timeout — 비정상 케이스 (정상 대기는 exit 2가 발생하지 않음)
    Write-Host "MERGE_LOCK_TIMEOUT: acquire timeout — plan을 수정필요로 전이합니다."
    # plan 상태: 수정필요 / continuation anchor: lock holder, 대기 시간
    exit 1
  } elseif ($lockExitCode -eq 3) {
    # redis 미연결 — 경고 후 lock 없이 진행 (기존 동작 유지)
    Write-Host "[merge-test] REDIS_UNAVAILABLE — lock 없이 진행합니다."
  }
} else {
  Write-Host "[merge-test] merge_lock_cli.py 없음 — lock 스킵 (wtools 등 non-monitor-page 프로젝트)"
}
```

**중단 금지 계약**: front runner가 살아있는 동안 정상 대기(WAITING 로그 출력)는 종료 사유가 아니다. 사용자의 명시적 인터럽트(Ctrl+C 등) 없이는 이 대기를 임의로 중단하지 않는다. WAITING 로그가 출력되는 것은 정상 동작이며, 큐에서 차례가 오면 자동으로 진행된다.

### 2단계: 머지 실행

1.9단계에서 수집한 배치 대상(`merge_targets`)을 순서대로 반복 처리한다.

**각 대상별 cwd 결정** (`> 대상 프로젝트:` 기반, 워크트리 밖):
- `_todo-N.md`에 `> 대상 프로젝트:`가 있으면 해당 프로젝트 루트로 전환
- 없으면 기존 규칙: wtools 내부 → wtools 루트, 외부 → 해당 프로젝트 루트

각 대상 머지 전에 아래 preflight를 실행한다:

**preflight 변수:**
- `$branchDeltaFiles` = `git diff --name-only main...{target.branch}` (service_lock 판정 기준)
- `$branchFiles` = `git ls-tree -r --name-only {target.branch}` (untracked overwrite 판정 기준)
- `$serviceLockTargets` = `$branchDeltaFiles | Where-Object { 민감경로 -contains $_ }` (민감경로: `scripts/services/service_run.py`, `scripts/service_run.py`)
- `$runningServices` = `Get-Service MonitorPage-Admin,MonitorPage-Public | Where Status -eq Running`
- `$collision` = `git ls-files --others --exclude-standard | Where { $branchFiles -contains $_ }`

**판정:**
- `$serviceLockTargets ≥1` AND `$runningServices ≥1` → `MERGE_PRECHECK_WARN[service_lock]` + `Read-Host "...? (y/N)"`. 거부 시 `MERGE_PRECHECK_ABORTED[service_lock]`. 승인 시 계속. (severity: WARN, 2026-04-24 변경)
  권장 대응(강제 아님): `nssm stop MonitorPage-Admin`, `nssm stop MonitorPage-Public`. 현재 세션에서 nssm stop / Stop-Service / taskkill 우회 금지.
- `$serviceLockTargets ≥1` AND `$runningServices = 0` → service_lock 사유로 중단 안 함
- `$collision ≥1` → `MERGE_PRECHECK_FAILED[untracked_overwrite]` 즉시 중단. 경로 최대 20개 출력. 자동 삭제/이동 금지.
- `$collision = 0` → 다음 단계로 진행한다.

**실패 분류 규칙:**
- `service_lock`은 **머지 직전** `scripts/services/service_run.py` 또는 `scripts/service_run.py` unlink/overwrite 위험만 뜻한다. frontend build cache, `.vite`, `.svelte-kit`, preview artifact 잠금은 여기에 포함하지 않는다.
- `frontend build lock/permission`은 **머지 후 frontend build 또는 `restart-frontend --public` 단계**에서 `EPERM`, `Access is denied`, 잠긴 output/cache 경로가 보일 때 사용한다.
- `frontend dependency failure`은 `frontend\\node_modules\\.bin\\vite.cmd` 누락, module/package not found, install 손상처럼 의존성 복구가 필요한 경우에 사용한다. 이 경우를 `service_lock`으로 오분류하지 않는다.



**루트(main) dirty 처리 — stash-merge-selective-restore:**

| 단계 | 동작 | 실패 코드 |
|------|------|----------|
| push | `git stash push --include-untracked -m merge-test/{branch}/{ts}` | `STASH_PUSH_FAILED` |
| ref | `git stash list | Select-String tag` → `stash@{n}` 추출. 중복 시 | `STASH_REF_DUPLICATE` |
| merge | `git merge {branch} --no-ff -m "merge: ..."` (owner set 시 slug 목록 포함) | — |
| restore | tracked: `git restore --source=$stashRef --worktree -- {path}` | `STASH_APPLY_FAILED` |
| restore | untracked: `git restore --source="$stashRef^3" --worktree -- {path}` | `STASH_APPLY_FAILED` |
| conflict? | `git status --porcelain | Select-String '^(UU|AA|DD)'` 0-hit 확인 | `STASH_APPLY_PARTIAL` |
| drop | `git stash drop "$stashRef"` (apply 성공 + conflicts 0-hit 시에만) | `STASH_DROP_FAILED` |

stash 실패 시 머지 커밋은 보존한다. git reset / git merge --abort 금지.
skipped residue는 quarantine diff/log로 기록한다.
상세 의사코드: [`_recipes.md`](./_recipes.md) '2단계 stash-merge-selective-restore' 참조.

각 머지 성공 직후 `git rev-parse --short HEAD` / `Get-Date "yyyy-MM-dd HH:mm"`로 해시+시각을 추출하여
target 헤더의 `> 상태:` 바로 아래에 `> 반영일시:` + `> 머지커밋:` 두 줄을 Edit으로 삽입한다.
- `머지커밋`의 canonical source는 **이 시점의 main HEAD short hash**다. impl 브랜치 마지막 커밋이나 중간 merge hash를 재사용하지 않는다.

**머지 충돌 시:**
1. `git merge --abort` 실행
2. 충돌 파일 목록 사용자에게 보고
3. 현재 대상 + 미처리 대상의 워크트리/브랜치 보존, 관련 plan/todo 상태를 `수정필요`로 전이
4. 다음 iteration 입력으로 `충돌 파일 목록`, `merge-test failure reason`, `parent_plan_path`를 함께 기록
5. 충돌이 `TODO.md` 또는 Markdown/Text docs-only이고 root dirty 보존 조건을 해치지 않는 bounded safe-doc 범위일 때만 semantic merge를 허용한다. mixed/code conflict 또는 owner/file 경계가 불명확한 충돌은 **이후 단계 전체 중단**이며, 무인 기계적 resolve를 시도하지 않는다.

### 3단계: 상태 전이 #1 (T4/T5 있는 경우)

T4/T5 체크박스 있으면: target 헤더 + 푸터를 `> 상태: 통합테스트중`으로 Edit. 없으면 테스트 건너뜀.

### 4단계: T4/T5 탐지 및 실행

**T4/T5 탐지**: 각 target 문서에서 아래 패턴 확인:
- `### Phase T4` 또는 `T4:` 체크박스
- `### Phase T5` 또는 `T5:` 체크박스

**T4/T5가 있으면:**

> 실행 순서: restart-api → (worker target이면 restart) → 헬스체크 폴링 → 프론트엔드 빌드 → live readiness 재확인 → T4(e2e) → T5(http) → T5(http_live)

1. **서비스 재시작** (`> 대상 프로젝트:` 기반 분기):
   - **monitor-page**: `python "D:/work/project/tools/monitor-page/scripts/services/browser_workers.py" restart-api` 실행 후, `detect_restart_targets()` 결과에 `worker` target이 있으면 `python "D:/work/project/tools/monitor-page/scripts/services/browser_workers.py" restart`를 추가 실행한다. 실패 시 `Test-Path "D:/work/project/tools/monitor-page/scripts/services/browser_workers.py"`로 entrypoint 경로부터 확인한다.
   - **monitor-page worker target 판정**: `app/worker/`, `app/modules/*/worker/` 변경 포함 시
   - **monitor-page api target 판정**: `app/routes/`, `app/modules/*/routes/`, `app/modules/*/services/` 변경 포함 시
   - **monitor-page 예외**: frontend 전용 변경이나 api-only 변경처럼 `worker` target이 비어 있으면 `restart`는 호출하지 않는다. 헬스체크는 `restart-api` 실행 뒤 api readiness 확인 용도로만 유지한다.
   - **wtools 내부**: 해당 프로젝트의 서버 재시작 방식 사용
   - **그 외 프로젝트**: 서비스 재시작 스킵 (Python 라이브러리 등)
   - `_todo-N.md`에 `> 테스트명령:` 필드가 있으면 해당 명령으로 T4/T5 실행

2. **API 헬스체크 폴링** (최대 2분, 5초 간격, 24회):
   `Invoke-WebRequest "http://localhost:8001/api/v1/system/liveness"` → 200 즉시 진행.
   24회 초과 시 `HEALTHCHECK_TIMEOUT` exit 1 (머지 커밋 유지, plan 상태 통합테스트중 유지).
   폴링 의사코드: [`_recipes.md`](./_recipes.md) '4단계 API readiness / live readiness 폴링' 참조.

3. **프론트엔드 빌드 확인** (webapp-testing 스킬):
   ```powershell
   Set-Location "{project_root}\frontend"
   npm run build
   ```
   빌드 실패 분류:
   - `service_lock`: 이 단계에서 쓰지 않는다. service_lock은 merge preflight 전용이다.
   - `frontend build lock/permission`: `EPERM`, `Access is denied`, `.vite`/`.svelte-kit`/build 산출물 잠금, `restart-frontend --public`에서도 같은 권한 오류가 재현되는 경우.
   - `frontend dependency failure`: `vite.cmd` 누락, module/package not found, `npm install` 필요 신호.
   - `--emptyOutDir false`는 기본 merge-test 폴백이 아니다. build lock/permission을 가리기 위해 상시 사용하지 말고, 잠긴 산출물 경로가 로그로 특정된 뒤 운영자가 수동 복구 실험으로만 제한한다.
   - `--emptyOutDir false`는 `frontend dependency failure`, `selection failure`, 일반 타입/빌드 오류를 우회하는 수단으로 사용 금지다.
   빌드 실패 시 → 머지 롤백(`git reset --merge HEAD~1`), plan 상태 `머지대기`로 롤백, 워크트리 보존 후 **이후 단계 중단**.

4. **live readiness 재확인** (첫 live T4/http_live 직전, 최대 30초, 5초 간격, 6회):
   `Invoke-WebRequest "http://localhost:8001/api/v1/system/liveness"` → 200 즉시 진행.
   6회 초과 시 `MERGE_TEST_FAILED[live_readiness]` exit 1. TestClient 기반 `http` 마커에는 미적용.
   - 현재 run에서 step 1 `restart-api` 실행 로그와 step 2 `liveness polling` 200 근거가 둘 다 남지 않았으면 live T4/T5로 넘어가지 않는다.
   - 위 근거 없이 `T4` 또는 `http_live`를 먼저 실행하려 하면 `MERGE_TEST_PROCEDURE_VIOLATION`으로 즉시 중단한다. TestClient 기반 `http` 마커에는 이 gate를 적용하지 않는다.
   폴링 의사코드: [`_recipes.md`](./_recipes.md) '4단계 API readiness / live readiness 폴링' 참조.

5. **T4 실행** (E2E 존재 시):
   현재 run의 `restart-api` + `liveness polling` 근거가 없으면 `MERGE_TEST_PROCEDURE_VIOLATION`으로 즉시 중단한다.
   표준: `pytest -o addopts=--capture=sys tests/e2e/ -m e2e -v`
   명시적 파일: `python -m pytest -o addopts="--capture=sys -m e2e" {file} -v` (pytest.ini `not e2e` override 필수)
   `0 selected` 시 marker mismatch → 1회 재시도. 재시도 후에도 0 selected → `MERGE_TEST_FAILED[selection_contract]`.
   T4 기준: 실서버(localhost:8001) 또는 실브라우저(Playwright) 필요. TestClient/mock 기반은 T3.
   pytest marker 명령 레퍼런스: [`_recipes.md`](./_recipes.md) '4단계 T4/T5 pytest marker 명령' 참조.

6. **T5 실행** (HTTP 통합):

   | 마커 | 기반 | 실서버 필요 | 폴링 대기 | 표준 명령 |
   |------|------|------------|----------|----------|
   | `http` | TestClient | 불필요 | 불필요 | `pytest -o addopts=--capture=sys -m http -v` |
   | `http_live` | httpx + localhost | 필수 | 필수 | `pytest -o addopts=--capture=sys -m http_live -v` |

   `http_live`는 **본실행 전에 항상 collect-only discovery를 먼저 실행**한다: `pytest -o addopts=--capture=sys -m http_live --collect-only -q --no-header`
   명시적 파일 경로(`http`): `python -m pytest -o addopts="--capture=sys -m http" {file} -v` (pytest.ini `not http` override 필수)
   `http_live`는 현재 run의 `restart-api` + `liveness polling` 근거가 없으면 `MERGE_TEST_PROCEDURE_VIOLATION`으로 즉시 중단한다.
   명시적 파일 경로(`http_live`) 1단계: `python -m pytest -o addopts="--capture=sys -m http_live" {file} --collect-only -q --no-header`
   명시적 파일 경로(`http_live`) 2단계: collect-only에서 선택된 뒤에만 `python -m pytest -o addopts="--capture=sys -m http_live" {file} -v`
   `restart-frontend` 계열 plan의 T5 evidence에는 `python ... browser_workers.py restart-frontend --public` 실행 근거와 그 뒤 `http_live` 결과를 함께 남긴다.
   `Listener PID unchanged after restart (PID: ...) but frontend is healthy` 로그는 **warning-success path**다. 이 메시지가 나와도 명령 종료코드는 반드시 `0`이어야 하며, T5 evidence에서는 경고로 기록하되 실패로 취급하지 않는다.
   `SKIP(no-match)`: marker discovery(`--collect-only`) 0 selected 시에만 허용. 명시 파일 경로가 있는데 0 selected → `MERGE_TEST_FAILED[selection_contract]`.
   pytest marker 명령 레퍼런스: [`_recipes.md`](./_recipes.md) '4단계 T4/T5 pytest marker 명령' 참조.

6. 각 target의 T4/T5 체크박스 `[ ]` → `[x]` 업데이트, Read로 반영 확인

### 4.4단계: DB-direct evidence gate (Phase DB-Direct가 있는 경우)

- plan/todo에 `Phase DB-Direct`가 있으면 아래 3종 evidence를 T4/T5와 별도 필수 단계로 수집한다:
  - `실행 SQL/명령` — running DB에 직접 반영한 SQL 또는 명령
  - `존재 확인 쿼리` — 적용 결과를 확인한 query와 출력 요약
  - `live API 또는 runtime 결과` — DB 반영 뒤 수행한 live/runtime 검증 결과
- 위 3종 중 하나라도 비어 있으면 상태를 `구현완료` 또는 `머지완료`로 올리지 않고 `DB-direct 대기` 또는 동등한 미완료 상태로 남긴다.
- `merge`, `broad pytest`, `collect-only`만으로는 DB-direct/live validation 완료를 보고할 수 없다.

### 4.5단계: reflect 입력용 실패 메타데이터 기록

- 실패/경고 항목: `실패 명령 | 종료코드 | 카테고리(frontend-check/frontend-build/frontend-tsc/other) | 로그근거`
- 완료 안내 직전: 성공/미실행 포함 실행 근거 표 (`단계 | 실행 명령 | 결과 | 근거 로그`). 결과 값은 `완료/미실행/해당 없음/실패`만 쓰고, 최소 row는 `restart-api`, `liveness polling`, `merge`, `T4`, `T5-http`, `T5-http_live`, `정리`를 모두 포함한다.
- `Phase DB-Direct` 있으면: 근거 표에 `실행 SQL/명령`, `존재 확인 쿼리`, `live API 또는 runtime 결과` 3종 row 보존 필수.
- 위 근거 표/3종 evidence 미보존 시 T4/T5 완료 또는 DB-direct validation 완료 선언 금지.
- unresolved build/check failure 잔존 시 완료 안내에 `⚠️ unresolved 검증 실패가 있어 /reflect 후속 계획 생성이 필수입니다.` 포함.

**테스트 실패 시:**
```powershell
# 머지 커밋만 되돌리기 (HEAD~1이 머지 커밋)
git reset --merge HEAD~1
```
- plan 상태 롤백: `통합테스트중` → `머지대기`
- 현재 대상 + 미처리 대상 워크트리/브랜치 보존 (수정 후 재시도 가능)
- 실패 로그 사용자에게 보고
- **이후 단계 중단**

### 5단계: worktree 정리

배치 대상 전체가 성공한 뒤, worktree/branch를 **한 번에 정리**한다:

**제거 전 필수: dirty 체크 게이트**

각 target 제거 전에 main/worktree 모두 자동 흡수 없이 확인한다:

- `git status --porcelain`(main) → dirty → `ROOT_DIRTY_BEFORE_REMOVE` exit 1. 자동 add/commit 금지.
- `git -C {worktree} status --porcelain` → dirty → `WORKTREE_DIRTY_BEFORE_REMOVE` exit 1. 자동 커밋 금지.
- clean 확인 후: `git worktree unlock {worktree}` (실패 무시) → `git worktree remove {worktree} --force` → `git branch -D {branch}`

각 target 헤더에서 아래 줄 Edit으로 제거:
```
> branch: {target.branch}
> worktree: {target.worktree}
> worktree-owner: {parent_plan_path}
```

- `Phase Z` 체크박스는 worktree unlock/remove, branch 삭제, header 메타 제거가 끝난 뒤에만 `[x]`로 변경한다.
- `main merge 시도`, `root dirty stash/apply (if needed)`, `T4/T5`, `worktree unlock/remove`, `branch 삭제`, `header meta 제거` 중 하나라도 남아 있으면 `Phase Z`는 완료가 아니다.
- `/implement`가 남겨둔 `Phase Z` 미완료는 정상이며, merge-test가 여기서 마무리한다.
- `/done` 또는 `auto-done` 진입 전 read-back에서 `Phase Z` 미완료 0건 + `> 머지커밋:` 값이 현재 main HEAD와 일치해야 한다. 하나라도 어긋나면 archive 진행 금지다.

### 5.5단계: merge turn lock 해제

1.95단계에서 acquire가 성공한 경우(`$lock_acquired = $true`)에만 실행한다. acquire 실패/skip 시 호출 금지.

머지 충돌, T4/T5 실패, stash 실패 등 **모든 실패 분기**에서도 finally 의미로 반드시 호출한다.

```powershell
if ($lock_acquired) {
  Write-Host "[merge-test] merge turn lock 해제: $runner_id"
  python "{project_root}/scripts/plan_runner/merge_lock_cli.py" release $runner_id
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[merge-test] lock release 실패 (exit $LASTEXITCODE) — stale 감지로 자동 처리됩니다."
    # release 실패는 non-blocking 경고 — 다음 acquire 시 stale 제거로 자동 복구됨
  }
  $lock_acquired = $false
}
```

### 6단계: 상태 전이 #2

plan/todo에 `Phase DB-Direct`가 있으면 4.4/4.5 evidence 3종이 모두 있는 경우에만 아래 `구현완료` 전이를 수행한다.
하나라도 비어 있으면 상태를 `DB-direct 대기` 또는 동등한 미완료 상태로 유지하고 완료 안내에서도 그 상태를 그대로 쓴다.

각 target 헤더 + 푸터를 `> 상태: 구현완료` / `> 진행률: N/N (100%)` / `*상태: 구현완료 | 진행률: N/N (100%)*`로 Edit.
`반영일시`/`머지커밋`은 2단계에서 이미 삽입됨 — 중복 추가 금지.

### 7단계: /done 실행 (완료 처리)

머지 + T4/T5 완료 후, `/done` 스킬의 SKILL.md를 읽고 **1~8단계를 동일하게** 직접 실행한다.

- plan/archive 이동은 문서 위치 규칙 기반 경로(`{plan경로}`/`{archive경로}`)를 그대로 따른다.
- `/done`의 Archive reference drift gate를 포함해 실행한다. merge-test가 archive까지 일괄 처리할 때도 이동 전 plan filename/path를 직접 가리키는 repo 내부 참조를 stale 상태로 남기지 않는다.
- 커밋은 `commit "message"` 스크립트만 사용하고, `git commit` 직접 실행을 금지한다.
- 완료 안내 문구는 `/done`의 고정 안내(회고 안내 + 최근 검증 실패 Q4 금지 문구)를 그대로 출력한다.
- plans TODO 동기화까지 `/done`의 책임이다. (`.worktrees/plans/TODO.md`)

### 8단계: 완료 안내

```
부모 묶음 머지 + 통합테스트 + 완료처리 완료
parent: {parent_plan_path}  대상: {N}건  머지: {branches} → main ✅

실행 근거: | 단계 | 실행 명령 | 결과(완료/미실행/해당 없음/실패) | 근거 로그 |
(restart-api, liveness polling, merge, T4, T5-http, T5-http_live, 정리 각 row 포함)
```

T4/T5 완료 표기는 실행 근거 표에 실제 명령+결과가 있을 때만. `merge`/`broad pytest`/`collect-only`만으로 완료 선언 금지.
미실행 단계는 `미실행`으로 명시. 정리 완료 + 상태: 구현완료 → archive.
회고 필요 시 `/reflect`. 최근 검증 실패 있으면 실패 명령/종료코드 표 먼저 작성 + Q4 해당 없음 판정 금지.

## T4/T5 스킵 규칙

포함 조건 미충족 시 Phase 생략 가능. 조건 충족인데 스킵하려면 체크박스 금지, 블록쿼트로 사유 기재:
`> T4 E2E 해당 없음: {사유}` / `> T5 HTTP 해당 없음: {사유}`
**금지**: "단위 테스트로 커버됨" 자의적 판단. 1.7단계 Glob 재검증으로 파일 존재 시 TC 자동 작성+실행.

## worktree 미사용 시 / 환경

plan에 `> branch:` 없으면 → 바로 `/done` 호출.
**cwd**: 반드시 원본 프로젝트 루트. **루트 브랜치**: 0단계 자동 전환으로 `main` 정규화. **Windows**: 절대경로, PowerShell.
