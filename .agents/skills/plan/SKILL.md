---
name: plan
description: "계획 문서 작성. Use when: 계획해, plan, 아이디어, 기획"
---

# 계획 문서 작성

사용자의 아이디어나 요구사항을 계획 문서로 정리하고, **원자 단위 TODO까지 자동 생성**합니다.

`/plan` 또는 `[$plan](...SKILL.md)`가 직접 들어오면, 현재 턴에서 plan 파일 생성/수정까지 진행한다. direct invocation은 설명-only 모드가 아니며, 프로젝트/범위 정보가 실제로 부족할 때만 짧게 확인 질문을 한다.

## 트리거

- "계획해", "plan", "아이디어", "기획"
- 새로운 기능이나 개선사항을 논의할 때

## 파일 위치

### 프로젝트 경로 해석

**프로젝트 경로 읽기 (`.agents/projects.json` 우선):**
```powershell
$projectConfigPath = "D:\work\project\service\wtools\.agents\projects.json"
if (-not (Test-Path $projectConfigPath)) {
  $projectConfigPath = "D:\work\project\service\wtools\.claude\projects.json"
}
$config = Get-Content $projectConfigPath | ConvertFrom-Json
# 각 프로젝트의 절대경로: $config.projects[].path
```

**경로 규칙**: AGENTS.md `문서 위치 규칙` 테이블을 참조하라. 실제 경로 선택은 [`_path-rules.md`](./_path-rules.md)의 helper 우선순위(`PLAN_ROOT` → `.worktrees/plans/docs/plan` → `docs/plan`)를 먼저 따른다.

**🔴 계획서 생성 위치 분기** — 수정 대상에 따라 올바른 프로젝트에 생성:

| 수정 대상 | 생성 위치 | 예시 |
|----------|----------|------|
| `.claude/skills/`, `.claude/agents/`, 공통 스크립트 | **wtools** `.worktrees/plans/docs/plan/` | 스킬 개선, 에이전트 수정 |
| 특정 프로젝트의 `app/`, `frontend/`, `scripts/` 등 | **해당 프로젝트**의 `docs/plan/` | monitor-page 버그 수정 |
| 복수 프로젝트에 걸친 변경 | **wtools** `.worktrees/plans/docs/plan/` | 공통 인프라 변경 |

외부 프로젝트에서 작업 중이더라도 수정 대상이 스킬/에이전트이면, 사용자에게 "이 계획서는 wtools에 생성해야 합니다"라고 안내하고 wtools 경로에 생성한다.

**wtools 감지**: 현재 디렉토리에 `common/tools/` 폴더 존재 여부로 판단
- **있으면**: wtools 내부 → AGENTS.md의 plan 경로에 공통 계획 저장 + wtools/TODO.md 동기화 **실행**
- **없으면**: 외부 프로젝트 → AGENTS.md의 plan 경로에 저장 + wtools/TODO.md 동기화 **스킵**

문서 root 판단은 위 감지와 별개로 `_path-rules.md` helper를 따른다.

**TODO는 반드시 프로젝트 단위로 생성한다:**

| 대상 | plan 위치 | TODO 위치 |
|------|----------|----------|
| 단일 프로젝트 | AGENTS.md의 plan 경로 | AGENTS.md의 plan 경로 |
| 복수 프로젝트 | AGENTS.md의 plan 경로 | **각 프로젝트별** AGENTS.md의 plan 경로 |
| 공통 (스킬, 설정 등) | AGENTS.md의 plan 경로 | AGENTS.md의 plan 경로 |

파일명: `YYYY-MM-DD_{주제}.md`. 대형 계획 분리 시: `_todo-N.md` 접미사 (N=1,2,...). 기존 `_todo.md` 단일 파일도 하위 호환으로 인식

## 실행 단계

### 1단계: 요구사항 파악 (missing-info일 때만)

프로젝트/범위 정보가 실제로 부족할 때만 사용자에게 다음을 확인:
- 대상 프로젝트 (없으면 전체 공통)
- 구현하고 싶은 기능/개선사항
- 우선순위 (있다면)

`/plan`, exact skill name, `[$plan](...SKILL.md)` 직접 호출 자체를 설명-only 또는 아이디어 토론 모드로 해석하지 않는다. 사용자가 "아이디어만 점검해줘", "문서 쓰지 말고 검토만"처럼 명시한 경우에만 예외로 둔다.

### 2단계: 코드베이스 분석

**반드시 대상 프로젝트의 실제 코드를 읽고** 계획을 세운다:
- 수정 대상 파일의 현재 코드 확인
- 기존 패턴, 컨벤션 파악
- 의존성 및 영향 범위 확인

### 3단계: 계획 문서 작성

계획 문서를 작성한 뒤, 같은 폴더의 **`_template.md`를 Read 도구로 읽고** 적절한 형태(단일/분리)로 출력한다.
- 메타 헤더 작성 시각은 반드시 `> 작성일시: YYYY-MM-DD HH:MM` 형식(분 단위, 로컬 시간)으로 기입한다.
- 메타 헤더에 `> 기준커밋: <hash | 없음>`을 기록한다.
  - 기본값: plan 작성 시점의 `HEAD` short hash
  - 레거시/판단불가: hash를 확정할 수 없으면 `없음`으로 기록

| 형태 | 판단 기준 | 결과물 |
|------|----------|--------|
| **단일** | 작업 30개 이하 | `plan.md` 1개 (분석 + TODO 합본) |
| **분리** | 작업 31개+ AND 독립 Phase 묶음 2개+ | `plan.md` (대표 문서) + `_todo-N.md` 복수 |

**🔴 프로젝트 기반 분리 (강제)**: `> 대상 프로젝트:`가 2개+ (쉼표 구분) → **프로젝트별 `_todo-N.md` 강제 분리** (작업 수와 무관). child(의존성 없는 쪽)에 낮은 N, parent(child를 import하는 쪽)에 높은 N 부여. parent의 `> 선행조건:`에 child `_todo-N.md` 상대경로 자동 기재.

**Phase 기반 분리**: 작업 수가 31개 이상이고, 상호 의존 없는 Phase 그룹이 2개 이상 존재할 때 분리. Phase 간 순차 의존(A의 출력이 B의 입력)이면 같은 파일에 유지.

**실행:** 같은 폴더의 `_template.md`를 **Read 도구로 읽고** 지시에 따른다.

### 3.1단계: `/implement` 대상 plan의 worktree lifecycle 규칙

`/implement`로 실제 실행할 계획서라면, 파일 유형(md/py/ts 등)과 무관하게 아래 규칙을 기본으로 포함한다.

- 메타 헤더에 빈 슬롯이라도 먼저 만든다:
  - `> branch:`
  - `> worktree:`
  - `> worktree-owner:` — 단일 경로 또는 쉼표 구분 경로 목록 허용. 첫 항목=primary(생성 소유), 나머지=attached(편승). attach 모드: `/implement --attach-worktree <primary-path>`
  - 빈 값은 정상 초기 상태다. `/implement`는 이를 기존 worktree 존재나 타 `impl/*` 잔여 신호로 해석하지 않는다.
- TODO 앞단에 `### Phase 0: Worktree 준비`를 넣는다.
  - 이 phase는 **문서 가시성용 gate**다.
  - 실제 worktree 생성과 메타 기록은 `/implement` 또는 `plan-runner` owner flow가 수행한다.
  - 기본 owner step은 `worktree 생성 또는 재개`, `> branch:`/`> worktree:`/`> worktree-owner:` 기록 확인, `worktree cwd 고정`처럼 항상 평가되는 단계로 작성한다.
  - plan 체크박스를 근거로 루트(main)에서 임의 `git checkout`, `git switch`, 수동 worktree 재생성을 지시하지 않는다.
- TODO 마지막에 `### Phase Z: Post-Merge Cleanup (/merge-test owner)`를 넣는다.
  - 이 phase의 체크박스는 `/implement` 완료 판정에 포함하지 않는다.
  - 기본 owner step은 `main merge 시도`, `root dirty stash/apply (if needed)`, `T4/T5`, `worktree remove`, `branch remove`, `header meta 제거`까지를 포함한다.
  - 실제 정리(`git worktree remove`, branch 삭제, header 메타 제거)는 `/merge-test` owner로 남긴다.
  - `merge resolve`, `stash pop`, `stash-pop resolve`는 정상 TODO가 아니라 충돌/복원 실패 시의 예외 blockquote로만 남긴다.

### 4단계: wtools/TODO.md 동기화 (wtools만 해당)

**wtools 감지 조건**: 현재 디렉토리에 `common/tools/` 폴더가 있는지 확인
- **있으면**: wtools 내부 → 아래 동기화 실행
- **없으면**: 외부 프로젝트 → 이 단계 **스킵**

1. **wtools/TODO.md를 Read로 연다**
2. **대상 프로젝트 섹션을 찾는다** (없으면 생성)
3. **항목이 이미 있는지 확인한다**
   - 있으면 스킵 (중복 방지)
   - 없으면 Pending에 새 항목 추가: `- [ ] {제목} — [plan 또는 todo]({경로}) (0/N, 0%)`
4. **"마지막 업데이트" 날짜를 오늘로 Edit**
5. **반드시 Edit 완료 후 다시 Read하여 반영을 확인한다** (Read → Edit → Read 패턴)

### 4.5단계: plan 정합성 검증 (필수)

plan 작성 후, 최종 검증 전에 **코드 대비 기본 검증**을 수행한다.
검증 체크리스트 상세: [_verify-checklist.md](../../../.agents/docs/_verify-checklist.md)

**최소 검증 항목 (V1 + V2 + V2-S):**
1. **V1. 경로 존재 검증**: plan에 명시된 모든 파일 경로에 대해 Glob/Read로 실제 존재 확인. 존재하지 않는 경로 발견 시 즉시 Edit으로 수정.
2. **V2. 참조 전수 조사**: plan이 변경하려는 주요 함수/변수/키를 Grep으로 검색. plan이 커버하지 않는 참조 파일 발견 시 해당 파일을 plan에 추가.
3. **V2-S. 보안 패턴 전파**: AGENTS.md/CLAUDE.md에 보안 패턴 레지스트리가 있으면, 새 코드에 해당 패턴이 적용되어야 하는지 검증. 예: `subprocess.run`, `os.system`, `exec` 사용 시 안전 실행 패턴/허용 경로 확인.

발견 시 즉시 수정 (Edit) → Read로 수정 확인 후 다음 단계로.

### 5단계: 최종 검증 (필수)

안내 출력 **전에** 아래 5항목을 Read로 확인. 하나라도 실패 시 해당 단계로 돌아가 수정.

1. **plan 파일 존재** — `docs/plan/`에 대표 문서 존재
2. **TODO 체크박스 존재** — 단일: plan 내부에 체크박스. 분리: 각 `_todo-N.md`에 체크박스
3. **분리 시 링크 정합성** — 대표 문서의 `> **실행 TODO:**` 링크가 실제 `_todo-N.md` 파일을 가리킴. 각 `_todo-N.md`의 `> 계획서:` 링크가 대표 문서를 가리킴
4. **프로젝트 TODO.md** — Pending에 plan 링크 항목 존재
5. **wtools/TODO.md** — 해당 프로젝트 섹션에 항목 + 날짜 오늘

### 5.5단계: 계획서 커밋 (자동)

최종 검증 통과 후, 생성/수정된 문서 파일을 자동 커밋한다.
이 단계는 **필수**이며, 사용자 명시 요청이 없어도 생략할 수 없다.
`6단계: 안내`는 커밋 성공 이후에만 출력한다.

**스테이징 대상 (변경된 파일만):**
- AGENTS.md 문서 위치 규칙의 plan/archive 경로의 `*.md` + `TODO.md`, `docs/DONE.md`

**커밋 실행 절차 (반드시 이 순서):**
1. `git status --porcelain` — 변경 파일 목록 확인
2. 화이트리스트 파일만 **개별** `git add` — 파일명 하나씩 명시:
   - `git add "docs/plan/YYYY-MM-DD_foo.md"`
   - `git add "TODO.md"`
   - plans 워크트리에서는 `Resolve-DocsCommitCandidates` 반환값만 add
   - **절대 금지**: `git add .` / `git add -A` / `git add docs/` (디렉토리·글로브 패턴 전체 금지)
3. `git diff --cached --name-only` 결과가 이번 실행의 plan/archive/TODO/DONE 화이트리스트와 **정확히 일치**하는지 검증
4. `git diff --cached --name-status`와 `git status --porcelain` 재확인
   - 비화이트리스트 파일 스테이징, `D`, `R`, `RM`, `??` 비대칭 상태가 보이면 **즉시 중단**
   - `git reset HEAD {해당 파일}`로 일부만 제거하고 계속 진행하지 않는다.
   - 복구는 `전체 unstage -> 원하는 파일만 다시 add`로 처음부터 재구성한다.
5. 커밋 스크립트 실행: `docs: plan {주제}`
6. 커밋 성공 여부 확인: 실패 시 원인 보고 후 재시도하고, 성공 전까지 6단계로 진행하지 않는다.

## 🔴 자동 커밋 안전 규칙

git add 허용 경로 (화이트리스트):
- AGENTS.md 문서 위치 규칙의 plan 경로/**/*.md
- AGENTS.md 문서 위치 규칙의 archive 경로/**/*.md
- `TODO.md`, `docs/DONE.md`
- plans 워크트리에서는 `Resolve-DocsCommitRoot`가 가리키는 cwd 기준 `docs/plan/**/*.md`, `docs/archive/**/*.md`, `TODO.md`, `docs/DONE.md`만 허용

git add 금지 경로:
- `app/`, `frontend/`, `scripts/`, `.Codex/`, `tests/` 등 코드 경로

검증 절차:
1. `git status --porcelain`으로 스테이징 전 변경 파일 목록 확인
2. 화이트리스트 경로의 파일만 `git add` — 그 외 경로는 절대 add 금지
3. `git diff --cached --name-only` 결과가 의도한 화이트리스트와 정확히 같아야 한다
4. `git diff --cached --name-status` 또는 `git status --porcelain`에 `D`, `R`, `RM`, `??` 비대칭이 보이면 커밋 중단
5. 화이트리스트 파일이 하나도 없으면 커밋 중단, 사용자에게 보고
6. plans 워크트리 dirty 감지 시, 이번 실행이 수정한 파일만 `Resolve-DocsCommitCandidates` 기준으로 분리해서 커밋

**절대 금지 명령 (에이전트가 절대 사용 금지):**
- `git add .`
- `git add -A`
- `git add docs/` (디렉토리 통째로 add)
- `git add *` (글로브 패턴)

**올바른 add 방법 (파일명 명시):**
- `git add "docs/plan/2026-03-05_foo.md"`
- `git add "TODO.md"`

### 6단계: 안내

```
계획 문서 생성 완료

[단일]
plan: docs/plan/YYYY-MM-DD_{주제}.md (분석 + TODO 포함, N phases, M tasks)

[분리]
plan: docs/plan/YYYY-MM-DD_{주제}.md (대표 문서)
todo-1: docs/plan/YYYY-MM-DD_{주제}_todo-1.md (Phase 1~3, N tasks)
todo-2: docs/plan/YYYY-MM-DD_{주제}_todo-2.md (Phase 4~6, M tasks)

다음 단계:
- 검토 후 수정이 필요하면 말씀해주세요
- 구현을 시작하려면 "다음" 또는 "구현해"라고 말씀해주세요
```

---

## 🔴 pytest 강제 Phase 규칙 (Python/백엔드 한정)

> **auto-impl은 체크박스만 실행한다. 문서 하단 검증 섹션은 무시될 수 있다.**
> 따라서 모든 TC는 반드시 **TODO Phase 체크박스**로 존재해야 한다.

**대상**: Python 코드를 수정하는 모든 plan. 프론트엔드/PS1은 제외.

### 필수 5-Phase 테스트 구조

구현 Phase 뒤에 반드시 아래 5개 Phase를 **체크박스로** 포함한다.
각 TC는 **개별 체크박스** — 묶어서 하나로 쓰기 금지.

| Phase | 내용 | 실행 시점 | 포함 조건 |
|-------|------|----------|----------|
| **T1: TC 작성** | RIGHT-BICEP + CORRECT 기반, 함수별 개별 체크박스 | `/implement` | Python 수정 시 항상 |
| **T2: TC 검증 및 수정** | 실행 → passed 확인 → 실패 수정 → 회귀 확인 | `/implement` | Python 수정 시 항상 |
| **T3: 재현/통합 TC** | mock 최소화, 실제 의존성(git, 파일시스템, 환경변수 등) 사용. 근본 원인 재현 + 수정 검증 | `/implement` (워크트리 OK) | **fix: 필수**, feat: 권장 |
| **T4: E2E 테스트** | mock 기반 end-to-end 흐름 검증 | `/merge-test` | E2E 존재 시 |
| **T5: HTTP 통합** | `METHOD endpoint` 정상/에러 응답 검증. **다른 프로젝트의 API를 통해 간접 실행되는 모듈**(예: plan-runner → monitor-page admin API)은 해당 API 레벨 E2E 필수 | `/merge-test` | API 변경 시, 또는 **API를 통해 간접 실행되는 모듈의 내부 로직 변경 시** |

**T3 규칙 (재현/통합 TC):**
- **fix: plan이면 필수** — 근본 원인을 실제 환경에서 재현하는 TC 1개 이상 + 수정 후 통과 검증
- mock은 **외부 API만** 허용. git, 파일시스템, 환경변수 등 로컬 의존성은 **실물 사용**
- `/implement`에서 T2 직후 실행 (서버 불필요, 워크트리에서 실행 가능)
- **스킵 허용 사유** (매우 제한적): 순수 문서/주석/타입 힌트/설정값 변경만
- **스킵 금지 사유:**
  - "단위 테스트로 커버됨" — mock과 실물은 다르다
  - "내부 함수만 수정" — 내부 함수가 외부 의존성을 쓰면 의미 없음
  - "API 변경 없음" — T3는 API가 아니라 통합 동작 검증

**T4/T5 해당 없음 규칙:**
- **Phase 헤더는 유지**하되, 해당 없는 경우 **블록쿼트로 사유만 기재. 체크박스 생성 금지**:
  `> T4 E2E 해당 없음: {구체적 사유}`
- **체크박스 = 수행할 작업.** 실행하지 않을 항목은 체크박스로 만들지 않는다.
- **금지 사유 (이런 이유로 해당 없음 처리하면 안 됨):**
  - "단위 테스트로 커버됨" — T4/T5는 단위 테스트와 검증 범위가 다르므로 대체 불가
  - "수동 테스트" — T4/T5는 pytest로 자동 실행하는 테스트임
  - "실제 환경 필요" — 워크트리에서 못 돌리는 건 스킵 사유가 아님, `/merge-test`에서 main 머지 후 실행
  - "API 변경 없음" (간접 실행 모듈) — plan-runner처럼 다른 프로젝트 API를 통해 실행되는 모듈은 내부 로직 변경도 API 레벨 결과를 깨뜨릴 수 있음. **반드시 해당 API를 통한 E2E 테스트 포함**
- T4/T5 실행 시점: 워크트리 머지 후 main에서 (`/merge-test` 스킬)
- T5에서 **명시적 테스트 파일 경로**를 적기 전에는 대상 파일의 module-level `pytestmark`를 먼저 확인한다.
- `pytestmark = pytest.mark.http` 파일은 plain `pytest {file} -v` 대신 `python -m pytest -o addopts="--capture=sys" {file} -v` 또는 broad `pytest -o addopts=--capture=sys -m http -v`를 사용한다.
- `pytestmark = pytest.mark.http_live` 파일은 live readiness 이후 `python -m pytest -o addopts="--capture=sys" {file} -m http_live -v` 또는 broad `pytest -o addopts=--capture=sys -m http_live -v`를 사용한다.
- `pytest.ini` 기본 `addopts`에 `not http`/`not http_live`가 있는 프로젝트에서는 file-level marker를 무시한 plain file-path 명령을 적지 않는다.

**🔴 간접 실행 모듈의 T5 규칙 (plan-runner 등):**
- 모듈이 직접 HTTP API를 노출하지 않더라도, **다른 프로젝트의 API를 통해 트리거**되는 경우 T5는 해당 API 레벨 E2E로 작성
- 예: plan-runner 내부 로직 수정 → monitor-page admin API(`POST /api/v1/dev-runner/run`)로 실행 → plan 체크박스 최종 상태 검증
- 이 규칙의 근거: plan-runner T4/T5 파이프라인에서 동일 현상 5회 재발 — 모두 단위 테스트만으로 검증하여 함수 간 계약 불일치를 놓침

**T1 TC 카테고리** (R·B·E 필수, 나머지 해당 시):
- **RIGHT-BICEP**: R(정상), B(경계), I(역), C(교차), E(에러), P(성능)
- **CORRECT**: Co(준수), O(순서), R(범위), Re(참조), E(존재), Ca(기수), T(시간)

**TC 형식**: `- [ ] \`test_{함수명}_{카테고리}_{설명}()\` — {검증 내용}`

**상세 카테고리 설명 및 예시**: `_pytest-reference.md` 참조
**모범 사례**: `quota-stop_todo.md` Phase 4-6

## 원자 작업 기준 (모드 A, B 공통)

| 조건 | 설명 |
|------|------|
| 단일 파일 | 하나의 파일만 수정 (또는 밀접한 2-3개) |
| 명확한 변경 | "무엇을 어떻게 바꾸는지" 한 줄로 설명 가능 |
| 독립 실행 | 같은 Phase 내에서 순서대로 실행하면 됨 |
| 초보 실행 가능 | 코드베이스를 처음 보는 사람도 실행 가능 |

각 원자 작업에 **대상 파일 경로**를 반드시 포함한다.

## 멀티레벨 TODO 구조 (필수)

**모든 TODO는 2레벨 구조로 작성한다:**

```markdown
### Phase N: {Phase 이름}

1. [ ] **{상위 작업}** — 개념적 단위
   - [ ] `{파일경로}`: {구체적 변경 1}
   - [ ] `{파일경로}`: {구체적 변경 2}

2. [ ] **{상위 작업}** — 개념적 단위
   - [ ] `{파일경로}`: {구체적 변경}
```

### 분해 규칙

- **상위**(번호): 기능/개념 단위 → **하위**(대시): 초보 할당 가능한 원자 작업
- **분해 기준**: 파일 2개+, AND 연결, 30분+, 중간 검증 필요 → 하위로 분해
- **하위 원칙**: 한 줄 한 동작 + 파일 경로 필수 + 구체적 내용 + 독립 검증 가능
- **함수 명세** (중간+ 복잡도): 새 함수는 `함수명(파라미터) → 반환값`, 수정은 before/after 요약
- **승격**: 하위 5개 이상이면 별도 Phase로 승격 검토

## 코드블럭 내 체크박스 규칙

**문제**: `/done` 스킬의 체크박스 파싱이 코드블럭/인라인 코드 내 `[ ]`도 미완료로 카운트하여 아카이브 실패

**규칙**: 코드블럭이나 인라인 코드 안에 체크박스 **예시**를 넣을 때는 반드시 유니코드로 치환

| 용도 | 사용 금지 | 사용 필수 |
|------|----------|----------|
| 미완료 예시 | `- [ ]` | `- ☐` (U+2610) |
| 완료 예시 | `- [x]` | `- ☑` (U+2611) 또는 `- [x]` |

**적용 대상**:
- 코드블럭(` ``` `) 안의 TODO/체크박스 예시
- 인라인 코드(`` ` ``) 안의 체크박스 패턴
- 마크다운 테이블 내 예시 코드

**참고**: [2026-02-18_fix-checkbox-in-codeblock.md](../../../.worktrees/plans/docs/archive/2026-02-18_fix-checkbox-in-codeblock.md)

## 문서 상태 & 진행률

단일 상태 필드로 plan 문서의 전체 생명주기를 관리한다:

```
초안 → 검토대기 → 검토완료 → 구현중 → 구현완료
         ↘ 수정필요 → 검토대기 (루프)
         ↘ 보류
```

사용자 스킬 단계(문서 중심)와 런타임 단계(자동 전이)를 분리해 관리한다.
- 사용자 스킬 단계: `초안`, `검토대기`, `검토완료`, `구현중`, `구현완료`, `수정필요`, `보류`
- 런타임 단계: `검증중`, `테스트중`, `머지대기`, `통합테스트중`, `완료`
- legacy alias(`계획중`, `검토필요`)는 문서에 쓰지 않고 각각 `초안`, `검토대기`로 정규화한다.

| 상태 | 의미 | 전이 조건 |
|------|------|----------|
| `초안` | /plan 스킬로 최초 작성됨 | plan 작성 시 자동 |
| `검토대기` | 검토 요청 상태 | 사용자가 검토 요청 시 |
| `수정필요` | 검토 후 변경 필요 | 검토자가 피드백 시 |
| `검토완료` | auto-plan(opus) 보완 완료 | auto-plan 완료 시 자동 |
| `구현중` | 구현 착수됨 | /implement 또는 /next 시 자동 |
| `검증중` | 구현 후 자동 검증 단계 | auto-verify 진입 시 |
| `테스트중` | 테스트 실행 단계 | 테스트 phase 진입 시 |
| `머지대기` | 머지 직전 대기 상태 | verify/test 통과 후 |
| `통합테스트중` | main 머지 후 T4/T5 실행 중 | /merge-test 단계 |
| `구현완료` | 모든 항목 완료 | /done 시 자동 |
| `완료` | archive 처리 완료 | /done archive 완료 시 |
| `보류` | 우선순위 밀림 또는 의존성 대기 | 수동 |

**요약 필드 규칙:**
- 헤더 블록쿼트에 `> 요약: {1-3문장}` 필드를 포함한다
- 이 계획이 왜 필요한지, 핵심 목적을 간결하게 기술
- plan-list 조회 시 테이블에 표시되어 큐 파악에 활용

**진행률 업데이트 규칙:**
- 헤더와 푸터에 `진행률: 완료수/전체 (백분율%)` 표시
- `[x]` 개수를 세어 자동 계산

## 우선순위 기준

| 우선순위 | 기준 |
|:-------:|------|
| P0 | 즉시 실행 가능, 핵심 기능 |
| P1 | 중요하지만 P0 이후 |
| P2 | 있으면 좋은 기능 |
| P3 | 장기 과제 |

## 난이도 기준

| 난이도 | 기준 |
|:-----:|------|
| 낮음 | 1-2시간, 단순 구현 |
| 중간 | 반나절, 여러 파일 수정 |
| 높음 | 하루 이상, 아키텍처 변경 |

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
