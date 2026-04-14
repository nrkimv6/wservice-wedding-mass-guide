---
name: plan-list
description: "계획 문서 목록 조회 및 진행 현황. Use when: 계획 목록, plan list, 진행 현황, 계획 확인"
---

# 계획 문서 목록 조회

계획 문서 목록과 진행 현황을 한눈에 보여줍니다.
plans 워크트리가 dirty인 경우에도 `Test-PlansDirty`는 경고용으로만 사용하고 목록 조회는 계속하되, 현재 실행 수정분과 기존 잔존 변경을 분리해서 봐야 한다는 경고를 표시한다. 에이전트 컨텍스트(`$env:CLAUDE_RUNNER_CONTEXT` 또는 auto-impl/auto-done/plan-runner/dev-runner)면 비차단으로 계속하고, 사람 세션이면 복구 명령이 포함된 경고를 표시한다.

## 트리거

- "계획 목록", "plan list", "진행 현황", "계획 확인"
- 현재 어떤 계획이 있는지 확인할 때

## 실행 단계

### 1단계: plan 문서 스캔

**스캔 대상:**
1. **wtools 감지**: 현재 디렉토리에 `common/` 폴더 존재 여부 확인
   - **있으면**: CLAUDE.md 문서 위치 규칙의 plan 경로도 스캔 (공통 계획)
   - **없으면**: CLAUDE.md 문서 위치 규칙의 plan 경로만 스캔 (기본: `docs/plan/`)

2. **프로젝트별 계획**: `.claude/projects.json`의 각 `{proj.path}/docs/plan/*.md` 또는 `.worktrees/plans/docs/plan/*.md` 파일들 스캔 (모든 15개 프로젝트)

```powershell
# 프로젝트 목록 읽기
$configPath = "D:\work\project\service\wtools\.claude\projects.json"
$config = Get-Content $configPath | ConvertFrom-Json

# wtools 감지
if (Test-Path "common\") {
    # CLAUDE.md 문서 위치 규칙의 plan 경로 스캔
}

# 각 프로젝트의 plan 경로 결정 + 스캔
# _path-rules.md 동적 폴백 적용: .worktrees/plans/docs/plan/ 우선, 없으면 docs/plan/
foreach ($proj in $config.projects) {
    $plansWt = Join-Path $proj.path ".worktrees\plans\docs\plan"
    $planDir = if (Test-Path $plansWt) { $plansWt } else { Join-Path $proj.path "docs\plan" }
    # $planDir\*.md 스캔
}
```

모든 plan 문서에서 다음 헤더 정보를 추출:
- 제목
- 대상 프로젝트
- 상태 (초안 / 검토대기 / 검토완료 / 구현중 / 검증중 / 수정필요 / 테스트중 / 머지대기 / 통합테스트중 / 구현완료 / 완료 / 보류)
- 진행률 (N/M)
- 요약 (`> 요약:` 필드, 없으면 빈칸)

상태 집계 시 사용자 단계와 런타임 단계를 모두 허용한다.
- 사용자 단계: `초안`, `검토대기`, `검토완료`, `구현중`, `구현완료`, `수정필요`, `보류`
- 런타임 단계: `검증중`, `테스트중`, `머지대기`, `통합테스트중`, `완료`

### 2단계: 요약 테이블 출력

```markdown
## 현재 계획 현황

| 문서 | 요약 | 프로젝트 | 상태 | 진행률 |
|------|------|----------|------|--------|
| dark-mode | 전체 앱에 다크모드 토글 추가 | 공통 | 구현중 | 2/5 (40%) |
| calendar-export | 활동 데이터를 ics 파일로 내보내기 | activity-hub | 초안 | 0/3 (0%) |
| ... | ... | ... | ... | ... |

총 N개 계획 (초안: A, 검토대기: B, 검토완료: C, 구현중: D, 검증중: E, 수정필요: F, 테스트중: G, 머지대기: H, 통합테스트중: I, 구현완료: J, 완료: K, 보류: L)
```

### 3단계: 프로젝트별 필터 (선택)

사용자가 특정 프로젝트를 지정하면 해당 프로젝트 plan만 필터링:

```
"activity-hub 계획 목록" → 대상 프로젝트가 activity-hub인 것만 표시
```

### 4단계: 빈 목록 처리

plan 문서가 없으면:

```
현재 진행 중인 계획이 없습니다.
새 계획을 만들려면 "계획해" 또는 "plan"이라고 말씀해주세요.
```

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
