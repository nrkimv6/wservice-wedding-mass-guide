---
name: implement
description: "구현 워크플로우 (plan→TODO→DONE). Use when: 구현해, 진행해, 시작해, implement"
---

# 구현 워크플로우

plan → TODO → DONE 흐름으로 작업을 관리합니다.

## 파일 위치

```
wtools/
├── common/docs/plan/           # 아이디어/계획 (전체 공유)
│   └── YYYY-MM-DD_*.md
└── {project}/                  # 각 프로젝트
    ├── TODO.md                 # 진행할 작업
    └── docs/
        ├── DONE.md             # 완료 (최근 20개)
        └── history/
            └── DONE-YYYY-Wnn.md # 주별 아카이브
```

## 워크플로우

```
plan (아이디어) → TODO (선택/진행) → DONE (완료)
```

### 1. plan → TODO 선택

plan 문서에서 구현할 항목 선택 시:

**plan 문서 업데이트:**
```markdown
## 구현 순서 제안
1. [→TODO] P1: 캘린더 내보내기 → {project}/TODO.md   ← 선택됨 + 목적지 표시
2. [ ] P2: 지역 필터
```

**TODO.md에 추가:**
```markdown
# TODO

## In Progress

## Pending
- [ ] 캘린더 내보내기 (from: plan/2026-01-06_activity-hub#P1)
```
> `#P1`처럼 우선순위 태그를 붙여 plan 내 어떤 항목인지 역추적 가능하게 한다.

**plan 상태 및 진행률 변경:**
```markdown
> 상태: 진행 중
> 진행률: 0/3 (0%)
...
*상태: 진행 중 | 진행률: 0/3 (0%)*
```

### 2. TODO 작업 진행

```markdown
# TODO

## In Progress
- [ ] 캘린더 내보내기 (from: plan/2026-01-06_activity-hub)

## Pending
```

### 3. TODO → DONE 완료

**TODO.md에서 제거, docs/DONE.md 상단에 추가:**
```markdown
# DONE (최근 20개)

- [x] 2025-01-07: 캘린더 내보내기 (plan/2026-01-06_activity-hub#P1)
```

**plan 문서 업데이트 (체크 + 진행률):**
```markdown
> 상태: 진행 중
> 진행률: 1/3 (33%)
...
## 구현 순서 제안
1. [x] P1: 캘린더 내보내기   ← 완료
2. [ ] P2: 지역 필터
3. [ ] P2: 알림 설정
...
*상태: 진행 중 | 진행률: 1/3 (33%)*
```
> 항목 완료 시마다 헤더와 푸터의 진행률을 함께 업데이트한다.

### 4. 아카이브 (20개 초과 시)

docs/DONE.md가 20개 초과하면:
1. 오래된 항목 → `docs/history/DONE-YYYY-MM.md`
2. docs/DONE.md는 최근 20개만 유지

## 실행 단계

Claude가 구현 요청 받으면:

1. **plan 확인**
   - `common/docs/plan/`에서 관련 계획 확인
   - 없으면 사용자 요청을 바로 TODO에 추가

2. **TODO.md 업데이트**
   - plan에서 선택 시: `[→TODO]` 표시, plan 상태 "진행 중"
   - TODO.md의 Pending에 추가 (출처 표시)
   - 작업 시작 시 In Progress로 이동

3. **구현** (@implementing-features 스킬 사용)
   - 테스트 작성 (RIGHT-BICEP)
   - 코드 작성
   - 기존 테스트 통과 확인
   - 빌드 확인 (webapp-testing 스킬)

4. **완료 처리**
   - TODO.md에서 항목 제거
   - docs/DONE.md 상단에 날짜와 함께 추가
   - plan 문서 해당 항목 `[x]` 체크

5. **아카이브 확인**
   - docs/DONE.md 20개 초과 시 아카이브

## plan 문서 상태 & 진행률

| 상태 | 의미 |
|------|------|
| `검토 대기` | 아이디어 수집 중 |
| `진행 중` | TODO로 이동된 항목 있음 |
| `완료` | 모든 항목 완료 |

**진행률 계산:** `[x]` 개수 / 전체 체크박스 개수 → 헤더·푸터 동시 업데이트

## 커밋 규칙

plan, TODO.md, DONE.md 변경도 함께 커밋:
```powershell
commit "feat: 기능 구현"
```

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
