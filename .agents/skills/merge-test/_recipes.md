# /merge-test SKILL.md --- PowerShell Recipes

> 이 파일은 SKILL.md 본문에서 분리한 PowerShell 의사코드/명령 reference다.
> 상위 스킬: [SKILL.md](./SKILL.md)

## Stash 안전 계약

- stash 생성은 항상 `git stash push --include-untracked -m "{stashTag}"` 형식으로 수행한다.
- `stashTag`는 `merge-test/{scope}/{timestamp}` 형식으로 만든다. `scope`는 `root` 또는 `target.branch`를 사용한다.
- stash 생성 여부는 stdout 문자열이 아니라 `git stash list | Select-String ([regex]::Escape($stashTag))` 결과로만 판정한다.
- 수동 대화형 실행에서는 stash 생성(`git stash push`) 전에 **사용자 확인**을 받는다. (`plan-runner/dev-runner` 등 자동 컨텍스트는 예외)
- 기본형 `git stash pop`은 금지한다. 복원은 명시적 `$stashRef`에 대해서만 `git stash apply "$stashRef"`를 수행한다.
- `apply 성공` 정의: **`git stash apply "$stashRef"` 직후의** `$LASTEXITCODE -eq 0` AND unmerged(`UU|AA|DD`) 0-hit
- `git stash drop "$stashRef"`는 위 `apply 성공` 조건을 만족할 때만 수행한다. (partial apply/충돌 시 drop 금지)
- PowerShell에서 `stash@{n}` literal은 `@{}` 해시 토큰과 충돌하므로, stash ref는 반드시 따옴표로 감싸야 한다 (`"stash@{0}"` 형태).
- `push`, `list`, `apply`, `drop` 어느 단계든 실패하면 stash ref와 실패 단계를 로그에 남기고 관련 plan/todo를 `수정필요` continuation anchor로 남긴 뒤 즉시 중단한다.
- 2단계 stash hard stop은 **머지 커밋을 보존한 채 후속 테스트/검증 단계만 중단**하는 의미다. stash 복원 실패를 이유로 `git reset`, `git merge --abort`로 머지를 되돌리지 않는다.
- `merge --abort`는 merge conflict에만 사용한다. 충돌 마커가 섞인 파일에서 모델이 기계적으로 resolve를 시도하면 정합성이 쉽게 깨지므로, abort 후 clean state + 충돌 파일 목록을 다음 iteration 입력으로 넘기는 방식을 기본 계약으로 둔다.

## drop 실수 시 fsck 복구

`git stash list`에 해당 stash가 없고, 실수로 `git stash drop`까지 실행된 경우에만 아래 `fsck` 경로를 사용한다.

```powershell
# 1) drop된 stash 후보 커밋 해시 추출
$candidates = @(
  git fsck --unreachable --no-reflogs |
    Select-String '^unreachable commit ' |
    ForEach-Object { ($_.Line -split ' ')[2] }
)

# 2) 메시지 확인 (stashTag/merge-test 키워드로 식별)
$candidates | ForEach-Object { git show --no-patch $_ }

# 3) 식별한 커밋을 stash처럼 다시 적용 (ref가 이미 drop된 경우에만)
git stash apply {hash}
```

> 주의: unreachable 객체는 GC로 제거될 수 있으므로, drop 직후에만 복구 성공 가능성이 높다.


## 0단계 루트 브랜치 자동 전환 의사코드


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
     - 실패 시 `$stashRef`가 있으면 `git stash apply "$stashRef"` → `apply 성공 + conflicts 0-hit`일 때만 `git stash drop "$stashRef"`로 복구 시도 후 즉시 중단 (partial apply/충돌 시 drop 금지)
  5. `$stashRef`가 있으면 `git stash apply "$stashRef"`
     - `git stash apply "$stashRef"` 직후 `$applyExit = $LASTEXITCODE`로 캡처
     - `$conflicts = git status --porcelain | Select-String '^(UU|AA|DD) '`
     - `$applyExit -ne 0`이면 자동 해결 금지, 즉시 중단 (`ROOT_STASH_APPLY_FAILED`) + drop 금지 (stash ref 보존)
     - `$conflicts` hit면 `ROOT_STASH_APPLY_PARTIAL` 로그 + stash ref 출력 후 즉시 중단 (drop 금지)
  6. `git stash drop "$stashRef"`
     - `apply 성공 + conflicts 0-hit`일 때만 실행한다.
     - 실패 시 즉시 중단 (`ROOT_STASH_DROP_FAILED`)
  7. `git rev-parse --abbrev-ref HEAD` 재확인
     - `main`이 아니면 즉시 중단

예시 로그:
```
[merge-test] root branch 감지: feature/foo
[merge-test] stash push 실행: merge-test/root/20260415103000
[merge-test] stash ref 확인: "stash@{2}"
[merge-test] checkout main 성공
[merge-test] stash apply 완료: "stash@{2}"
[merge-test] stash drop 완료: "stash@{2}"
[merge-test] root branch 재확인: main
```

## 2단계 stash-merge-selective-restore


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
# owner set이 있으면 머지 커밋 메시지에 slug 목록 포함 (D7)
# 단일 owner: "merge: {target.branch}"
# owner set(2+): "merge: {target.branch} (owners: {slug1}, {slug2}, ...)"
$ownerSet = # worktree-owner 필드를 split하여 각 plan 파일명에서 slug 추출
$ownerSlugs = $ownerSet | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_) -replace '^\d{4}-\d{2}-\d{2}_', '' }
$mergeMsg = if ($ownerSlugs.Count -gt 1) { "merge: $($target.branch) (owners: $($ownerSlugs -join ', '))" } else { "merge: $($target.branch)" }
git merge {target.branch} --no-ff -m $mergeMsg

# attached plan merge-test 시 primary가 이미 머지된 경우 fast-forward 가능:
# git merge --ff-only {target.branch} 후 T4/T5 진행 (delta는 자기 plan 커밋만)

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
    if ($LASTEXITCODE -ne 0) {
      Write-Host "❌ STASH_APPLY_FAILED: stash selective restore 실패 ($stashRef)"
      exit 1
    }
  }
  foreach ($path in $untrackedRestore) {
    git restore --source="$stashRef^3" --worktree -- $path
    if ($LASTEXITCODE -ne 0) {
      Write-Host "❌ STASH_APPLY_FAILED: stash selective restore 실패 ($stashRef)"
      exit 1
    }
  }

  Write-Host "[merge-test] skipped residue는 quarantine diff/log로 기록합니다."

  $restoreExit = $LASTEXITCODE
  $conflicts = git status --porcelain | Select-String '^(UU|AA|DD) '

  if ($restoreExit -ne 0) {
    Write-Host "❌ STASH_APPLY_FAILED: stash selective restore 실패 ($stashRef)"
    Write-Host "  → 머지 커밋은 보존합니다. git reset / git merge --abort로 롤백하지 마세요."
    Write-Host "  → 관련 plan/todo는 수정필요 continuation anchor로 남깁니다."
    Write-Host "  → 후속 테스트/검증 단계만 중단합니다."
    exit 1
  }

  if ($conflicts) {
    Write-Host "❌ STASH_APPLY_PARTIAL: stash restore가 partial apply/충돌로 끝났습니다. drop 금지 ($stashRef)"
    Write-Host "  → 머지 커밋은 보존합니다. git reset / git merge --abort로 롤백하지 마세요."
    Write-Host "  → stash ref를 유지한 채로 다음 iteration에서 충돌 정리/복구를 진행하세요."
    exit 1
  }

  git stash drop "$stashRef"
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


## 4단계 API readiness / live readiness 폴링

2. **API 헬스체크 폴링** (최대 2분, 5초 간격):
   ```powershell
   for ($i = 1; $i -le 24; $i++) {
     try {
       Invoke-WebRequest -UseBasicParsing "http://localhost:8001/api/v1/system/liveness" | Out-Null
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
       Invoke-WebRequest -UseBasicParsing "http://localhost:8001/api/v1/system/liveness" | Out-Null
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


## 4단계 T4/T5 pytest marker 명령

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
   # explicit file-path + file-level http marker
   python -m pytest -o addopts="--capture=sys" tests/test_collect_schedule_api.py -v
   # 실서버 직접 호출 (폴링 완료 후 실행됨)
   pytest -o addopts=--capture=sys -m http_live --collect-only -q --no-header
   # collect-only가 selected>0이면 아래 본실행, 0 selected면 SKIP(no-match)
   pytest -o addopts=--capture=sys -m http_live -v
   # explicit file-path + file-level http_live marker (live readiness 이후)
   python -m pytest -o addopts="--capture=sys" tests/test_process_watch_live_http.py -m http_live -v
   ```

   | 마커 | 기반 | 실서버 필요 | 폴링 대기 |
   |------|------|------------|----------|
   | `http` | TestClient | 불필요 | 불필요 |
   | `http_live` | httpx + localhost | 필수 | 필수 (2단계 폴링 + 4단계 재확인) |

   - 명시적 파일 경로가 `pytestmark = pytest.mark.http`인 경우 plain `pytest {file} -v`를 쓰지 않는다. `pytest.ini` 기본 `addopts`의 `not http` 배제를 피하려면 `python -m pytest -o addopts="--capture=sys" {file} -v`를 사용한다.
   - 명시적 파일 경로가 `pytestmark = pytest.mark.http_live`인 경우에도 plain `pytest {file} -v`를 쓰지 않는다. live readiness를 만족시킨 뒤 `python -m pytest -o addopts="--capture=sys" {file} -m http_live -v`로 실행한다.
   - `SKIP(no-match)`는 `pytest -o addopts=--capture=sys -m http_live --collect-only -q --no-header`처럼 **명시적 파일 경로 없이 marker discovery만 수행한 경우**에만 허용한다.
   - `tests/test_collect_schedule_api.py`, `tests/test_process_watch_live_http.py` 같은 **명시적 파일 경로** 또는 `_todo-N.md`의 명시적 테스트명령이 있는데 `0 selected`/전부 deselect가 나오면 `MERGE_TEST_FAILED[selection_contract]`로 즉시 중단한다. 먼저 file-level marker와 `pytest.ini addopts` 충돌 여부를 확인한다.
   - `http`는 TestClient 기반이므로 4단계 live readiness 재확인 대상이 아니다. `http_live`만 실서버 readiness 재확인 이후 실행한다.

6. 각 target의 T4/T5 체크박스 `[ ]` → `[x]` 업데이트, Read로 반영 확인

