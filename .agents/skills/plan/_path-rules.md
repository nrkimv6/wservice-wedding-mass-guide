# 문서 경로 해석 규칙

> 이 파일은 스킬/에이전트에서 문서 경로를 결정할 때 참조하는 공통 규칙이다.

## 규칙

문서 경로(plan, archive, DONE, history 등)를 사용할 때는 **현재 프로젝트의 AGENTS.md/CLAUDE.md `문서 위치 규칙` 테이블**을 참조하라.

테이블이 없으면 아래 기본 경로를 사용:

| 용도 | 기본 경로 |
|------|----------|
| 계획 문서 | `docs/plan/` |
| 아카이브 | `docs/archive/` |
| 완료 이력 | `docs/DONE.md` |
| 변경 이력 | `docs/history/` |
| TODO | `TODO.md` |

## wtools 예외

wtools(`common/tools/` 존재)에서는 CLAUDE.md에 `common/docs/plan/`, `common/docs/archive/` 등이 명시되어 있으므로 자연스럽게 해당 경로를 사용하게 된다. 별도 분기 로직 불필요.

### plans 워크트리 커밋 헬퍼

```powershell
function Resolve-DocsCommitRoot {
    param($RepoRoot)

    $planRoot = Get-PlanRoot $RepoRoot
    if ($planRoot -like "*\.worktrees\plans\*") { return "$RepoRoot\.worktrees\plans" }
    return $RepoRoot
}

function Resolve-DocsCommitCandidates {
    param($RepoRoot, $EditedPaths)

    $commitRoot = Resolve-DocsCommitRoot $RepoRoot
    if (-not (Test-Path $commitRoot)) { return @() }

    $allowedRoots = @(
        "docs/plan/",
        "docs/archive/",
        "TODO.md",
        "docs/DONE.md"
    )

    $candidates = foreach ($editedPath in $EditedPaths) {
        $relativePath = $editedPath
        $prefix = "$commitRoot\"
        if ($relativePath.StartsWith($prefix)) { $relativePath = $relativePath.Substring($prefix.Length) }

        foreach ($allowedRoot in $allowedRoots) {
            if ($relativePath -like "$allowedRoot*") {
                $relativePath
                break
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

- `Resolve-DocsCommitRoot` 반환 경로에서만 커밋한다.
- `Resolve-DocsCommitCandidates` 반환 파일만 `git add`한다.
- `git add -A` / `git add .` / `git add docs/`는 plans 워크트리에서도 금지한다.
