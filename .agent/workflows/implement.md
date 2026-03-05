---
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
        └── archive/
            └── DONE-YYYY-Wnn.md # 주별 아카이브
```

## Workflow

```
plan (아이디어) → TODO (선택/진행) → DONE (완료)
```

### 1단계: plan → TODO 선택

plan 문서에서 구현할 항목 선택 시:

**plan 문서:**
```markdown
## 구현 순서 제안
1. [→TODO] P1: 캘린더 내보내기   ← 선택됨
2. [ ] P2: 지역 필터

*상태: 구현중*
```

**TODO.md:**
```markdown
# TODO

## Pending
- [ ] 캘린더 내보내기 (from: plan/2026-01-06_activity-hub)
```

**경로 해석:**
선택한 작업이 `common/` 폴더 기반 공통 작업이라면 `wtools/TODO.md`를 사용합니다. 그렇지 않은 경우 `projects.json`에서 프로젝트별 경로를 해석합니다.

### 1.5단계: 수동 작업 필터링

다음 조건의 작업은 자동 구현 스텝에서 제외합니다:
- **MANUAL_TASKS.md**: 완전 배제
- 항목 옆에 **`(→ MANUAL_TASKS)`** 태그가 있는 경우 배제
- 테스트, 브라우저, UI, 폰트, 디자인 등의 수동 작업 키워드가 포괄된 경우 

### 2단계: TODO 작업 진행 (TDD 워크플로우)

```markdown
# TODO

## In Progress
- [ ] 캘린더 내보내기 (from: plan/2026-01-06_activity-hub)

## Pending
```

**구현 단계:**
1. 테스트 작성 (RIGHT-BICEP)
2. 코드 작성
3. 기존 테스트 통과 확인
4. 빌드 확인 (`npm run build`)
5. **런타임 및 문법 셀프 검증 (필수):** export 누락 등의 기초적 실수가 없도록 코드의 문법적 무결성을 확인하고, 프론트엔드/백엔드 정상 연동 및 런타임 연결성을 반드시 자체 점검하세요. (성급한 판단 금지)

### 2.5단계: 반복 패턴 체크

코드 반영 시 기존의 검증된 패턴을 준수합니다.

| 종류 | 패턴 | 설명 |
|---|---|---|
| 프론트 | selection Set | 다중 선택에 `Set` 사용하여 불변성 유지 반영 |
| 프론트 | toast store | 알림 처리에 통일된 `toast store` 활용 |
| 프론트 | local state update | 즉각적이고 낙관적인 로컬 리스트 업데이트 |
| 프론트 | 401 cooldown | 401 인증 실패 시 재시도 간 쿨다운 적용 |
| 백엔드 | transaction wrapper | DB 저장 실패에 대비하는 `transaction wrapper` |
| 백엔드 | query optimization | N+1 문제 해소를 위한 최적 조인 설계 |
| 백엔드 | error handling | 표준화된 JSON 에러 응답 활용 |

### 3단계: TODO → DONE 완료

**체크박스 게이트 (가드):**
반드시 plan 문서 위치로 되돌아가서 해당 작업 항목의 `[ ]`를 `[x]` 로 변경한 뒤 다음 항목으로 진행하십시오. `[ ]` → `[x]` 변환을 텍스트 수준에서 확인 후 이동해야만 합니다.

**docs/DONE.md 상단에 추가:**
```markdown
# DONE (최근 5-10개)

- [x] 2025-01-07: 캘린더 내보내기 (plan/2026-01-06_activity-hub)
```

**plan 문서 업데이트:**
```markdown
1. [x] P1: 캘린더 내보내기   ← 완료 반영 완료
```

### 4단계: 아카이브 (20개 초과 시)

docs/DONE.md가 20개 초과하면:
1. 오래된 항목 → `docs/history/DONE-YYYY-MM.md`
2. docs/DONE.md는 최근 20개만 유지

## plan 문서 상태 확장

| 상태 | 설명/전이 조건 |
|------|------|
| `초안` | 내용 구상 단계 |
| `검토대기` | 내용 완성. 확인이 필요 |
| `검토완료` | 피드백 완료 후 작업 시작 전 |
| `구현중` | 일부가 TODO로 이관 혹은 개발 중 |
| `구현완료` | 내용 전부 완료 (`[x]`) |
| `수정필요` | 리뷰 중 발견된 문제 개선 필요 |
| `보류` | 기술적 종속 등으로 스킵 또는 중단. (이러한 상태 전반은 무시) |

## 커밋 규칙

plan, TODO.md, DONE.md 변경도 함께 커밋:

```powershell
commit "feat: 기능 설명"
```

## 주의사항

- 구현 완료 시 빌드 에러 없는지 반드시 확인
- **런타임 및 연결성 셀프 검증:** 프론트엔드 빌드나 런타임 확인 없이 export 누락 같은 기초적인 실수를 남겨두지 않도록, 실제 환경에서의 런타임 무결성을 철저히 체크하세요.
- 포트/프로세스 강제 종료 금지