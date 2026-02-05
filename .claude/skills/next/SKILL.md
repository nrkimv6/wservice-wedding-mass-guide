---
name: next
description: "다음 작업 자동 선택 및 즉시 구현. Use when: 뭐 할까, 다음, 시작, next, what's next"
---

# 다음 작업 자동 선택

TODO, plan, 개선 아이디어에서 다음 작업을 찾아 즉시 구현을 시작합니다.

## 작업 소스 스캔 순서

1. **TODO In Progress** - 이미 진행 중인 작업 (최우선)
2. **TODO Pending + Plan 문서** - 동등한 우선순위로 모두 스캔
   - `{project}/TODO.md`의 Pending 항목
   - `common/docs/plan/*.md`의 미완료 항목
   - `{project}/docs/plan/*.md`의 미완료 항목 (프로젝트별 계획)
   - 모든 항목을 분석하여 **가장 중요하고 영향력 있는 작업** 선택
   - 고려 요소: 기능 중요도, 사용자 경험 개선, 기술 부채 해결, 의존성
3. **개선 아이디어** - `common/docs/*improvement*.md` (P0 → P1 순)

## 실행 단계

### 1단계: 작업 소스 스캔

```powershell
# 스캔 대상
$baseDir = "D:\work\project\service\wtools"
$projects = @("activity-hub", "tool-view", "gentle-words", "screenshot-generator", "sacred-hours")
```

**TODO.md 확인:**
- 각 프로젝트의 `TODO.md` 파일 확인
- `## In Progress` 섹션에 항목 있으면 → 해당 작업 선택
- 없으면 `## Pending` 섹션 첫 번째 항목 선택

**Plan 문서 확인:**
- `common/docs/plan/*.md` 파일들 스캔 (공통 계획)
- `{project}/docs/plan/*.md` 파일들 스캔 (프로젝트별 계획)
- `[ ]` 또는 `[→TODO]` 상태인 항목 찾기
- 우선순위(P0 > P1 > P2) 높은 것 선택

**개선 아이디어 확인:**
- `common/docs/*improvement*.md` 파일 스캔
- `완료` 표시 없는 P0 항목 찾기
- 없으면 P1 항목 찾기

### 2단계: 작업 선택 및 출력

선택된 작업 정보 출력:

```
📋 다음 작업 선택됨

소스: {소스 파일}
프로젝트: {프로젝트명}
작업: {작업 내용}
우선순위: {P0/P1/P2}

→ 구현 시작합니다...
```

### 3단계: implement 워크플로우 실행

선택된 작업으로 implement 스킬 로직 실행:

1. **TODO.md 업데이트**
   - Pending → In Progress로 이동
   - plan에서 선택 시: `[→TODO]` 표시

2. **구현**
   - 코드 작성
   - 테스트 (빌드 확인)

3. **완료 처리**
   - TODO.md에서 제거
   - docs/DONE.md에 추가
   - plan 문서 `[x]` 체크

## 선택 우선순위 로직

```
if (TODO In Progress 있음):
    return In Progress 첫 번째 항목
elif (TODO Pending 또는 Plan 문서에 미완료 있음):
    # TODO Pending + Plan 문서를 모두 수집
    # 각 항목의 내용을 분석:
    #   - 기능의 중요도 (핵심 기능 > 부가 기능)
    #   - 사용자 경험 개선 효과
    #   - 다른 작업에 대한 의존성/선행 필요 여부
    #   - 기술 부채 해결 효과
    # 가장 중요하고 영향력 있는 작업 선택
    return AI가 판단한 최적 항목
elif (개선 아이디어에 P0 미완료 있음):
    return P0 첫 번째 항목
elif (개선 아이디어에 P1 미완료 있음):
    return P1 첫 번째 항목
else:
    return "현재 할 일이 없습니다. plan 문서를 작성하거나 TODO를 추가하세요."
```

## 할 일 없을 때

모든 소스에서 작업을 찾지 못하면:

```
✅ 현재 할 일이 없습니다!

다음 중 하나를 해보세요:
1. common/docs/plan/에 새 계획 문서 작성
2. 프로젝트 TODO.md에 작업 추가
3. common/docs/*improvement*.md 검토
```

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
