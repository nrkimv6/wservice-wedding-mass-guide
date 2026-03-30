$input = [Console]::In.ReadToEnd() | ConvertFrom-Json

# 무한 루프 방지: 이미 hook으로 인해 계속 중인 상태면 정지 허용
if ($input.stop_hook_active -eq $true) {
    exit 0
}

# CLAUDE.md 문서 위치 규칙에 따라 plan 디렉토리 결정
if (Test-Path (Join-Path $input.cwd "common\tools")) {
    $planDir = Join-Path $input.cwd "common\docs\plan"
} else {
    $planDir = Join-Path $input.cwd "docs\plan"
}
$unarchived = @()

if (Test-Path $planDir) {
    Get-ChildItem $planDir -Filter "*.md" | Where-Object { $_.Name -notmatch '^_' } | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        $unchecked = ([regex]::Matches($content, '\[ \]')).Count
        $checked = ([regex]::Matches($content, '\[x\]')).Count
        # [ ] 0개 + [x] 1개 이상 = 완료됐지만 아카이브 안 됨
        if ($unchecked -eq 0 -and $checked -gt 0) {
            $unarchived += $_.Name
        }
    }
}

if ($unarchived.Count -gt 0) {
    $names = $unarchived -join ", "
    @{
        decision = "block"
        reason = "완료된 plan이 아카이브되지 않았습니다: $names. /done 스킬을 실행하세요."
    } | ConvertTo-Json -Compress
    exit 0
}

# 조건 미충족 → 정지 허용
exit 0
