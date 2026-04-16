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

`frontend verify(sync/check/build)`는 `/merge-test`가 sole owner다. implement는 코드 수정과 워크트리 단위 검증까지만 담당하고, 프론트엔드 verify 계열은 main 머지 후 여기서만 실행한다.

## 전제 조건 확인

실행 전 다음 조건을 모두 확인한다:

1. **plan 헤더에 `> branch:` 필드 존재** — 없으면 워크트리 미사용 구현이므로 이 스킬 불필요. `/done` 직접 호출.
2. **plan 상태가 `구현중`** — 다른 상태면 경고 후 중단
3. **모든 구현 체크박스 `[x]` 완료** — 미완료 `[ ]` 항목이 있으면 경고 (T4/T5 체크박스는 제외하고 판단)
4. **원본 프로젝트 루트 브랜치 확인** — `main`이 아니면 0단계 자동 전환 절차(`stash -> checkout -> stash pop`)를 수행
5. **워크트리 소유권 확인** — `> worktree-owner:` 또는 `> 계획서:` 기준 부모 경로가 현재 작업의 부모 계획서와 일치해야 함 (불일치 시 중단)

```
전제 조건 실패 시:
- branch 없음 → "워크트리 미사용 구현입니다. /done을 직접 호출하세요."
- 상태 불일치 → "plan 상태가 {현재상태}입니다. 구현중 상태에서만 실행 가능합니다."
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
- `push`, `list`, `apply`, `drop` 어느 단계든 실패하면 stash ref와 실패 단계를 로그에 남기고 즉시 중단한다.
- 2단계 stash hard stop은 **머지 커밋을 보존한 채 후속 테스트/검증 단계만 중단**하는 의미다. stash 복원 실패를 이유로 `git reset`, `git merge --abort`로 머지를 되돌리지 않는다.

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

**plans 워크트리 도입 프로젝트 (`.worktrees/plans/` 존재 시):**
- plan 파일 자체는 `.worktrees/plans/docs/plan/` 하위에 있음
- `반영일시`/`머지커밋` Edit 대상은 plans 워크트리 내 절대경로 사용
- Edit 후 plans 워크트리에서 `Resolve-DocsCommitRoot` 반환 cwd로 이동하고 `Resolve-DocsCommitCandidates` 반환 파일만 `git add`한 뒤 `git commit -m "chore: {slug} 머지 완료 기록"` + `git push origin plans` 수행
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
$untracked = git ls-files --others --exclude-standard
$collision = $untracked | Where-Object { $branchFiles -contains $_ }
```

- `$collision`이 1개 이상이면 즉시 중단:
  - 로그 prefix: `MERGE_PRECHECK_FAILED[untracked_overwrite]`
  - 충돌 경로를 최대 20개 출력
  - **자동 삭제/자동 이동 금지** (운영자가 수동 정리 후 재시도)
- `$collision`이 0개면 다음 단계로 진행한다.

**루트(main) dirty 처리 — stash-merge-apply:**

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
  Write-Host "[merge-test] stash apply 실행: $stashRef"
  git stash apply $stashRef
  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ STASH_APPLY_FAILED: stash 복원 실패 ($stashRef)"
    Write-Host "  → 머지 커밋은 보존합니다. git reset / git merge --abort로 롤백하지 마세요."
    Write-Host "  → 후속 테스트/검증 단계만 중단합니다."
    exit 1
  }

  git stash drop $stashRef
  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ STASH_DROP_FAILED: stash 정리 실패 ($stashRef)"
    Write-Host "  → 머지 커밋은 보존합니다. 수동으로 stash 목록을 확인하세요."
    Write-Host "  → 후속 테스트/검증 단계만 중단합니다."
    exit 1
  }

  Write-Host "[merge-test] stash apply/drop 완료: $stashRef"
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
3. 현재 대상 + 미처리 대상의 워크트리/브랜치 보존 (사용자가 수동 해결 후 재시도 가능)
4. **이후 단계 전체 중단** — 상태 변경 없음

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

> 실행 순서: restart-api → 헬스체크 폴링 → T4(e2e) → T5(http) → T5(http_live)

1. **서비스 재시작** (`> 대상 프로젝트:` 기반 분기):
   - **monitor-page**: `python "D:/work/project/tools/monitor-page/scripts/browser_workers.py" restart-api`
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
         Write-Host "⚠️ 2분 초과 — 실서버 미응답. 통합테스트를 중단합니다."
         Write-Host "상태: 통합테스트중 (merge-test hard-stop)"
         exit 1
       }
     }
   }
   ```
    - 200 응답 시 즉시 다음 단계로 진행
    - 24회(2분) 초과 시 `exit 1`로 중단 — 상태는 `통합테스트중` 유지

3. **T4 실행 범위 제한 및 재분류 가드**

   - T4 후보는 기본적으로 `tests/e2e/` 하위의 시나리오 파일 기준으로만 평가한다.
   - `tests/**/*e2e*`에서 `tests/e2e/` 밖의 파일이 발견되면:
     - 해당 테스트 파일이 mock 기반(`mock`/`Mock`/`AsyncMock`/`MagicMock` 패턴)인지 읽어서 확인
     - mock 기반이면 **T3**로 재분류(현재 T4 체크리스트는 수정 가이드 반영 후 재정의)

4. **frontend verify 수행** (webapp-testing 스킬):
   ```powershell
   Set-Location "{project_root}\frontend"
   npm run build
   ```
   `npm run check`, `npm run check:watch`, `svelte-kit sync`, `svelte-check`, `vite build`, direct node entrypoint도 같은 경계에 포함된다.
   빌드 실패 시 → 머지 롤백(`git reset --merge HEAD~1`), plan 상태 `구현중`으로 롤백, 워크트리 보존 후 **이후 단계 중단**.

4. **T4 실행** (E2E 존재 시):
   ```powershell
   pytest -m e2e  # 또는 해당 프로젝트 E2E 명령
   ```

5. **T5 실행** (HTTP 통합):
   ```powershell
   # TestClient 기반 (실서버 무관, 폴링 불필요)
   pytest -m http
   # 실서버 직접 호출 (폴링 완료 후 실행됨)
   pytest -m http_live  # TC 없으면 "no tests ran" — 정상
   ```

   | 마커 | 기반 | 실서버 필요 | 폴링 대기 |
   |------|------|------------|----------|
   | `http` | TestClient | 불필요 | 불필요 |
   | `http_live` | httpx + localhost | 필수 | 필수 (2단계 폴링) |

6. 각 target의 T4/T5 체크박스 `[ ]` → `[x]` 업데이트, Read로 반영 확인

### 4.5단계: reflect 입력용 실패 메타데이터 기록

- merge-test 중 관찰한 실패/경고 중 reflect로 전달할 항목을 정리한다.
- 최소 필드: `실패 명령 | 종료코드 | 카테고리 | 로그근거`
- 카테고리: `frontend-check`, `frontend-build`, `frontend-tsc`, `other`
- unresolved build/check failure가 남아 있으면 완료 안내에 아래 문구를 **반드시 포함**:
  - `⚠️ unresolved 검증 실패가 있어 /reflect 후속 계획 생성이 필수입니다.`

**테스트 실패 시:**
```powershell
# 머지 커밋만 되돌리기 (HEAD~1이 머지 커밋)
git reset --merge HEAD~1
```
- plan 상태 롤백: `통합테스트중` → `구현중`
- 현재 대상 + 미처리 대상 워크트리/브랜치 보존 (수정 후 재시도 가능)
- 실패 로그 사용자에게 보고
- **이후 단계 중단**

### 5단계: worktree 정리

배치 대상 전체가 성공한 뒤, worktree/branch를 **한 번에 정리**한다:

```powershell
# 원본 프로젝트 루트에서 실행
foreach ($target in $merge_targets) {
  if (git status --porcelain) {
    Write-Host "⚠️ main 워크트리 dirty 상태 감지: 수동 정리 후 재실행 권장"
    git add .
    & "D:\work\project\tools\common\commit.ps1" "chore: merge-test pre-remove cleanup"
  }
  git worktree unlock $target.worktree
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
T4/T5: {대상별 통과/해당없음} ✅
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
