# 문서 경로 해석 규칙

> 이 파일은 스킬/에이전트에서 문서 경로를 결정할 때 참조하는 공통 규칙이다.

## 핵심 원칙

- 문서 경로(plan, archive, DONE, history 등)를 사용할 때는 **현재 프로젝트의 AGENTS.md/CLAUDE.md `문서 위치 규칙` 테이블**을 먼저 본다.
- 단, 경로를 실제로 결정할 때는 아래 helper 우선순위를 따른다.
- **plans-aware != plans-only**: plans 워크트리를 지원한다는 뜻이지, 모든 프로젝트가 항상 `.worktrees/plans`를 써야 한다는 뜻이 아니다.
- wtools 공통 문서도 helper 우선순위를 따른다. `.worktrees/plans/docs/*`가 있으면 그 경로가 canonical이고, `common/docs/*`는 fallback이다.

## 경로 해석 우선순위

plan 경로를 정할 때:

1. `PLAN_ROOT` 환경변수
2. `.worktrees/plans/docs/plan/`
3. `common/docs/plan/`
4. `docs/plan/`

archive 경로를 정할 때:

1. `ARCHIVE_ROOT` 환경변수
2. `.worktrees/plans/docs/archive/`
3. `common/docs/archive/`
4. `docs/archive/`

## PowerShell 의사코드

```powershell
function Get-PlanRoot {
    param($RepoRoot)

    if ($env:PLAN_ROOT) { return $env:PLAN_ROOT }
    if (Test-Path "$RepoRoot\.worktrees\plans\docs\plan") { return "$RepoRoot\.worktrees\plans\docs\plan" }
    if (Test-Path "$RepoRoot\common\docs\plan") { return "$RepoRoot\common\docs\plan" }
    return "$RepoRoot\docs\plan"
}

function Get-ArchiveRoot {
    param($RepoRoot)

    if ($env:ARCHIVE_ROOT) { return $env:ARCHIVE_ROOT }
    if (Test-Path "$RepoRoot\.worktrees\plans\docs\archive") { return "$RepoRoot\.worktrees\plans\docs\archive" }
    if (Test-Path "$RepoRoot\common\docs\archive") { return "$RepoRoot\common\docs\archive" }
    return "$RepoRoot\docs\archive"
}

function Resolve-DocsCommitRoot {
    param($RepoRoot)

    $planRoot = Get-PlanRoot $RepoRoot
    if ($planRoot -like "*\.worktrees\plans\*") { return "$RepoRoot\.worktrees\plans" }
    return $RepoRoot
}

function Resolve-DocsCommitCandidates {
    param($RepoRoot, $EditedPaths)

    $commitRoot = (Resolve-DocsCommitRoot $RepoRoot).Replace('\','/').TrimEnd('/')
    if (-not (Test-Path $commitRoot)) { return @() }

    $dirPrefixes = @(
        "docs/plan/",
        "docs/archive/",
        "common/docs/plan/",
        "common/docs/archive/"
    )
    $fileExact = @("TODO.md", "docs/DONE.md")

    $candidates = foreach ($editedPath in $EditedPaths) {
        $norm = $editedPath.Replace('\','/')
        $rel = if ($norm.StartsWith("$commitRoot/", [StringComparison]::OrdinalIgnoreCase)) {
            $norm.Substring($commitRoot.Length + 1)
        } else {
            $norm
        }

        $matched = $false
        foreach ($prefix in $dirPrefixes) {
            if ($rel.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
                $rel
                $matched = $true
                break
            }
        }

        if (-not $matched) {
            foreach ($exact in $fileExact) {
                if ($rel -ieq $exact) {
                    $rel
                    break
                }
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

## 해석 예시

- `wtools root (plans worktree 있음)`: `Get-PlanRoot $RepoRoot` → `$RepoRoot\.worktrees\plans\docs\plan`, `Resolve-DocsCommitRoot $RepoRoot` → `$RepoRoot\.worktrees\plans`
- `wtools root (legacy fallback)`: `Get-PlanRoot $RepoRoot` → `$RepoRoot\common\docs\plan`, `Resolve-DocsCommitRoot $RepoRoot` → `$RepoRoot`
- `orphan project plans worktree`: `Get-PlanRoot $RepoRoot` → `$RepoRoot\.worktrees\plans\docs\plan`, `Resolve-DocsCommitRoot $RepoRoot` → `$RepoRoot\.worktrees\plans`

## CLAUDE.md/AGENTS.md 표와의 관계

- 표는 **후보 경로를 읽는 기준**이고, 실제 선택은 위 helper 우선순위가 먼저다.
- `.worktrees/plans/docs/plan/`이 있으면 그 경로를 사용한다.
- `.worktrees/plans/docs/plan/`이 없고 wtools처럼 `common/docs/plan/`이 있으면 그 경로를 사용한다.
- 둘 다 없으면 기본값 `docs/plan/`으로 내려간다.

## plans 워크트리 커밋 범위

- `Resolve-DocsCommitRoot` 반환 경로에서만 커밋한다.
- `Resolve-DocsCommitCandidates` 반환 파일만 `git add`한다.
- `git add -A` / `git add .` / `git add docs/`는 plans 워크트리에서도 금지한다.
