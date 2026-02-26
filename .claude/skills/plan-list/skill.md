---
name: plan-list
description: "계획 문서 목록 조회 및 진행 현황. Use when: 계획 목록, plan list, 진행 현황, 계획 확인"
---

# 계획 문서 목록 조회

`common/docs/plan/`의 계획 문서 목록과 진행 현황을 한눈에 보여줍니다.

## 트리거

- "계획 목록", "plan list", "진행 현황", "계획 확인"
- 현재 어떤 계획이 있는지 확인할 때

## 실행 단계

### 1단계: plan 문서 스캔

**스캔 대상:**
1. **wtools 감지**: 현재 디렉토리에 `common/` 폴더 존재 여부 확인
   - **있으면**: `common/docs/plan/*.md` 파일들도 스캔 (공통 계획)
   - **없으면**: 현재 프로젝트의 `docs/plan/*.md`만 스캔

2. **프로젝트별 계획**: `.claude/projects.json`의 각 `{proj.path}/docs/plan/*.md` 파일들 스캔 (모든 15개 프로젝트)

```powershell
# 프로젝트 목록 읽기
$configPath = "D:\work\project\service\wtools\.claude\projects.json"
$config = Get-Content $configPath | ConvertFrom-Json

# wtools 감지
if (Test-Path "common\") {
    # common/docs/plan/*.md 스캔
}

# 각 프로젝트의 docs/plan/*.md 스캔
foreach ($proj in $config.projects) {
    # $proj.path\docs\plan\*.md 스캔
}
```

모든 plan 문서에서 다음 헤더 정보를 추출:
- 제목
- 대상 프로젝트
- 상태 (초안 / 검토대기 / 검토완료 / 구현중 / 구현완료 / 수정필요 / 보류)
- 진행률 (N/M)
- 요약 (`> 요약:` 필드, 없으면 빈칸)

### 2단계: 요약 테이블 출력

```markdown
## 현재 계획 현황

| 문서 | 요약 | 프로젝트 | 상태 | 진행률 |
|------|------|----------|------|--------|
| dark-mode | 전체 앱에 다크모드 토글 추가 | 공통 | 구현중 | 2/5 (40%) |
| calendar-export | 활동 데이터를 ics 파일로 내보내기 | activity-hub | 초안 | 0/3 (0%) |
| ... | ... | ... | ... | ... |

총 N개 계획 (초안: A, 검토대기: B, 검토완료: C, 구현중: D, 구현완료: E, 수정필요: F, 보류: G)
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
