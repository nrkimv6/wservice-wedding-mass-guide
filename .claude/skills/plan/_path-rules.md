# 문서 경로 해석 규칙

> 이 파일은 스킬/에이전트에서 문서 경로를 결정할 때 참조하는 공통 규칙이다.

## 핵심 원칙: 하드코딩 금지

**절대 금지**: `docs/plan/` 또는 `.worktrees/plans/docs/plan/`을 직접 문자열로 스킬에 하드코딩하지 않는다.  
모든 스킬/에이전트는 아래 **경로 해석 우선순위**를 따라 plan 루트를 결정한다.

## 경로 해석 우선순위 (Get-PlanRoot 로직)

스킬이 plan 경로를 결정해야 할 때 아래 순서로 확인한다:

1. **환경변수 `PLAN_ROOT`** — 설정되어 있으면 무조건 이 값을 사용 (강제 오버라이드)
2. **`.worktrees/plans/docs/plan/` 존재 여부** — 해당 디렉토리가 존재하면 이 경로 사용 (orphan 분리 도입 프로젝트)
3. **`docs/plan/` 존재 여부** — 기본 경로 (orphan 미도입 프로젝트, 하위 호환)

archive 경로도 동일 우선순위 적용 (`Get-ArchiveRoot`):
1. `ARCHIVE_ROOT` 환경변수
2. `.worktrees/plans/docs/archive/`
3. `docs/archive/`

### PowerShell 의사코드 (스킬이 따를 로직)

```powershell
function Get-PlanRoot {
    if ($env:PLAN_ROOT) { return $env:PLAN_ROOT }
    if (Test-Path ".worktrees/plans/docs/plan") { return ".worktrees/plans/docs/plan" }
    return "docs/plan"
}

function Get-ArchiveRoot {
    if ($env:ARCHIVE_ROOT) { return $env:ARCHIVE_ROOT }
    if (Test-Path ".worktrees/plans/docs/archive") { return ".worktrees/plans/docs/archive" }
    return "docs/archive"
}

function Resolve-DocsCommitRoot {
    param($RepoRoot)

    $planRoot = Get-PlanRoot $RepoRoot
    if ($planRoot -like "*\.worktrees\plans\*") { return "$RepoRoot\.worktrees\plans" }
    return $RepoRoot
}

function Resolve-DocsCommitCandidates {
    param($RepoRoot, $EditedPaths)

    # 경로 정규화: Windows 백슬래시 → 슬래시로 통일 후 매칭 (혼용 입력 허용)
    $commitRoot = (Resolve-DocsCommitRoot $RepoRoot).Replace('\','/').TrimEnd('/')
    if (-not (Test-Path $commitRoot)) { return @() }

    $dirPrefixes = @("docs/plan/", "docs/archive/")
    $fileExact   = @("TODO.md", "docs/DONE.md")

    $candidates = foreach ($editedPath in $EditedPaths) {
        $norm = $editedPath.Replace('\','/')
        $rel = if ($norm.StartsWith("$commitRoot/", [StringComparison]::OrdinalIgnoreCase)) {
            $norm.Substring($commitRoot.Length + 1)
        } else { $norm }

        $matched = $false
        foreach ($prefix in $dirPrefixes) {
            if ($rel.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
                $rel; $matched = $true; break
            }
        }
        if (-not $matched) {
            foreach ($exact in $fileExact) {
                if ($rel -ieq $exact) { $rel; break }
            }
        }
    }

    return @($candidates | Sort-Object -Unique)
}

function Test-PlansDirty {
    param($RepoRoot)

    if (-not (Test-Path "$RepoRoot\.worktrees\plans")) { return $false }
    $dirty = git -C "$RepoRoot\.worktrees\plans" status --porcelain
    return [bool]$dirty
}
```

> **주의**: 이것은 Claude가 따라야 할 결정 로직이다. 실제 PowerShell 코드를 실행하는 것이 아니라, "이 규칙에 따라 경로를 결정하라"는 지시이다.

### bash 폴백 (CI/비Windows 환경 한정)

본 레포 운영 환경(Windows + PowerShell)에서는 **PowerShell 함수만 사용**한다. 아래 스니펫은 공통 헬퍼 재사용 목적의 기록용이며, plan 본문 검증/실행 절차에는 사용하지 않는다 (AGENTS 규칙 준수).

```bash
PLANS_DIRTY=$([ -d .worktrees/plans ] && [ -n "$(git -C .worktrees/plans status --porcelain)" ] && echo 1 || echo 0)
```

## impl 워크트리에서 plans 워크트리 접근

impl 워크트리(`.worktrees/impl-{slug}/`)에서 plans 워크트리(`.worktrees/plans/`)에 접근할 때는:
- **상대경로**: `../plans/docs/plan/` (형제 디렉토리)
- **절대경로**: `{RepoRoot}/.worktrees/plans/docs/plan/`

두 경로 모두 정상 동작 확인됨 (P1-5 검증 2026-04-14).

## CLAUDE.md 문서 위치 규칙 표와의 관계

CLAUDE.md의 `## 문서 위치 규칙` 표에 명시된 경로는 현재 프로젝트의 설정을 나타낸다.  
표의 값이 있으면 참조하되, 표가 없거나 `docs/plan/`을 기본값으로 쓰는 경우에는 위 우선순위 로직을 사용한다.

## wtools 예외

wtools(`common/tools/` 존재)에서는 CLAUDE.md에 `common/docs/plan/`, `common/docs/archive/` 등이 명시되어 있으므로 자연스럽게 해당 경로를 사용하게 된다. 별도 분기 로직 불필요.

## plans 워크트리 내부 경로 (orphan 도입 프로젝트)

plans 워크트리 내부에서 git 작업을 할 때:
```bash
# plan 파일 체크박스/헤더 Edit (plans 워크트리 경로 기준)
# git add/commit/push는 plans 워크트리에서 수행
cd .worktrees/plans
git add docs/plan/<파일명>
git commit -m "chore: <plan slug> 헤더/체크박스 갱신"
git push origin plans
```

### plans 워크트리 커밋 범위

- `Resolve-DocsCommitRoot` 반환 경로에서만 커밋한다.
- `Resolve-DocsCommitCandidates` 반환 파일만 `git add`한다.
- `git add -A` / `git add .` / `git add docs/`는 plans 워크트리에서도 금지한다.
