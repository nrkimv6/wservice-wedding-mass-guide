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

## baseline dirty 기록

스킬 시작 직후 1회 실행:

```powershell
# root dirty baseline
$BaseDirty = (git -C $RepoRoot status --short) | ForEach-Object { $_.Substring(3).Trim() }
# plans worktree dirty baseline
$PlansRoot = Join-Path $RepoRoot ".worktrees/plans"
$PlansBaseDirty = (git -C $PlansRoot status --short) | ForEach-Object { $_.Substring(3).Trim() }
# touched paths 초기화
$TouchedPaths = [System.Collections.Generic.HashSet[string]]::new()
```

### touched paths 관리 예시

agent가 파일을 수정/생성/git mv할 때마다 추가:

```powershell
$TouchedPaths.Add("docs/plan/2026-xx-xx_foo.md")   # plan 신규 생성 후
$TouchedPaths.Add("TODO.md")                        # TODO.md 수정 후
$TouchedPaths.Add("docs/DONE.md")                   # DONE.md 수정 후
$TouchedPaths.Add("docs/archive/2026-xx-xx_foo.md") # archive git mv 후
```

| 액션 | 추가 대상 path |
|------|--------------|
| plan 신규 생성 | 생성된 plan path |
| TODO.md 수정 | `TODO.md` |
| docs/DONE.md 수정 | `docs/DONE.md` |
| git mv (archive) | 원본 path + archive destination path |
| review-plan 보정 | 보정된 계획서 path |

### self residual dirty 계산 inline snippet

```powershell
$CurrentDirty = (git -C $RepoRoot status --short) | ForEach-Object { $_.Substring(3).Trim() }
$SelfResidual = $CurrentDirty | Where-Object { $TouchedPaths.Contains($_) }

# whitelist는 candidate classification 전용이다. stage pathspec에는 broad glob을 쓰지 않는다.
$Whitelist = @("TODO.md", "docs/DONE.md")
# plans 워크트리 glob 패턴: docs/plan/*.md, docs/archive/*.md
$InWhitelist  = $SelfResidual | Where-Object { $_ -in $Whitelist -or $_ -like "docs/plan/*.md" -or $_ -like "docs/archive/*.md" }
$OutWhitelist = $SelfResidual | Where-Object { $_ -notin $InWhitelist }

# whitelist 안: exact path set만 stage한다.
$Expected = [string[]]$InWhitelist
foreach ($f in $Expected) { git -C $RepoRoot add -- $f }
$Staged = git -C $RepoRoot diff --cached --name-only
if (@(Compare-Object $Expected $Staged).Count -ne 0) {
  throw "staged mismatch: expected exact path set과 cached set이 다릅니다."
}
if ($Expected) { & commit.ps1 "docs: flush self residual dirty" -Files $Expected }

# whitelist 밖: 최종 보고에 기록 (흐름 차단 없음)
if ($OutWhitelist) { Write-Host "남은 dirty: $($OutWhitelist -join ', ')" }
```

### related-plan dirty 분류 표

| 분류 | 조건 | 자동 처리 |
|------|------|----------|
| `self` | `current dirty ∩ $TouchedPaths` | exact path set만 commit wrapper로 커밋 |
| `related-plan` | 현재 plan 본문, Phase Z, 검증 로그, 직전 `/merge-test` 출력에 등장한 path가 현재 dirty | 관련성 evidence와 exact path set을 기록하고 커밋 |
| `post-merge-owned` | 직전 `impl/post-merge-*` branch, repair commit, final merge commit evidence에 포함된 path가 현재 dirty | repair evidence를 남기고 커밋 |
| `preexisting-unrelated` | baseline dirty였고 현재 plan/검증 evidence와 무관 | 커밋하지 않고 보존 evidence로 보고 |
| `protected-secret` | `.env*`, `credentials.json`, `*.key`, `*.pem`, `secrets/**` | 제품 커밋 금지, fail-fast 또는 별도 보존 보고 |
| `unknown-protected` | protected path인데 owner/evidence 불명 | 보존 branch 또는 명시 보고. 성공 종료 시 dirty 0 또는 보존 evidence 필수 |

`tests/*.py`, `app/*`, `frontend/*`, `scripts/*`는 whitelist에 추가하지 않는다. 이 경로들은 `related-plan dirty` 또는 `post-merge-owned dirty`로 분류될 때만 커밋 대상이 된다.

**broad stage 금지 예시:**
- 금지: `git add -u -- docs/plan`
- 금지: `git add docs/plan/*.md`
- 금지: `git add -A`
- 허용: `$TouchedPaths`와 현재 dirty 교집합에서 계산한 exact path set만 `git add -- <path>` 또는 `commit.ps1 -Files <paths>`로 stage

archive rename pair는 원본 삭제(`docs/plan/foo.md`)와 archive 추가(`docs/archive/foo.md`)를 expected staged set에 함께 넣는다. 기존 dirty plan은 자동 수리 대상이 아니라 baseline dirty로 보존한다.

> mtime/hash 기반 변경 감지는 1차 범위 외. path-level 교집합으로 해결 못 하는 케이스는 후속 plan으로 분리한다.

---

## 세션 plan 목록 추출과 remaining targets 판정

대화 텍스트에서 사용자가 명시한 절대경로/상대 plan 링크만 수집해 session targets를 만든다. sibling `_todo-*`는 대표 plan 본문 링크 또는 같은 stem의 미완료 파일을 확인한 뒤 추가한다.

```powershell
$Mentioned = Select-String -InputObject $ConversationText -Pattern '([A-Za-z]:\\[^\\r\\n`]*docs\\plan\\[^\\r\\n` ]+\\.md|docs/plan/[^\\r\\n` )]+\\.md)' -AllMatches |
  ForEach-Object { $_.Matches.Value } |
  Sort-Object -Unique

$SessionTargets = $Mentioned | Where-Object {
  Test-Path $_ -and -not (Select-String -Path $_ -Pattern '^> 상태:\\s*(완료|폐기)|docs[\\/]archive' -Quiet)
}
```

- `remaining targets = session targets - 완료/폐기/archive`
- global backlog scan은 session targets 산정 이후 참고용으로만 수행한다.
- remaining targets가 0건이면 예시처럼 출력한다:

```text
남은 session target 없음.
참고 backlog: .worktrees/plans/TODO.md에 남은 항목은 사용자가 명시할 때만 진행합니다.
```

global backlog를 보여줄 때는 반드시 `참고 backlog` label을 붙이고, 그 항목을 자동 실행 대상으로 승격하지 않는다.

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

## main+plans dirty 사전 점검 경고 템플릿

```powershell
⚠️ main/plans 워크트리에 미커밋 변경 N건. 화이트리스트 후보와 블랙리스트 후보를 먼저 분리하세요.
화이트리스트: docs/plan/**, docs/archive/**, TODO.md, docs/DONE.md, tests/**/fixtures/**
블랙리스트: .env*, credentials.json, *.key, *.pem, secrets/**
현재 실행이 수정한 파일만 add하세요. 기존 잔존 dirty와 묶어서 커밋하지 마세요.
git -C "$RepoRoot" status --porcelain
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
