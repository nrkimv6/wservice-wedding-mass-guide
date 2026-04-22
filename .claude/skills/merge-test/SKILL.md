---
name: merge-test
description: "워크트리 브랜치를 main에 머지하고 T4/T5 통합테스트를 실행 + 완료처리까지 일괄 실행. /implement 완료 후 호출."
triggers: ["머지 테스트", "merge-test", "머지후테스트", "통합테스트", "merge test"]
---

# 머지 후 통합테스트 게이트

`/implement`로 worktree에서 구현 완료 후, main에 머지하고 T4/T5 통합테스트를 실행하고 완료처리(archive + 문서정리 + 커밋)까지 일괄 실행합니다.

## 워크플로우 위치

```
/implement (worktree 구현 + T1/T2 단위테스트 + T3 재현/통합TC)
  → /merge-test  ← 지금 여기 (머지 + T4/T5 + done 일괄 실행)
```

## 전제 조건 확인

실행 전 다음 조건을 모두 확인한다:

1. **plan 헤더에 `> branch:` 필드 존재** — 없으면 워크트리 미사용 구현이므로 이 스킬 불필요. `/done` 직접 호출.
2. **plan 상태가 `머지대기`** — legacy plan이 아직 `구현중`이면 경고 후 계속, 그 외 상태면 중단
3. **모든 구현 체크박스 `[x]` 완료** — 미완료 `[ ]` 항목이 있으면 경고 (T4/T5 체크박스는 제외하고 판단)
4. **원본 프로젝트 루트 브랜치 확인** — `main`이 아니면 0단계 자동 전환 절차(`stash push -> checkout -> stash apply/drop`)를 수행
5. **워크트리 소유권 확인** — `> worktree-owner:` 또는 `> 계획서:` 기준 부모 경로가 현재 작업의 부모 계획서와 일치해야 함 (불일치 시 중단)

```
전제 조건 실패 시:
- branch 없음 → "워크트리 미사용 구현입니다. /done을 직접 호출하세요."
- 상태 불일치 → "plan 상태가 {현재상태}입니다. /merge-test는 머지대기 상태(legacy 구현중 경고 허용)에서 실행합니다."
- 미완료 체크박스 → "미완료 항목이 있습니다: {목록}. 계속하시겠습니까?"
- 루트 브랜치 자동 전환 실패 → "원본 프로젝트 루트가 {브랜치}이며 main 전환에 실패했습니다.({실패단계}) merge-test를 중단합니다."
- 소유권 불일치 → "현재 plan은 다른 부모 계획서의 worktree를 가리키고 있어 merge-test를 중단합니다."
```

## main 기존 수정사항 무시 모드 (사용자 명시 지시 시)

사용자가 "main의 기존 수정사항을 고려하지 말라"고 명시한 경우:

- 실행 지시문(고정): **"상관없는 main 변경 감지는 무시하고, 현재 plan 대상 레포 변경만 처리한다."**
- 루트(main worktree)의 기존 `dirty`/`untracked` 파일은 머지-test 중단 사유로 취급하지 않는다.
- 루트(main)의 기존 수정 파일은 읽기/수정/복구/스테이징 대상에서 제외한다.
- 머지/테스트/완료 판정은 현재 impl 워크트리와 현재 plan 변경분만 기준으로 수행한다.
- 무시 모드는 "중단 판정 완화"에만 적용되며, 판정 범위를 제외한 동작은 기존 규칙을 유지한다.
- 단, 루트 브랜치가 `main`인지 확인하는 규칙과 `.git` 보호 규칙은 그대로 유지한다.

## Stash 안전 계약

- stash 생성은 항상 `git stash push --include-untracked -m "{stashTag}"` 형식으로 수행한다.
- `stashTag`는 `merge-test/{scope}/{timestamp}` 형식으로 만든다. `scope`는 `root` 또는 `target.branch`를 사용한다.
- stash 생성 여부는 stdout 문자열이 아니라 `git stash list | Select-String ([regex]::Escape($stashTag))` 결과로만 판정한다.
- 기본형 `git stash pop`은 금지한다. 복원은 명시적 `$stashRef`에 대해서만 `git stash apply $stashRef`를 수행한다.
- `git stash drop $stashRef`는 `apply` 성공 후에만 수행한다.
- `push`, `list`, `apply`, `drop` 어느 단계든 실패하면 stash ref와 실패 단계를 로그에 남기고 관련 plan/todo를 `수정필요` continuation anchor로 남긴 뒤 즉시 중단한다.
- 2단계 stash hard stop은 **머지 커밋을 보존한 채 후속 테스트/검증 단계만 중단**하는 의미다. stash 복원 실패를 이유로 `git reset`, `git merge --abort`로 머지를 되돌리지 않는다.
- `merge --abort`는 merge conflict에만 사용한다. 충돌 마커가 섞인 파일에서 모델이 기계적으로 resolve를 시도하면 정합성이 쉽게 깨지므로, abort 후 clean state + 충돌 파일 목록을 다음 iteration 입력으로 넘기는 방식을 기본 계약으로 둔다.

## 실패 상태 전이 계약

| 실패 유형 | 루트 작업 트리 상태 | plan/todo 상태 | 다음 iteration 입력 |
|----------|----------------------|----------------|---------------------|
| `merge conflict` | `git merge --abort`로 clean state 복귀 | `수정필요` | 충돌 파일 목록, 실패 단계, 부모 plan 경로 |
| `ROOT_STASH_APPLY_FAILED`, `STASH_APPLY_FAILED`, `STASH_DROP_FAILED` | 머지 커밋 보존 + stash ref 유지 가능 | `수정필요` | stash ref, 실패 단계, 부모 plan 경로 |
| `frontend build/check`, `T4/T5` 실패 | 머지 커밋 롤백 후 워크트리 보존 | `수정필요` | 실패 명령, 로그 근거, 재시도 대상 테스트 |

`수정필요`는 수동 종료 딱지가 아니라 `/implement`가 다음 iteration에서 읽을 continuation anchor다. 이 스킬은 실패 시 충돌 파일 목록, stash ref, 실패 단계 같은 재진입 입력을 plan/todo에 남기고 중단한다.

## 실행 단계

### 0단계: 루트 브랜치 자동 전환 (필요 시)

원본 프로젝트 루트에서 `git rev-parse --abbrev-ref HEAD`를 실행한다.

- `main`이면 → 1단계 진행
- `main`이 아니면 → 아래 순서로 자동 전환 시도 (dirty 파일 유형: 문서/코드 구분 없음)
  1. `$timestamp = Get-Date -Format "yyyyMMddHHmmss"` 후 `$stashTag = "merge-test/root/$timestamp"` 생성
  2. `git stash push --include-untracked -m $stashTag` 실행
     - 실패 시 즉시 중단 (`ROOT_STASH_PUSH_FAILED`)
  3. `$stashMatches = @(git stash list | Select-String ([regex]::Escape($stashTag)))`
     - 0건 → stash 미생성, `$stashRef = $null`
     - 1건 → `$stashRef = (($stashMatches[0].Line -split ':')[0]).Trim()`
     - 2건 이상 → 즉시 중단 (`ROOT_STASH_REF_DUPLICATE`)
  4. `git checkout main` 실행
     - 실패 시 `$stashRef`가 있으면 `git stash apply $stashRef` → 성공 시 `git stash drop $stashRef`로 복구 시도 후 즉시 중단
  5. `$stashRef`가 있으면 `git stash apply $stashRef`
     - 실패/충돌 시 자동 해결 금지, 즉시 중단 (`ROOT_STASH_APPLY_FAILED`)
  6. `git stash drop $stashRef`
     - 실패 시 즉시 중단 (`ROOT_STASH_DROP_FAILED`)
  7. `git rev-parse --abbrev-ref HEAD` 재확인
     - `main`이 아니면 즉시 중단

예시 로그:
```
[merge-test] root branch 감지: feature/foo
[merge-test] stash push 실행: merge-test/root/20260415103000
[merge-test] stash ref 확인: stash@{2}
[merge-test] checkout main 성공
[merge-test] stash apply 완료: stash@{2}
[merge-test] stash drop 완료: stash@{2}
[merge-test] root branch 재확인: main
```

### 1단계: plan 정보 추출

plan 헤더에서 다음을 읽는다:
```
> branch: impl/{slug}
> worktree: .worktrees/impl-{slug}
> worktree-owner: {parent_plan_path}
```

slug, branch명, worktree 경로를 변수로 저장.

**plans-aware 문서 루트(`Resolve-DocsCommitRoot`/`_path-rules.md` helper 기준):**
- 공통 plan 파일은 `.worktrees/plans/docs/plan/`을 우선 사용하고, 없을 때만 legacy `common/docs/plan/`을 fallback으로 사용한다.
- `반영일시`/`머지커밋` Edit 대상은 plans 워크트리 내 절대경로 사용
- Edit 후 plans lineage worktree(`.worktrees/plans` 또는 `origin/plans` descendant sync worktree)에서 `Resolve-DocsCommitRoot` 반환 cwd로 이동하고 `Resolve-DocsCommitCandidates` 반환 파일만 `git add`한 뒤 `git commit -m "chore: {slug} 머지 완료 기록"`을 수행한다. push는 literal `origin plans`가 아니라 현재 docs commit root가 추적하는 upstream으로만 진행하고, root `main`/일반 feature branch면 중단한다.
- `git add -A`는 plans 워크트리에서도 금지한다.

### 1.1단계: 부모 계획서(owner) 식별

- 현재 파일이 `_todo.md`/`_todo-N.md`이면 `> 계획서:` 링크를 절대경로로 해석하여 `parent_plan_path`로 저장
- 대표 plan/단일 plan이면 현재 파일 절대경로를 `parent_plan_path`로 사용
- 부모 경로를 확정할 수 없으면 즉시 중단

### 1.2단계: worktree 소유권 검증

- `> worktree-owner:` 필드가 있으면 값이 `parent_plan_path`와 일치해야 한다.
- `> worktree-owner:` 필드가 없으면(레거시) `{plan경로}/**/*.md`에서 동일 `> branch:`/`> worktree:`를 검색해 소유 부모를 역추적한다.
- 역추적 결과 부모가 다르면 즉시 중단한다. (다른 부모 계획서 워크트리 사용 금지)
- 역추적 결과 부모가 일치하면 현재 파일 헤더에 `> worktree-owner: {parent_plan_path}`를 보강 기록한다.
- 보강 기록이 발생하면 즉시 `git status`로 변경 여부 확인 후, 변경이 있으면 해당 plan 파일만 `git add`하고 `commit "chore: worktree-owner 기록"`으로 즉시 커밋한다.

### 1.5단계: T3 검증 게이트

plan에 T3 체크박스가 있으면 머지 전 검증:

- **T3 미실행 (`[ ]` 남아있음)**: "implement에서 T3를 먼저 실행하세요" 안내 후 **중단**
- **fix: plan인데 T3가 `스킵`으로만 체크**: 경고 출력 + "T3 재현TC 없이 머지하시겠습니까?" 사용자 확인
- **T3 `[x]` 완료**: 정상 통과

### 1.6단계: fix: plan 재발 경로 검증

plan/todo 파일명에 `_fix-`가 포함되거나 제목이 `fix:`로 시작하면:

> **done과의 차이**: done은 hard stop(중단), merge-test는 경고 후 사용자 확인(y/N). 이유: 머지 시점에는 사용자가 리스크를 인지하고 진행할 수 있어야 함.

1. plan/todo 내용에서 "재발 경로 분석" 또는 "Phase R" 문자열 검색
2. **없으면** → 경고 출력 + 사용자 확인 요청:
   ```
   ⚠️ fix: plan에 Phase R(재발 경로 분석)이 없습니다.
   미검증 우회 경로가 존재할 수 있습니다. 머지하시겠습니까? (y/N)
   ```
3. **있으면** → Phase R 섹션(### Phase R ~ 다음 ### 사이) 내에서만 "미방어" 문자열 검색 (코드블럭·템플릿 텍스트 제외)
4. Phase R 섹션 내 "미방어" 경로가 남아있으면 → 경고 + 사용자 확인 요청:
   ```
   ⚠️ 재발 경로 분석에 미방어 경로가 남아있습니다.
   미방어 경로가 머지 후 재발을 일으킬 수 있습니다. 계속하시겠습니까? (y/N)
   ```
5. 전부 "방어됨"이면 → 정상 통과

### 1.7단계: T4/T5 해당 없음 Glob 재검증

plan에 T4/T5가 `> T4 해당 없음:` 블록쿼트 또는 (레거시) `[x] 스킵`으로 표기되어 있으면, merge-test가 독립적으로 Glob을 실행하여 해당 없음 판정을 재검증한다.
expand-todo의 판단을 신뢰하지 않고, 직접 확인한다.

**검증 절차:**
1. plan에서 T4/T5 `> T4 해당 없음:` 블록쿼트 또는 `[x] 스킵` 항목 탐지 (없으면 이 단계 스킵)
2. T4 해당 없음인 경우: `Glob tests/**/*http*`, `Glob tests/**/*api*` 실행
   T3 해당 없음인 경우: `Glob tests/**/*e2e*`, `Glob tests/**/*integration*` 실행
3. 판정:
   - Glob 결과 1개 이상 존재 → **해당 없음 거부, TC 자동 작성 후 실행**
   - Glob 결과 0개 → 해당 없음 허용, 정상 통과

**해당 없음 거부 시 자동 복구:**
1. plan의 `> T4 해당 없음:` 블록쿼트를 삭제하고 체크박스 TC를 새로 작성한다 (레거시 `[x] 스킵`인 경우 `[ ]`로 되돌린다)
2. 기존 테스트 파일 패턴을 참고하여 해당 변경에 대한 T4/T5 TC를 자동 작성한다
3. TC 실행 후 통과하면 체크박스를 `[x]`로 업데이트하고 정상 진행한다
4. TC 실패 시 → 일반 테스트 실패 흐름(머지 롤백 등)으로 처리

**T4 재검증 시 mock 기반 파일 처리:**
- `tests/**/*e2e*` Glob으로 발견된 파일이 `tests/e2e/` 밖에 있으면 → Read로 내용 확인
  - mock 기반(AsyncMock/MagicMock/patch 다수 사용 + 실서버/Playwright 미사용)이면 → T4 대상 아님, T3(integration)으로 재분류 안내
  - 실서버/Playwright 사용이면 → T4 경로에 해당 파일 경로를 추가하여 실행

### 1.8단계: 금지어 체크 (fix: plan만)

fix: plan인 경우, 머지 커밋 메시지에 아래 표현이 포함되면 경고 후 대체:
- ❌ "근본 수정", "근본 해결", "완전 해결", "최종 수정", "영구 수정"
- ✅ 대체: "N개 경로 방어 완료", "재발 경로 M개 중 M개 방어됨"

### 1.9단계: 동일 부모 배치 대상 수집 (_todo-N / 다중 프로젝트 공통)

`parent_plan_path`가 같은 TODO 파일을 배치로 수집한다:
1. 대표 plan의 `> **실행 TODO:**` 링크 또는 `{plan경로}/**/*_todo*.md` 스캔으로 sibling 후보 수집
2. 각 후보에 대해 `> 계획서:` 링크가 `parent_plan_path`와 같은지 확인
3. `> branch:` + `> worktree:`가 있는 파일만 머지 대상으로 채택
4. `> 대상 프로젝트:`/`> 테스트명령:`/`> 선행조건:`/`> 실행순서:`를 함께 파싱
5. 선행조건 미완료 후보는 제외하고 경고 출력

**배치 실행 순서:**
- 실행순서(N) 오름차순으로 처리 (child → parent)
- 동일 N이거나 누락 시 현재 파일을 우선
- 하나라도 머지/테스트 실패하면 이후 후보는 중단

### 2단계: 머지 실행

1.9단계에서 수집한 배치 대상(`merge_targets`)을 순서대로 반복 처리한다.

**각 대상별 cwd 결정** (`> 대상 프로젝트:` 기반, 워크트리 밖):
- `_todo-N.md`에 `> 대상 프로젝트:`가 있으면 해당 프로젝트 루트로 전환
- 없으면 기존 규칙: wtools 내부 → wtools 루트, 외부 → 해당 프로젝트 루트

각 대상 머지 전에 아래 preflight를 먼저 실행한다:

```powershell
$branchFiles = git ls-tree -r --name-only {target.branch}
# service_lock은 브랜치 전체 트리가 아니라 이번 merge diff만 기준으로 판정한다.
$branchDeltaFiles = git diff --name-only main...{target.branch}
# redirect stub도 merge overwrite 시 잠금 리스크가 있으므로 동일 민감 경로로 취급한다.
$sensitiveMergeFiles = @(
  "scripts/services/service_run.py",
  "scripts/service_run.py"
)
$serviceLockTargets = $branchDeltaFiles | Where-Object { $sensitiveMergeFiles -contains $_ }
$runningServices = @(
  Get-Service -Name "MonitorPage-Admin","MonitorPage-Public" -ErrorAction SilentlyContinue |
    Where-Object { $_.Status -eq "Running" }
)
$untracked = git ls-files --others --exclude-standard
# untracked overwrite는 변경 여부와 무관하게 브랜치 전체 파일 목록을 유지한다.
$collision = $untracked | Where-Object { $branchFiles -contains $_ }
```

- `$serviceLockTargets`가 1개 이상이고 `$runningServices`도 있으면 즉시 중단:
  - 로그 prefix: `MERGE_PRECHECK_FAILED[service_lock]`
  - 이번 merge diff에 포함된 `service_run.py` 경로와 실행 중인 서비스명을 함께 출력
  - 현재 세션에서 `nssm stop`, `Stop-Service`, `taskkill` 우회 시도 금지
  - 관리자 PowerShell 안내만 고정 출력:
    - `nssm stop MonitorPage-Admin`
    - `nssm stop MonitorPage-Public`
    - `Stop-Service -Name MonitorPage-Admin,MonitorPage-Public -Force`
  - 위 관리자 명령은 이번 merge diff에 `service_run.py` 경로가 포함된 경우에만 필요하다.
  - `git merge`는 시도하지 않는다.
- `$serviceLockTargets`가 1개 이상이어도 `$runningServices`가 0개면 service_lock 이유로는 중단하지 않는다.
- `$serviceLockTargets`가 0개면 `MonitorPage-Admin`, `MonitorPage-Public`가 실행 중이어도 service_lock 이유로는 중단하지 않는다.

- `$collision`이 1개 이상이면 즉시 중단:
  - 로그 prefix: `MERGE_PRECHECK_FAILED[untracked_overwrite]`
  - 충돌 경로를 최대 20개 출력
  - **자동 삭제/자동 이동 금지** (운영자가 수동 정리 후 재시도)
- `$collision`이 0개면 다음 단계로 진행한다.

**루트(main) dirty 처리 — stash-merge-selective-restore:**

머지 전 루트에 staged/unstaged 변경이 있으면 stash로 임시 보관 후 머지한다:

```powershell
$rootDirty = git status --porcelain
$stashRef = $null
$stashTag = $null
if ($rootDirty) {
  $timestamp = Get-Date -Format "yyyyMMddHHmmss"
  $stashTag = "merge-test/$($target.branch)/$timestamp"
  Write-Host "[merge-test] root dirty 감지 — stash push: $stashTag"
  git stash push --include-untracked -m $stashTag
  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ STASH_PUSH_FAILED: root stash 실패"
    exit 1
  }

  $stashMatches = @(git stash list | Select-String ([regex]::Escape($stashTag)))
  if ($stashMatches.Count -gt 1) {
    Write-Host "❌ STASH_REF_DUPLICATE: 동일 stashTag가 2개 이상 감지되었습니다. ($stashTag)"
    exit 1
  }
  if ($stashMatches.Count -eq 1) {
    $stashRef = (($stashMatches[0].Line -split ':')[0]).Trim()
    Write-Host "[merge-test] stash ref 확인: $stashRef"
  }
}

# 원본 프로젝트 루트에서 실행
git merge {target.branch} --no-ff -m "merge: {target.branch}"

if ($stashRef) {
  Write-Host "[merge-test] stash selective restore 시작: $stashRef"
  $allowedRestore = @(
    # pre-stash owned 경로만 포함: 현재 plan/TODO/DONE 등 이번 작업 소유 파일
  )
  $trackedRestore = @(
    # merge 산출물과 겹치지 않는 tracked 경로만 복원
  )
  $untrackedRestore = @(
    # merge 산출물과 겹치지 않는 untracked 경로만 복원
  )

  foreach ($path in $trackedRestore) {
    git restore --source=$stashRef --worktree -- $path
  }
  foreach ($path in $untrackedRestore) {
    git restore --source="$stashRef^3" --worktree -- $path
  }

  Write-Host "[merge-test] skipped residue는 quarantine diff/log로 기록합니다."

  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ STASH_APPLY_FAILED: stash selective restore 실패 ($stashRef)"
    Write-Host "  → 머지 커밋은 보존합니다. git reset / git merge --abort로 롤백하지 마세요."
    Write-Host "  → 관련 plan/todo는 수정필요 continuation anchor로 남깁니다."
    Write-Host "  → 후속 테스트/검증 단계만 중단합니다."
    exit 1
  }

  git stash drop $stashRef
  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ STASH_DROP_FAILED: stash 정리 실패 ($stashRef)"
    Write-Host "  → 머지 커밋은 보존합니다. 수동으로 stash 목록을 확인하세요."
    Write-Host "  → 관련 plan/todo는 수정필요 continuation anchor로 남깁니다."
    Write-Host "  → 후속 테스트/검증 단계만 중단합니다."
    exit 1
  }

  Write-Host "[merge-test] stash selective restore/drop 완료: $stashRef"
}
```

각 머지 성공 직후 커밋 해시를 추출하여 **해당 target 파일 헤더**에 기록한다:

```powershell
$MERGE_HASH = git rev-parse --short HEAD
$MERGE_APPLIED_AT = Get-Date -Format "yyyy-MM-dd HH:mm"
```

target 헤더에 다음 두 줄을 `> 상태:` 줄 바로 아래에 Edit으로 삽입:

```markdown
> 반영일시: {MERGE_APPLIED_AT}
> 머지커밋: {MERGE_HASH}
```

예시:
```markdown
> 상태: 구현완료
> 반영일시: 2026-03-04 14:32
> 머지커밋: a1b2c3d
```

**머지 충돌 시:**
1. `git merge --abort` 실행
2. 충돌 파일 목록 사용자에게 보고
3. 현재 대상 + 미처리 대상의 워크트리/브랜치 보존, 관련 plan/todo 상태를 `수정필요`로 전이
4. 다음 iteration 입력으로 `충돌 파일 목록`, `merge-test failure reason`, `parent_plan_path`를 함께 기록
5. **이후 단계 전체 중단** — 무인 기계적 resolve는 시도하지 않음

### 3단계: 상태 전이 #1 (T4/T5 있는 경우)

각 `target` 파일에 T4/T5 체크박스가 있으면:

```markdown
> 상태: 통합테스트중
```

해당 target 헤더 + 푸터(`*상태: ...*`) 모두 Edit으로 업데이트.

해당 target에 T4/T5가 없으면 → 테스트 없이 다음 target으로 진행한다.

### 4단계: T4/T5 탐지 및 실행

**T4/T5 탐지**: 각 target 문서에서 아래 패턴 확인:
- `### Phase T4` 또는 `T4:` 체크박스
- `### Phase T5` 또는 `T5:` 체크박스

**T4/T5가 있으면:**

> 실행 순서: restart-api → (worker target이면 restart) → 헬스체크 폴링 → 프론트엔드 빌드 → live readiness 재확인 → T4(e2e) → T5(http) → T5(http_live)

1. **서비스 재시작** (`> 대상 프로젝트:` 기반 분기):
   - **monitor-page**: `python "D:/work/project/tools/monitor-page/scripts/browser_workers.py" restart-api` 실행 후, `detect_restart_targets()` 결과에 `worker` target이 있으면 `python "D:/work/project/tools/monitor-page/scripts/browser_workers.py" restart`를 추가 실행한다.
   - **monitor-page worker target 판정**: `app/worker/`, `app/modules/*/worker/` 변경 포함 시
   - **monitor-page api target 판정**: `app/routes/`, `app/modules/*/routes/`, `app/modules/*/services/` 변경 포함 시
   - **monitor-page 예외**: frontend 전용 변경이나 api-only 변경처럼 `worker` target이 비어 있으면 `restart`는 호출하지 않는다. 헬스체크는 `restart-api` 실행 뒤 api readiness 확인 용도로만 유지한다.
   - **wtools 내부**: 해당 프로젝트의 서버 재시작 방식 사용
   - **그 외 프로젝트**: 서비스 재시작 스킵 (Python 라이브러리 등)
   - `_todo-N.md`에 `> 테스트명령:` 필드가 있으면 해당 명령으로 T4/T5 실행

2. **API 헬스체크 폴링** (최대 2분, 5초 간격):
   ```powershell
   for ($i = 1; $i -le 24; $i++) {
     try {
       Invoke-WebRequest -UseBasicParsing "http://localhost:8001/api/v1/dev-runner/runners" | Out-Null
       break
     }
     catch {
       Write-Host "API 대기 중... ($($i * 5)초 경과)"
       Start-Sleep -Seconds 5
       if ($i -eq 24) {
         Write-Host "❌ HEALTHCHECK_TIMEOUT: API 2분 미응답 — T4/T5 실행 중단."
         Write-Host "  → 서버를 수동으로 기동한 뒤 /merge-test를 재실행하세요."
         # 머지는 이미 완료됨, plan 상태는 통합테스트중으로 유지
         exit 1
       }
     }
   }
   ```
   - 200 응답 시 즉시 다음 단계로 진행
   - 24회(2분) 초과 시 HEALTHCHECK_TIMEOUT exit 1로 중단 (머지 커밋은 유지, plan 상태 통합테스트중 유지)

3. **프론트엔드 빌드 확인** (webapp-testing 스킬):
   ```powershell
   Set-Location "{project_root}\frontend"
   npm run build
   ```
   빌드 실패 시 → 머지 롤백(`git reset --merge HEAD~1`), plan 상태 `머지대기`로 롤백, 워크트리 보존 후 **이후 단계 중단**.

4. **live readiness 재확인** (첫 live T4/http_live 직전, 최대 30초, 5초 간격):
   ```powershell
   for ($i = 1; $i -le 6; $i++) {
     try {
       Invoke-WebRequest -UseBasicParsing "http://localhost:8001/api/v1/dev-runner/runners" | Out-Null
       break
     }
     catch {
       Write-Host "LIVE_READINESS_RECHECK: frontend build 이후 API 재확인 중... ($($i * 5)초 경과)"
       Start-Sleep -Seconds 5
       if ($i -eq 6) {
         Write-Host "MERGE_TEST_FAILED[live_readiness]: localhost:8001 connection refused/timeout after frontend build"
         Write-Host "  → 초기 polling 성공과 별개로 build 뒤 live readiness가 회복되지 않았습니다. 서버 상태 확인 후 /merge-test를 재실행하세요."
         exit 1
       }
     }
   }
   ```
   - 이 재확인은 **실서버 E2E(T4)** 와 **`http_live`** 직전에만 적용한다.
   - TestClient 기반 `http` 마커에는 이 재확인 규칙을 적용하지 않는다.
   - 첫 live 요청의 `localhost:8001` connection refused 또는 timeout은 곧바로 기능 회귀가 아니라 `live readiness 미충족` failure class로 분류한다.

5. **T4 실행** (E2E 존재 시):
   ```powershell
   pytest -o addopts=--capture=sys tests/e2e/ -m e2e -v  # tests/e2e/ 하위만 실행 (dev_runner e2e 마커와 분리)
   python -m pytest -o addopts="--capture=sys -m e2e" tests/e2e/frontend/test_events_event_import_url_modal_e2e.py -v
   # explicit tests/e2e/*.py 파일 1건만 실행할 때는 pytest.ini 기본 addopts의 `not e2e` 배제를 override해야 한다
   # T4 기준: 실서버(localhost:8001) 또는 실브라우저(Playwright) 필요 — TestClient 기반 또는 mock 기반(AsyncMock/MagicMock/patch 다수 사용 + 실서버/Playwright 미사용)은 T3(integration)
   # 주의: T4 체크박스에 명시된 테스트 경로가 tests/e2e/ 밖에 있으면 해당 경로도 추가 실행한다
   ```
   - `tests/e2e/` 디렉토리 실행은 위 표준 명령(`tests/e2e/ -m e2e`)을 유지한다. 아래 marker mismatch 재시도 규칙은 **명시적 `tests/e2e/*.py` 파일 경로**에만 적용한다.
   - 명시적 `tests/e2e/*.py` 파일 경로에서 `0 selected`, `N deselected / 0 selected`가 나오면 먼저 `pytest.ini` 기본 `addopts = ... not e2e` 배제를 override했는지 확인한다. `tests/e2e/frontend/test_events_event_import_url_modal_e2e.py`를 plain file-path로 실행했을 때 `2 deselected / 0 selected`가 나온 사례가 이 케이스다.
   - marker mismatch가 확인되면 `python -m pytest -o addopts="--capture=sys -m e2e" {file} -v`로 **1회만 재시도**한다. 재시도 후에도 `0 selected`/전부 deselect면 `MERGE_TEST_FAILED[selection_contract]`로 즉시 중단한다. `PASS`, `해당 없음`, `SKIP(no-match)`로 기록하지 않는다.
   - 이 재시도 규칙을 `tests/integration/*.py`, `-m http`, `-m http_live`에 재사용하지 않는다. 그 축은 각 marker 계약을 그대로 따른다.

6. **T5 실행** (HTTP 통합):
   ```powershell
   # TestClient 기반 (실서버 무관, 폴링 불필요)
   pytest -o addopts=--capture=sys -m http -v
   # 실서버 직접 호출 (폴링 완료 후 실행됨)
   pytest -o addopts=--capture=sys -m http_live --collect-only -q --no-header
   # collect-only가 selected>0이면 아래 본실행, 0 selected면 SKIP(no-match)
   pytest -o addopts=--capture=sys -m http_live -v
   ```

   | 마커 | 기반 | 실서버 필요 | 폴링 대기 |
   |------|------|------------|----------|
   | `http` | TestClient | 불필요 | 불필요 |
   | `http_live` | httpx + localhost | 필수 | 필수 (2단계 폴링 + 4단계 재확인) |

   - `SKIP(no-match)`는 `pytest -o addopts=--capture=sys -m http_live --collect-only -q --no-header`처럼 **명시적 파일 경로 없이 marker discovery만 수행한 경우**에만 허용한다.
   - `tests/test_process_watch_live_http.py` 같은 **명시적 파일 경로** 또는 `_todo-N.md`의 명시적 테스트명령이 있는데 `0 selected`/전부 deselect가 나오면 `MERGE_TEST_FAILED[selection_contract]`로 즉시 중단한다.
   - `http`는 TestClient 기반이므로 4단계 live readiness 재확인 대상이 아니다. `http_live`만 실서버 readiness 재확인 이후 실행한다.

6. 각 target의 T4/T5 체크박스 `[ ]` → `[x]` 업데이트, Read로 반영 확인

### 4.5단계: reflect 입력용 실패 메타데이터 기록

- merge-test 중 관찰한 실패/경고 중 reflect로 전달할 항목을 정리한다.
- 최소 필드: `실패 명령 | 종료코드 | 카테고리 | 로그근거`
- 카테고리: `frontend-check`, `frontend-build`, `frontend-tsc`, `other`
- 완료 안내 직전에 **성공/미실행 단계도 포함한 실행 근거 표**를 정리한다.
- 최소 필드: `단계 | 실행 명령 | 결과 | 근거 로그`
- 결과 값은 `완료`, `미실행`, `해당 없음`, `실패`만 허용한다.
- 4단계에서 실행한 명령 목록과 결과를 보존하지 못하면 8단계 완료 안내에서 T4/T5 완료를 선언하지 않는다.
- unresolved build/check failure가 남아 있으면 완료 안내에 아래 문구를 **반드시 포함**:
  - `⚠️ unresolved 검증 실패가 있어 /reflect 후속 계획 생성이 필수입니다.`

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

```powershell
# 원본 프로젝트 루트에서 실행
foreach ($target in $merge_targets) {
  if (git status --porcelain) {
    Write-Host "❌ ROOT_DIRTY_BEFORE_REMOVE: main 워크트리 dirty 상태 감지"
    Write-Host "  → unrelated dirty를 흡수할 수 있으므로 자동 add/commit cleanup은 금지합니다."
    Write-Host "  → plan 소유 파일만 exact-add whitelist로 정리하거나 수동 확인 후 재실행하세요."
    exit 1
  }
  $dirtyFiles = git -C $target.worktree status --porcelain
  if ($dirtyFiles) {
    Write-Host "❌ WORKTREE_DIRTY_BEFORE_REMOVE: 미커밋 변경 감지 — 자동 커밋 금지: $($target.worktree)"
    Write-Host $dirtyFiles
    Write-Host "  → worktree 소유 변경을 먼저 명시적으로 정리한 뒤 다시 실행하세요."
    exit 1
  }
  # lock 해제 후 제거 (implement 스킬이 lock을 걸었을 경우 대비)
  git worktree unlock $target.worktree 2>$null  # lock 없는 경우 무시
  git worktree remove $target.worktree --force
  git branch -D $target.branch
}
```

각 target 헤더에서 아래 줄 Edit으로 제거:
```
> branch: {target.branch}
> worktree: {target.worktree}
> worktree-owner: {parent_plan_path}
```

- `Phase Z` 체크박스는 worktree unlock/remove, branch 삭제, header 메타 제거가 끝난 뒤에만 `[x]`로 변경한다.
- `main merge 시도`, `root dirty stash/apply (if needed)`, `T4/T5`, `worktree unlock/remove`, `branch 삭제`, `header meta 제거` 중 하나라도 남아 있으면 `Phase Z`는 완료가 아니다.

### 6단계: 상태 전이 #2

각 target 헤더 + 푸터를 `구현완료`로 업데이트:

```markdown
> 상태: 구현완료
> 반영일시: {MERGE_APPLIED_AT}   ← 2단계에서 이미 기록됨, 여기서 재확인만
> 머지커밋: {MERGE_HASH} ← 2단계에서 이미 기록됨, 여기서 재확인만
> 진행률: N/N (100%)
...
*상태: 구현완료 | 진행률: N/N (100%)*
```

`반영일시`와 `머지커밋`은 2단계에서 이미 삽입되어 있으므로 중복 추가하지 않는다.

### 7단계: /done 실행 (완료 처리)

머지 + T4/T5 완료 후, `/done` 스킬의 SKILL.md를 읽고 **1~8단계를 동일하게** 직접 실행한다.

- plan/archive 이동은 문서 위치 규칙 기반 경로(`{plan경로}`/`{archive경로}`)를 그대로 따른다.
- 커밋은 `commit "message"` 스크립트만 사용하고, `git commit` 직접 실행을 금지한다.
- 완료 안내 문구는 `/done`의 고정 안내(회고 안내 + 최근 검증 실패 Q4 금지 문구)를 그대로 출력한다.

### 8단계: 완료 안내

```
부모 묶음 머지 + 통합테스트 + 완료처리 완료

parent: {parent_plan_path}
대상: {merge_targets_count}건
머지: {target.branch 목록} → main ✅

실행 근거:
| 단계 | 실행 명령 | 결과 | 근거 로그 |
|------|-----------|------|-----------|
| 머지 | `git merge {target.branch} --no-ff ...` | {완료/실패} | {merge hash 또는 오류 로그} |
| T4 | `{pytest e2e 명령}` | {완료/미실행/해당 없음/실패} | {선택된 테스트/로그} |
| T5-http | `pytest -o addopts=--capture=sys -m http -v` | {완료/미실행/해당 없음/실패} | {로그} |
| T5-http_live | `pytest -o addopts=--capture=sys -m http_live -v` | {완료/미실행/해당 없음/실패} | {로그} |
| 정리 | `git worktree remove ...`, `git branch -D ...` | {완료/실패} | {정리 로그} |

T4/T5 완료 표기는 위 실행 근거 표에 실제 실행 명령과 결과가 있을 때만 사용한다.
`merge`, `broad pytest`, `collect-only`만 수행한 상태를 `merge-test 완료` 또는 `T4/T5 완료`로 보고하면 안 된다.
미실행 단계는 실패가 아니라 `미실행`으로 명시한다.
정리: worktree/branch 일괄 삭제 완료 ✅
상태: 구현완료 → archive

회고가 필요하면 /reflect를 실행하세요.
(우려점, 유사 문제, 리팩토링, 미발견 오류를 분석하고 필요시 계획서를 생성합니다)
최근 검증 실패가 있었다면 실패 명령/종료코드 표를 먼저 작성하고 Q4 해당 없음 판정을 금지하세요.
```

## T4/T5 스킵 규칙

포함 조건 미충족 시 Phase 자체를 plan에서 생략 가능 (체크박스 없이).

조건 충족인데 해당 없음 처리하려면 → 블록쿼트로 사유 기재 (체크박스 금지):
```
> T4 E2E 해당 없음: {구체적 사유}
> T5 HTTP 해당 없음: {구체적 사유}
```

**금지**: "단위 테스트로 커버됨" 같은 자의적 판단으로 해당 없음 처리.
T4/T5는 단위 테스트와 검증 범위가 다르므로 대체 불가.

**Glob 재검증**: merge-test는 T4/T5 스킵 시 1.7단계에서 독립적으로 Glob(`tests/**/*http*` 등)을 실행하여 프로젝트에 해당 유형 테스트 파일이 존재하는지 확인한다. 파일이 존재하면 스킵을 거부하고 TC를 자동 작성하여 실행한다 (중단 없음 — dev-runner 자동 파이프라인 호환).

## worktree 미사용 시

plan에 `> branch:` 필드가 없으면 (main에서 직접 작업):
- 이 스킬을 건너뛰고 바로 `/done` 호출

## 환경

- **cwd**: 반드시 원본 프로젝트 루트 (워크트리 내에서 git merge 금지)
- **루트 브랜치**: 시작 시 non-main이어도 0단계 자동 전환으로 `main` 정규화 후 진행
- **Windows**: 절대경로, PowerShell 전용
