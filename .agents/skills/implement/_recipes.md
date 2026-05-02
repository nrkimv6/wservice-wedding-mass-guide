# /implement SKILL.md — Reference Recipes

> 이 파일은 SKILL.md 본문에서 분리한 워크트리/패턴 reference다.
> 상위 스킬: [SKILL.md](./SKILL.md)

## 1.2.B 잔여 워크트리/브랜치 감지 + 소유권 판정

**B. 잔여 워크트리/브랜치 감지:**
- `git worktree list`와 `git branch --list "impl/*"` 결과는 **현재 plan의 재개 가능 여부와 신규 slug 충돌 확인용 내부 근거**로만 사용한다.
- 잔여분이 있으면 소유권을 먼저 판정한다:
  - `{plan경로}/**/*.md`에서 동일 `> branch:`/`> worktree:`를 검색
  - 검색된 파일이 가리키는 부모 계획서(`> 계획서:` 링크 또는 자기 자신)가 `parent_plan_path`와 같으면 **내 잔여분**으로 간주하고 재개 후보로 취급한다.
  - 부모가 다르면 **타 계획서 소유**로 간주하고 자동 삭제/재사용/사용자 노출을 모두 금지한다.
  - **attach 예외**: 사용자가 "attach", "attach-worktree", "붙여서" + 대상 워크트리/plan 경로를 명시 요청한 경우, 대상 워크트리의 primary owner plan이 `{plan경로}/**/*.md` 범위 안에 있으면 타 소유로 판정하지 않고 **Step 1.2.E(attach 모드)**로 분기한다.
- 타 plan 소유 잔여는 `/implement` 책임 밖이며, 목록이나 "정리할까요?" 질문을 사용자 대화에 올리지 않는다.
- 신규 워크트리 생성 전 이름 충돌이 있으면 `{slug}`, `{slug}-2`, `{slug}-3` 순으로 내부 재시도한다.
- 세 후보가 모두 충돌하면 다른 잔여 목록 대신 `"현재 plan worktree 확보 실패"`만 보고하고 중단한다.

## 1.2.C 신규 생성 절차 (stash-checkout-apply-drop)

**C. 값이 비어 있거나 필드가 없으면 (신규):**
- `plan` 템플릿이 만드는 blank `> branch:` / `> worktree:` / `> worktree-owner:`는 기존 worktree 의미가 아니라 **미할당 초기 상태**로 해석한다.

**0. 메인 레포 main 브랜치 확인**: `git rev-parse --abbrev-ref HEAD` 실행
- `main`이면 → 다음 단계로
- `main`이 아니면 → 아래 안전 절차 실행 (기본형 `git stash pop` 금지)
  1. `$timestamp = Get-Date -Format "yyyyMMddHHmmss"`
  2. slug를 즉시 계산할 수 있으면 `$stashTag = "implement/{slug}/$timestamp"`, 아직 확정 전이면 `$stashTag = "implement/root/$timestamp"` 사용
  2.5. 수동 대화형 실행에서는 stash 생성(`git stash push`) 전에 **사용자 확인**을 받는다. (`plan-runner/dev-runner` 등 자동 컨텍스트는 예외)
  3. `git stash push --include-untracked -m $stashTag`
     - 실패 시 즉시 중단 (`IMPL_STASH_PUSH_FAILED`)
  4. `$stashMatches = @(git stash list | Select-String ([regex]::Escape($stashTag)))`
     - 0건 → stash 미생성, `$stashRef = $null`
     - 1건 → `$stashRef = (($stashMatches[0].Line -split ':')[0]).Trim()`
     - 2건 이상 → 즉시 중단 (`IMPL_STASH_REF_DUPLICATE`)
  5. `git checkout main`
     - 실패 시 `$stashRef`가 있으면 `git stash apply "$stashRef"` → 성공 시 `git stash drop "$stashRef"` 복구 시도 후 중단
  6. checkout 성공 후 `$stashRef`가 있으면 `git stash apply "$stashRef"`
     - 실패/충돌 시 즉시 중단 (`IMPL_STASH_APPLY_FAILED`)
  7. `git stash drop "$stashRef"`
     - 실패 시 즉시 중단 (`IMPL_STASH_DROP_FAILED`)
- 자동 전환 후 `git rev-parse --abbrev-ref HEAD` 재확인 결과가 `main`이 아니면 중단

**워크트리 생성 절차:**
1. base slug를 plan 파일명에서 추출 (`YYYY-MM-DD_{slug}.md` → `{slug}`)
2. `{slug}`, `{slug}-2`, `{slug}-3` 후보 중 충돌 없는 첫 값을 `selectedSlug`로 선택
3. `git worktree add .worktrees/impl-{selectedSlug} -b impl/{selectedSlug}` 실행
4. **워크트리 생성 직후 lock 실행** (단일 `--force`로 실수 삭제 방지):
   ```bash
   git worktree lock .worktrees/impl-{selectedSlug} --reason "impl/{selectedSlug} 구현 진행 중"
   ```
   - lock된 워크트리는 `git worktree remove --force` 한 번으로는 삭제 불가 (`--force --force` 필요)
   - lock 실패 시 경고만 출력하고 계속 진행 (안전장치, 필수 중단 조건 아님)
   - lock 실패 경고는 stash 실패와 다르다. stash 관련 단계는 모두 hard stop이다.
5. **워크트리 생성 후 메인 레포 브랜치 재확인**: `git rev-parse --abbrev-ref HEAD`
   - `main`이 아니면 → 워크트리 제거(`git worktree remove .worktrees/impl-{selectedSlug} --force`) + "메인 레포가 main에서 벗어남. 수동 확인 필요." 경고 후 중단
6. plan 헤더에 Edit으로 추가:
   ```
   > branch: impl/{selectedSlug}
   > worktree: .worktrees/impl-{selectedSlug}
   > worktree-owner: {parent_plan_path}
   ```

## 1.2.C 크래시 복구 (worktree-owner 역추적)

**C. 필드가 있으면 (크래시 복구):**
1. 소유권 검증:
   - `> worktree-owner:` 필드가 있으면 값을 **쉼표로 split + trim** 후 `parent_plan_path`가 포함되어 있는지 확인한다 (대소문자 무시, `\`/`/` 정규화). owner set은 쉼표 구분 경로 목록이거나 단일 경로 둘 다 허용한다.
   - 포함되어 있지 않으면 즉시 중단: "다른 부모 계획서 소유 워크트리이므로 사용 금지"
   - 레거시 파일처럼 `> worktree-owner:`가 없으면 `{plan경로}/**/*.md`에서 동일 `branch/worktree` 사용 파일을 검색해 부모를 역추적한다.
   - 역추적 결과 부모가 다르면 즉시 중단.
   - 역추적 결과가 현재 부모와 일치하면 해당 파일에 `> worktree-owner: {parent_plan_path}`를 **append 모드로 보강 기록** → 즉시 커밋: `commit "chore: worktree-owner 기록"`
2. 워크트리 경로가 파일시스템에 존재하는지 확인
3. 존재하면 → 그대로 재개 (cwd를 워크트리로 설정)
4. 존재하지 않으면 → plan에서 `> branch:` + `> worktree:` + `> worktree-owner:` 필드 제거 후 **신규 생성** 흐름으로

## 1.2.E attach 모드

**E. attach 모드 (사용자가 "attach"/"붙여서" + 대상 경로를 명시 요청한 경우만 활성화):**
1. 대상 primary plan(`> worktree:`가 채워진 plan)을 Read하여 `> branch:`/`> worktree:` 값을 가져온다.
2. 현재 attached plan 헤더에 동일 값 기록:
   - `> branch: {primary의 branch 값}`
   - `> worktree: {primary의 worktree 값}`
   - `> worktree-owner: {primary_plan_path}, {current_plan_path}`
3. primary plan의 `> worktree-owner:` 뒤에 현재 plan 경로를 **append** (중복 시 no-op + 경고):
   - 기존 `> worktree-owner: {primary_plan_path}` → `> worktree-owner: {primary_plan_path}, {current_plan_path}`
4. 기록 직후 plans 워크트리에서 `commit "chore: attach {slug} to impl/{primary-slug}"` 실행
   (archive/2026-04-04_worktree-owner-commit-enforcement 정책 연장)
5. 이후 모든 작업의 cwd를 primary 워크트리 경로로 설정한다.

## soft-stop + auto-reroute

1. 현재 leaf 체크박스의 backtick 경로를 절대경로로 해석한다.
2. 해석 결과가 현재 impl worktree 밖이면 direct edit를 멈추고 분류한다.
   - 같은 repo root/main 경로면 `root_dirty_only`로 보고, 현재 impl worktree의 대응 경로에서 계속한다.
   - `.worktrees/plans`, sibling repo, 다른 canonical surface면 `reroute_required`로 보고 대상 repo/worktree를 확보한 뒤 그 위치로 이동한다.
3. reroute가 끝나기 전에는 현재 위치에 dirty를 남기지 않는다. "원본 경로라서 여기서 바로 고친다"는 예외를 두지 않는다.

## 수동 작업 키워드 목록

수동 작업으로 분류되는 키워드 예시 (이 항목들이 포함된 체크박스는 후보에서 제외):
- `육안 확인`, `디자인 일치`, `레이아웃 미관`, `스크롤 확인`, `모바일 확인`
- `직접 확인`, `화면 확인`, `사람이`, `수동으로`, `눈으로`
- 전체 목록: [manual-tasks-format.md](../../common/docs/guide/project-management/manual-tasks-format.md)

**수동이 아닌 것** (제외 금지):
- 스크립트 실행, 빌드 확인, 테스트 실행(T1/T2/T3)
- CLI 명령으로 결과를 확인 가능한 모든 작업

## 반복 패턴 체크 — 강제 적용 상황

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
