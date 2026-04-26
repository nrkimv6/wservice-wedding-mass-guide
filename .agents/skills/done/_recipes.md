# /done SKILL.md — Reference Recipes

> 이 파일은 SKILL.md 본문에서 분리한 명령/예시/키워드 reference다.
> 상위 스킬: [SKILL.md](./SKILL.md)

---

## MANUAL_TASKS 분리 절차

### 수동 작업 판단 키워드 전체 목록

- 한국어: `브라우저`, `UI`, `디자인`, `육안`, `시각`, `레이아웃`, `가독성`, `실기기`, `모바일`, `스크린샷`, `스타일`, `색상`, `폰트`
- 영어: `Android`, `iOS`
- **수동이 아닌 것** (CLI/curl/에이전트로 검증 가능):
  - 배포 확인, Firebase Console, Supabase Dashboard, 로그인 테스트
  - E2E 테스트, HTTP 통합 테스트, API 응답 확인 → `auto-test-e2e` 에이전트 전담
  - 스크립트 실행 확인, 빌드 확인, pytest, npm test
- **판별 원칙**: 사람의 눈/판단이 필수인 경우만 수동. CLI로 실행+검증 가능하면 수동 아님

### MANUAL_TASKS.md 신규 생성 템플릿

```markdown
# MANUAL_TASKS

> 이 문서의 항목은 브라우저 테스트, UI 육안 확인 등 CLI로 검증 불가능한 작업입니다.
> Codex는 이 항목을 "/next" 작업 후보에서 제외합니다.

## 미완료

- [ ] {작업 내용} — from: {plan파일명.md}#{항목번호} ({날짜})

## 완료
```

### plan + MANUAL_TASKS.md 예시

plan 문서에서:
```markdown
## 구현 순서
1. [x] P0: API 구현
2. [x] P1: 브라우저에서 UI 레이아웃 확인 (→ MANUAL_TASKS)
3. [x] P2: 다크모드 가독성 검증 (→ MANUAL_TASKS)
```

`{project}/MANUAL_TASKS.md`에:
```markdown
## 미완료

- [ ] 브라우저에서 UI 레이아웃 확인 — from: calendar-plan.md#2 (2026-02-08)
- [ ] 다크모드 가독성 검증 — from: calendar-plan.md#3 (2026-02-08)
```

---

## archive 이동 (`git mv` 분기)

### orphan 도입 프로젝트 — plans 워크트리 내에서 git mv

```powershell
Set-Location ".worktrees/plans"
git mv -f "docs/plan/YYYY-MM-DD_{주제}_todo.md" "docs/archive/YYYY-MM-DD_{주제}_todo.md"
# 원본 plan이 docs/plan/ 에 남아있으면 함께 이동 (이미 archive에 있으면 스킵)
# git mv -f "docs/plan/YYYY-MM-DD_{주제}.md" "docs/archive/YYYY-MM-DD_{주제}.md"
git add "docs/archive/YYYY-MM-DD_{주제}_todo.md"
# plans 워크트리에서는 Resolve-DocsCommitCandidates 반환 파일만 add한다.
# git add -A는 사용하지 않는다.
git commit -m "chore: archive {주제}"
# push는 literal 'origin plans' 대신 현재 docs commit root가 추적하는 upstream으로만 수행한다.
git push
Set-Location -  # 이전 경로로 복귀
```

### orphan 미도입 프로젝트 — 기존 방식

```powershell
git mv -f "{plan루트}/YYYY-MM-DD_{주제}_todo.md" "{archive루트}/YYYY-MM-DD_{주제}_todo.md"
git add "{archive루트}/YYYY-MM-DD_{주제}_todo.md"

# FORBIDDEN: Move-Item / Remove-Item — 히스토리 유실
# Move-Item -Path "{plan경로}" -Destination "{archive경로}"
# Remove-Item -Path "{plan경로}" -Force
```

---

## plans/TODO.md 동기화

plans/TODO.md에서 동일 제목 key 1건만 찾아 정규화한다 (0건/2건 이상이면 즉시 중단).

```powershell
Set-Location "D:\work\project\service\wtools\.worktrees\plans"
rg -n "{plan title seed}" TODO.md
# TODO.md 라인 수정(checkbox/link/progress)
git add TODO.md
& "D:\work\project\tools\common\commit.ps1" "docs: sync plans TODO — mark {plan title seed} done"
```

완료된 plan이 archive로 이동된 경우: `[x]` + `[archive](docs/archive/...)` + `(N/N, 100%)`

---

## version-bump + CHANGELOG

### 실행 명령

```powershell
# 1순위: PowerShell
& "D:\work\project\tools\common\version-bump.ps1" -BumpType <patch|minor|major> -ProjectDir (Get-Location).Path
# 2순위: bash
bash "/d/work/project/tools/common/version-bump.sh" "<patch|minor|major>" "."
```

### CHANGELOG.md 항목 예시 (Keep a Changelog 형식)

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

## plans dirty 사전 점검 경고 템플릿

```powershell
⚠️ plans 워크트리에 미커밋 변경 N건. main cwd의 git status에서는 보이지 않습니다.
현재 실행이 수정한 파일만 add하세요. 기존 잔존 dirty와 묶어서 커밋하지 마세요.
Set-Location "$RepoRoot\.worktrees\plans"
git status --porcelain
git add <파일명>   # 이번 실행이 수정한 파일만 개별 add
& "D:\work\project\tools\common\commit.ps1" "docs: plans manual recovery"
# push는 literal 'origin plans' 대신 현재 docs commit root가 추적하는 upstream으로만 수행한다.
git push
```

---

## 커밋 fallback 명령

> 글로벌 CLAUDE.md "커밋 방법" 섹션과 중복. 아래는 빠른 참조용.

```bash
# FORBIDDEN
git commit
git commit -m "..."
git commit -am "..."
git commit --amend

# REQUIRED — 아래 순서로 시도
# 1순위: bash에서 powershell.exe 경유 (bash 환경에서 가장 안정적)
powershell.exe -Command "Set-Location '{레포경로}'; & 'D:\work\project\tools\common\commit.ps1' 'message'"

# 2순위: bash에서 commit.sh (반드시 cd 먼저 — commit.sh 내부 git이 현재 디렉토리 기준)
cd "/d/work/project/service/wtools/{project}" && bash "/d/work/project/tools/common/commit.sh" "message"
```

**중요**: commit.sh 실패 시 `git commit` 직접 사용 절대 금지. powershell.exe 방식으로 전환.
