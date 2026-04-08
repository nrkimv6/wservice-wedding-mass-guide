# Dumptruck — Gemini 3.1 Pro Oneshot 대용량 분석

> 트리거: 덤프트럭, dumptruck, 아키텍처 초안, 대규모 리팩터, 충돌 의도, 로그 분석
> 조건: 사용자가 명시 요청 시에만 실행 (자동 제안 금지)

## 개요

Gemini 3.1 Pro의 초대용량 컨텍스트(≤2M 토큰)를 **단발(one-shot) 대용량 프롬프트**로 활용하는 전용 실행 경로.
핑퐁 에이전트 루프(Read/Grep/Edit 반복)에서는 Gemini Pro가 **절대 호출되지 않는다**.

## 사전 조건

- 환경변수 `DUMPTRUCK_MODE=1` 설정 필수 (미설정 시 `pick_model(oneshot=True)` RuntimeError)
- 빌더 스크립트 경로: `DUMPTRUCK_BUILDER_PATH` 환경변수 또는 기본값 `scripts/dumptruck_builder.py`
  - **`DUMPTRUCK_BUILDER_PATH`가 미설정이고 기본 경로에 파일이 없으면**: "dumptruck_builder.py를 찾을 수 없습니다. DUMPTRUCK_BUILDER_PATH 환경변수를 설정하거나 monitor-page 프로젝트에서 실행하세요." 에러 출력

## 사용법

### 4종 템플릿

| 템플릿 | 용도 | 예시 |
|--------|------|------|
| `architecture` | 아키텍처 초안, 구조 분석 | 새 모듈 설계, 전체 구조 파악 |
| `refactor` | 대규모 리팩터 가이드 | 모듈 분리, 패턴 전환 |
| `conflict` | 머지 충돌 양측 의도 추론 | 복잡한 충돌 해결 |
| `logdump` | 로그 덤프 분석 | 장애 원인 분석, 에러 패턴 |

### 실행 명령

```powershell
# 환경변수 설정
$env:DUMPTRUCK_MODE = "1"

# 아키텍처 분석
& "D:\work\project\tools\monitor-page\scripts\dumptruck_run.ps1" `
    -Template architecture `
    -Topic "worker-redesign" `
    -Include "app/worker/**", "app/modules/claude_worker/**"

# 리팩터 가이드
& "D:\work\project\tools\monitor-page\scripts\dumptruck_run.ps1" `
    -Template refactor `
    -Topic "service-layer-split" `
    -Include "app/modules/dev_runner/services/**" `
    -Exclude "*.pyc"

# 충돌 의도 추론
& "D:\work\project\tools\monitor-page\scripts\dumptruck_run.ps1" `
    -Template conflict `
    -Topic "merge-auth-refactor" `
    -Include "app/routes/**"

# 로그 분석
& "D:\work\project\tools\monitor-page\scripts\dumptruck_run.ps1" `
    -Template logdump `
    -Topic "worker-crash-0408" `
    -Include "logs/worker_*.log"
```

### 결과물

- 저장 위치: `docs/dumptruck/YYYY-MM-DD_{Topic}.md`
- 활용: 후속 `/plan` 입력 시 참조 자료로 수동 복붙

## Quota 정책

- **주간 사용량 목표**: 1 plan = 1~2 호출 (주 3~5회 이내)
- **80% 이상 경고**: `dumptruck_run.ps1`이 호출 전 quota API 조회, 80% 이상이면 사용자 확인 프롬프트
- **보고 방식**: 호출 성공 후 `POST /api/v1/llm/quota/report` delta 모드 (+10%)
- **절대값 보고 금지**: `weekly_used_pct` 직접 설정이 아닌 `delta_weekly_pct`만 사용

## 금지 사항

- Gemini Pro를 에이전트 루프(Read/Grep/Edit 반복)에서 호출 금지
- `DUMPTRUCK_MODE` 환경변수 없이 `oneshot=True` 호출 금지
- quota delta가 아닌 절대값으로 사용량 보고 금지
