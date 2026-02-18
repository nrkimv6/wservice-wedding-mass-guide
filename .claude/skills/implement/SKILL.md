---
name: implement
description: "구현 워크플로우 (plan→TODO→DONE). Use when: 구현해, 진행해, 시작해, implement"
---

# 구현 워크플로우

plan → TODO → DONE 흐름으로 작업을 관리합니다.

## 파일 위치

**프로젝트 경로 해석:**
```powershell
$configPath = "D:\work\project\service\wtools\.claude\projects.json"
$config = Get-Content $configPath | ConvertFrom-Json
# 각 프로젝트의 절대경로: $config.projects[].path
```

**wtools 감지**: 현재 디렉토리에 `common/` 폴더 존재 여부로 판단

```
wtools 내부:
├── common/docs/plan/           # 아이디어/계획 (전체 공유, wtools만)
│   └── YYYY-MM-DD_*.md
└── {proj.path}/                # 각 프로젝트 (절대경로)
    ├── TODO.md                 # 진행할 작업
    └── docs/
        ├── DONE.md             # 완료 (최근 20개)
        └── history/
            └── DONE-YYYY-Wnn.md # 주별 아카이브

외부 프로젝트:
{proj.path}/
├── docs/plan/                  # 프로젝트별 계획
├── TODO.md
└── docs/DONE.md
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
> 상태: 구현중
> 진행률: 0/3 (0%)
...
*상태: 구현중 | 진행률: 0/3 (0%)*
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
> 상태: 구현중
> 진행률: 1/3 (33%)
...
## 구현 순서 제안
1. [x] P1: 캘린더 내보내기   ← 완료
2. [ ] P2: 지역 필터
3. [ ] P2: 알림 설정
...
*상태: 구현중 | 진행률: 1/3 (33%)*
```
> 항목 완료 시마다 헤더와 푸터의 진행률을 함께 업데이트한다.

### 4. 완료 → `/done` 스킬

구현이 끝나면 `/done` 스킬을 호출합니다. done 스킬이 아래를 모두 처리:
- TODO→DONE 이동, plan [x] 체크, plan 아카이브
- DONE.md 5개 초과 시 아카이브
- wtools/TODO.md 동기화, 완료 검증, 커밋

## 실행 단계

Claude가 구현 요청 받으면:

1. **plan 확인**
   - `common/docs/plan/`에서 관련 계획 확인
   - 없으면 사용자 요청을 바로 TODO에 추가

1.5. **수동 작업 필터링 (TODO/plan 스캔 시 공통)**
   - 다음 항목은 작업 후보에서 **완전 제외**하고, 사용자에게 **언급하지 않는다**:
     - `MANUAL_TASKS.md` 파일 내 항목
     - `(→ MANUAL_TASKS)` 태그가 붙은 항목
     - 수동 작업 키워드가 포함된 항목 (`수동 검증`, `수동`, `브라우저 테스트 필요` 등)
     - 키워드 전체 목록: [manual-tasks-format.md](../../common/docs/guide/project-management/manual-tasks-format.md) 참조
   - 후보 목록 출력 시에도 수동 항목은 표시하지 않는다

2. **TODO.md 업데이트**
   - plan에서 선택 시: `[→TODO]` 표시, plan 상태 "구현중"
   - TODO.md의 Pending에 추가 (출처 표시)
   - 작업 시작 시 In Progress로 이동

3. **wtools/TODO.md 동기화 (wtools만 해당)**
   - **wtools 감지 조건**: 현재 디렉토리에 `common/` 폴더가 있는지 확인
     - **있으면**: wtools 내부 → 아래 동기화 실행
     - **없으면**: 외부 프로젝트 → 이 단계 **스킵**
   - wtools/TODO.md 열기
   - 해당 프로젝트 섹션 찾기
   - 변경된 항목 반영 (Pending → In Progress 이동, 진행률 갱신)
   - "마지막 업데이트" 날짜를 오늘로 갱신

4. **구현** (@implementing-features 스킬 사용)
   - 테스트 작성 (RIGHT-BICEP)
   - 코드 작성
   - 기존 테스트 통과 확인
   - 빌드 확인 (webapp-testing 스킬)

5. **완료 처리 → `/done` 스킬 호출**
   - 구현 완료 후 반드시 `/done` 스킬을 호출하여 후처리 실행
   - done 스킬이 처리: plan 체크, TODO→DONE, 아카이브, wtools/TODO.md 동기화, 검증, 커밋

## plan 문서 상태 & 진행률

| 상태 | 의미 |
|------|------|
| `초안` | /plan 스킬로 최초 작성됨 |
| `검토대기` | 검토 요청 상태 |
| `검토완료` | auto-plan 보완 완료 |
| `구현중` | 구현 착수됨 |
| `구현완료` | 모든 항목 완료 |
| `수정필요` | 검토 후 변경 필요 |
| `보류` | 우선순위 밀림 |

**진행률 계산:** `[x]` 개수 / 전체 체크박스 개수 → 헤더·푸터 동시 업데이트

## 커밋 규칙

plan, TODO.md, DONE.md 변경도 함께 커밋:
```powershell
commit "feat: 기능 구현"
```

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
