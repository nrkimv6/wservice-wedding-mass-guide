# Plan 템플릿 — 단일/분리 통합

## ⚠️ 상태헤더 규칙

> 각 템플릿 코드블록의 `>` 블록쿼트를 **정확히** 따를 것. 순서·형식 변경 금지.
> 이 형식 외의 헤더(한줄, 대시 등)는 사용하지 않는다.

---

## 1. 단일 파일 (작업 ≤30개)

plan 문서 **하나에 분석 + TODO를 모두 포함**한다. 별도 파일 생성 안 함.

### 템플릿

```markdown
# {제목}

> 작성일시: YYYY-MM-DD HH:MM
> 기준커밋: <hash | 없음>
> 대상 프로젝트: {project-name | 공통}
> 상태: 초안
> branch:
> worktree:
> worktree-owner:
> <!-- worktree-owner: 단일 경로 또는 쉼표 구분 경로 목록 허용. 첫 항목=primary(생성 소유), 나머지=attached(편승). attach 모드: /implement --attach-worktree <primary-path> -->
> 진행률: 0/N (0%)
> 요약: {증상/불편함 (fix: 필수, feat:/refactor: 선택)} — {핵심 목적/변경 1-2문장}

---

## 개요

{배경 및 목적 설명}

## 기술적 고려사항

- {고려사항}

---

## TODO

### Phase 0: Worktree 준비

0. ☐ **worktree 준비 상태를 문서에 고정** — `/implement` 진입 게이트
   - ☐ `{plan}`: `> branch:`, `> worktree:`, `> worktree-owner:` 슬롯을 유지한다
   - ☐ `{plan}`: blank `> branch:`, `> worktree:`, `> worktree-owner:`는 신규 초기 상태이며 다른 `impl/*` 잔여와 무관하다고 적는다
   - ☐ `{plan}`: `worktree 생성 또는 재개`가 `/implement` 또는 `plan-runner` owner flow임을 적는다
   - ☐ `{plan}`: `worktree cwd 고정` 확인을 별도 하위 작업으로 적는다

### Phase 1: {이름}

1. ☐ **{상위 작업}** — 개념적 단위
   - ☐ `{파일}`: {구체적 변경 내용}
   - ☐ `{파일}`: {구체적 변경 내용}

### Phase 2: {이름}

2. ☐ **{상위 작업}** — 개념적 단위
   - ☐ `{파일}`: {구체적 변경 내용}

### Phase DS: Downstream Sync Evidence (skill/agent/common-doc 변경 시)

DS. ☐ **Downstream Sync Phase** — T4/T5 선행 sync evidence gate
   - ☐ `{wtools 원본 파일}`: wtools commit hash를 기록한다
   - ☐ `{downstream mirror 파일}`: downstream file read-back 결과를 기록한다
   - ☐ `{downstream repo 또는 generated surface}`: downstream commit hash 또는 generated surface read-back 결과를 기록한다
   - ☐ `{plan}`: `downstream sync evidence`가 없으면 `before T4/T5` 조건 미충족으로 보고, T4/T5 체크박스를 만들거나 실행하지 않고 `DOWNSTREAM_SYNC_EVIDENCE_MISSING`으로 중단한다고 적는다

### Phase Z: Post-Merge Cleanup (/merge-test owner)

Z. ☐ **post-merge 정리 확인** — `/merge-test` owner
   - ☐ `{plan}`: `main merge 시도`를 owner step으로 적는다
   - ☐ `{plan}`: `root dirty stash/apply (if needed)`를 owner step으로 적는다
   - ☐ `{plan}`: `T4/T5`, `worktree remove`, `branch remove`, `header meta 제거`를 분리해 적는다

> 예외 경로: `merge resolve`, `stash pop`, `stash-pop resolve`는 정상 체크박스로 만들지 않고 충돌/복원 실패 시 메모로만 남긴다.

---

## 🔴 백엔드/Python 변경 시 — Phase T1~Phase T5, SKILL.md `pytest 강제 Phase 규칙` 적용

Python 수정 포함 시 구현 Phase 뒤에 **T1~T5 테스트 Phase 필수**.
T4/T5 해당 없는 경우: Phase 헤더 유지 + **블록쿼트로 사유만 기재** (`> T4 해당 없음: {사유}`), 체크박스 금지.
규칙 상세·카테고리 테이블 → SKILL.md "🔴 pytest 강제 Phase 규칙" 참조.

---

## 검증 (Python 코드 수정 시 참고 정보)

### 테스트 실행

\```powershell
python -m pytest {테스트 경로} -v
\```

- 기대 결과: {N} passed, 실행시간 < {M}초

### 회귀 확인

\```powershell
python -m pytest {전체 테스트 경로} -v --ignore={신규 테스트}
\```

### 검증 기준

- ☐ 새 테스트 전부 passed
- ☐ 기존 테스트 회귀 없음
- ☐ {프로젝트별 추가 기준}

---

*상태: 초안 | 진행률: 0/N (0%)*
```

### 파일 위치

**프로젝트가 정해진 경우:** `{project}/docs/plan/YYYY-MM-DD_{주제}.md`
**공통/복수 프로젝트:** plan은 CLAUDE.md 문서 위치 규칙의 plan 경로에, **TODO는 각 프로젝트별로 분리 생성**

---

## 2. 분리 (작업 31개+ AND 독립 Phase 묶음 2개+)

대표 문서(분석 + TODO 링크)와 TODO-N 파일(실행용)로 분리한다.
**모든 파일은 `docs/plan/`에 유지한다** — 즉시 archive 하지 않음. `/done`에서 archive.

### 분리 판단 규칙

**🔴 프로젝트 기반 분리 (최우선, 강제):**
- `> 대상 프로젝트:`가 2개+ (쉼표 구분) → **프로젝트별 `_todo-N.md` 강제 분리**
- 각 `_todo-N.md`는 반드시 **단일 프로젝트만** `> 대상 프로젝트:`에 지정
- child(의존성 없는 쪽, 예: wtools)에 낮은 N 부여 → parent(의존하는 쪽, 예: monitor-page)에 높은 N 부여
- parent의 `> 선행조건:`에 child `_todo-N.md` 상대경로 기재
- child=wtools, parent=downstream project이고 child가 skill/agent/common-doc 변경을 담으면, parent의 `> 선행조건:`에는 child `_todo-N.md`와 함께 Downstream Sync Phase의 `downstream sync evidence` 확보를 반영한다.
- child/parent 판단: parent가 child의 함수/모듈을 import하면 parent, 그렇지 않으면 독립
- 독립(상호 참조 없음)이면 `> 선행조건: 없음`, 어느 쪽이든 먼저 실행 가능

**Phase 기반 분리 (프로젝트 분리 후 각 _todo-N 내부에서 재적용):**
- 작업 31개+ AND 상호 의존 없는 Phase 그룹이 2개+ 존재 → 분리
- Phase 간 순차 의존(A의 출력이 B의 입력)이면 같은 파일에 유지
- 테스트 Phase(T1~T5)는 직전 구현 Phase와 같은 파일에 유지
- **단, 프로젝트별 분리와 중첩 분리(`_todo-1a.md`)는 하지 않는다** — 단일 프로젝트당 하나의 `_todo-N.md` 유지

### 대표 문서 템플릿

```markdown
# {제목}

> 작성일시: YYYY-MM-DD HH:MM
> 기준커밋: <hash | 없음>
> 대상 프로젝트: {project-name1, project-name2 | 공통}
> 상태: 초안
> branch:
> worktree:
> worktree-owner:
> 진행률: 0/N (0%)
> 요약: {증상/불편함 (fix: 필수, feat:/refactor: 선택)} — {핵심 목적/변경 1-2문장}
>
> **실행 TODO:**
> - [{project1}: Phase 1~3](./{날짜}_{주제}_todo-1.md) — child, 선행조건 없음
> - [{project2}: Phase 4~6](./{날짜}_{주제}_todo-2.md) — parent, 선행조건: _todo-1.md

---

## 개요

{배경 및 목적 설명}

## 구현 항목

| 우선순위 | 항목 | 설명 | 난이도 |
|:-------:|------|------|:------:|
| P0 | {항목1} | {설명} | 낮음/중간/높음 |

## 기술적 고려사항

- {고려사항}

---

*상태: 초안 | 진행률: 0/N (0%)*
```

### TODO-N 파일 템플릿 (실행용)

같은 폴더에 `_todo-N` 접미사로 생성. 이 파일만 읽으면 바로 작업 가능해야 한다.

```markdown
# {제목} — TODO {N}

> 계획서: [plan](./{날짜}_{주제}.md)
> 대상 프로젝트: {project-name}
> 실행순서: {N}
> 선행조건: {_todo-M.md 상대경로 | 없음}
> branch:
> worktree:
> worktree-owner:
> 테스트명령: {pytest 마커 또는 커맨드 | 기본값}
> 진행률: 0/M (0%)
> 요약: {Phase 범위 — 이 TODO 파일이 담당하는 증상/목적 한 줄 요약}

## Phase 0: Worktree 준비

0. ☐ **worktree 준비 상태를 문서에 고정** — `/implement` 진입 게이트
   - ☐ `{plan}`: `> branch:`, `> worktree:`, `> worktree-owner:` 슬롯을 유지한다
   - ☐ `{plan}`: blank `> branch:`, `> worktree:`, `> worktree-owner:`는 신규 초기 상태이며 다른 `impl/*` 잔여와 무관하다고 적는다
   - ☐ `{plan}`: `worktree 생성 또는 재개`가 `/implement` 또는 `plan-runner` owner flow임을 적는다
   - ☐ `{plan}`: `worktree cwd 고정` 확인을 별도 하위 작업으로 적는다

## Phase 1: {이름}

1. ☐ **{상위 작업}** — 개념적 단위
   - ☐ `{파일}`: {구체적 변경 내용}
   - ☐ `{파일}`: {구체적 변경 내용}

## Phase 2: {이름}

2. ☐ **{상위 작업}** — 개념적 단위
   - ☐ `{파일}`: {구체적 변경 내용}
   - ☐ `{파일}`: {구체적 변경 내용}

## Phase DS: Downstream Sync Evidence (skill/agent/common-doc 변경 시)

DS. ☐ **Downstream Sync Phase** — T4/T5 선행 sync evidence gate
   - ☐ `{wtools 원본 파일}`: wtools commit hash를 기록한다
   - ☐ `{downstream mirror 파일}`: downstream file read-back 결과를 기록한다
   - ☐ `{downstream repo 또는 generated surface}`: downstream commit hash 또는 generated surface read-back 결과를 기록한다
   - ☐ `{plan}`: `downstream sync evidence`가 없으면 `before T4/T5` 조건 미충족으로 보고, T4/T5 체크박스를 만들거나 실행하지 않고 `DOWNSTREAM_SYNC_EVIDENCE_MISSING`으로 중단한다고 적는다

## Phase Z: Post-Merge Cleanup (/merge-test owner)

Z. ☐ **post-merge 정리 확인** — `/merge-test` owner
   - ☐ `{plan}`: `main merge 시도`를 owner step으로 적는다
   - ☐ `{plan}`: `root dirty stash/apply (if needed)`를 owner step으로 적는다
   - ☐ `{plan}`: `T4/T5`, `worktree remove`, `branch remove`, `header meta 제거`를 분리해 적는다

> 예외 경로: `merge resolve`, `stash pop`, `stash-pop resolve`는 정상 체크박스로 만들지 않고 충돌/복원 실패 시 메모로만 남긴다.

---

## 🔴 백엔드/Python 변경 시 — Phase T1~Phase T5, SKILL.md `pytest 강제 Phase 규칙` 적용

Python 수정 포함 시 구현 Phase 뒤에 **T1~T5 테스트 Phase 필수**.
T4/T5 해당 없는 경우: Phase 헤더 유지 + **블록쿼트로 사유만 기재** (`> T4 해당 없음: {사유}`), 체크박스 금지.
규칙 상세·카테고리 테이블 → SKILL.md "🔴 pytest 강제 Phase 규칙" 참조.

---

*상태: 초안 | 진행률: 0/M (0%)* 
```

### 파일 위치

**프로젝트가 정해진 경우:** `{project}/docs/plan/`에 생성
**공통/복수 프로젝트:** plan은 CLAUDE.md 문서 위치 규칙의 plan 경로에, **TODO는 각 프로젝트별로 분리 생성**

---

## 하위 호환

기존 모드 B에서 생성된 `_todo.md` (접미사 번호 없는 단일 TODO) 파일도 계속 인식한다.
- `/implement`, `/done`, `/next` 스킬은 `_todo.md`와 `_todo-N.md` 모두 처리
- `> 계획서:` 링크가 `../archive/`를 가리키는 기존 파일도 정상 동작

---

## 후속 처리

1. `{project}/TODO.md` Pending에 참조 항목 추가:
   ```
   - ☐ **{제목}** — [plan]({상대경로}) (0/N, 0%)
   ```
2. SKILL.md 4단계(wtools/TODO.md 동기화)로 복귀
3. SKILL.md 5.5단계(계획서 커밋)로 복귀
