---
name: review-plan
description: "새 계획서 재검토 + expand-todo + 커밋. /reflect 완료 후 자동 호출됨. Use when: 계획서 검토, review-plan, 계획 검토"
---


<!-- script-contract-invariant -->
## Script Contract Invariant

Regex and keyword detections are advisory evidence unless a helper contract explicitly marks them mutation-ready. Use `common\tools\plan-advisory-detect.ps1 -PlanFile <plan> -Json` for Phase IA, DB-Direct, Phase R, and environment-contamination candidates. Review conclusions and plan wording corrections remain AI-owned.
# 계획서 재검토 → 확장 → 커밋

새로 생성된 계획서를 검증하고, Skill 도구로 `/expand-todo`를 호출해 체크리스트를 확장한 뒤 커밋합니다.
`/reflect` 완료 후 자동 호출되거나, 독립적으로 사용할 수 있습니다.

## 트리거

- "계획서 검토", "review-plan", "계획 검토"
- `/reflect` 완료 후 자동 호출 ("조사만" 모드 제외)

## 입력

- **필수**: 계획서 경로 1개 이상 (예: `{plan경로}/2026-03-31_fix-xxx.md`)
- **선택**: reflect 실패 메타데이터 표 (`실패 카테고리/종료코드/처리결과(plan/new|existing)`)

`/reflect`에서 호출 시, reflect가 생성한 계획서 경로 목록이 자동 전달된다.
독립 호출 시: `review-plan {경로}` 형식으로 경로를 직접 지정한다.

### 입력 경로 fallback (키워드 기반)

사용자가 계획서 경로를 직접 지정했는데 1차 탐색 결과가 0건이면, 파일명 기반 wtools 자산 fallback을 적용한다.

1. 사용자 입력 경로를 그대로 시도한다. 절대경로면 그대로, 상대경로면 현재 cwd 기준으로 확인한다.
2. 0건이면 입력 파일명에서 아래 키워드를 정규식으로 매칭한다:
   - 키워드: `-skill`, `_skill`, `skill-`, `-agent`, `_agent`, `agent-`, `commit-`, `commit_`, `expand-todo`, `merge-test`, `review-plan`, `auto-`, `plan-runner`, `dev-runner`
   - 정규식: `/(^|[-_\.])(skill|agent|commit|expand-todo|merge-test|review-plan|auto|plan-runner|dev-runner)([-_\.]|$)/i`
3. 매칭되면 `D:\work\project\service\wtools\.worktrees\plans\docs\plan\{filename}` Glob를 시도한다.
4. 그래도 0건이면 `D:\work\project\service\wtools\.worktrees\plans\docs\archive\{filename}` Glob를 시도한다.
5. fallback으로 발견하면 stdout에 `📁 wtools 자산 키워드 감지 → {경로}에서 발견` 1줄을 남긴다.
6. 모두 0건이면 기존 "파일 없음" 흐름을 유지한다.

## main 기존 수정사항 무시 모드 (사용자 명시 지시 시)

사용자가 "main의 기존 수정사항을 고려하지 말라"고 명시한 경우:

- 실행 지시문(고정): **"상관없는 main 변경 감지는 무시하고, 현재 plan 대상 레포 변경만 처리한다."**
- 루트(main worktree)의 기존 `dirty`/`untracked` 파일은 review-plan 중단 사유로 취급하지 않는다.
- 재검토/expand 판정은 입력된 계획서와 해당 계획서의 수정 대상 범위만 기준으로 수행한다.
- 루트(main)의 기존 수정 파일은 읽기/수정/복구/스테이징 대상에서 제외한다.
- 무시 모드는 "중단 판정 완화"에만 적용되며, 판정 범위를 제외한 동작은 기존 규칙을 유지한다.
- 단, `.git` 보호 규칙과 파괴적 명령 금지 규칙은 그대로 유지한다.

## 실행 단계

### 0단계: necessity revalidation

대상 계획서가 여전히 필요한지 재판정한다.

**판정 기준:**

| 판정 | 조건 | 후속 동작 |
|------|------|----------|
| `keep` | 미해결 증거 + 구체 owner + active plan 미귀속 + 잔여 리스크 | 기존 흐름으로 진행 |
| `narrow` | 일부 항목만 유효 | 유효 항목만 남기고 진행 |
| `attach_existing` | 더 적합한 active plan 존재 | 기존 plan에 귀속 + 현재 plan 닫기 제안 |
| `obsolete` | 이미 흡수됐거나 과잉 생성 | 확장 중단 + 사유 기록 |

**obsolete 세분화**: `resolved-later`(다른 구현에 흡수) / `over-generated`(불필요한 추상 finding)

**`/reflect` 출처 plan 엄격 모드** (파일명에 `_auto` 포함 또는 `> 출처: /reflect에서 자동 생성` 헤더):
아래 4요건 모두 확인 후에만 `keep`:
1. 미해결 증거 (코드 또는 로그)
2. 구체 owner (책임 파일/함수)
3. 기존 active plan에 귀속 불가
4. 잔여 리스크 (사용자 보고만으로 닫을 수 없음)

**결과 기록**: 결과표 `재검토` 열에 판정값 기록.

### 1단계: 계획서 재검토

대상 계획서 각각에 대해 아래 8가지를 검증한다.

**A. side effect 체크:**
- 계획서에 명시된 수정 대상이 다른 모듈/기능에 영향 없는지
- import 참조, 공유 함수를 Grep으로 확인

**B. 목표 ↔ 예상결과 일관성:**
- 계획서의 "문제 → 목표 → 예상결과"가 논리적으로 연결되는지
- 목표 달성이 예상결과로 이어지는지 검증

**C. 기존 plan 중복 체크:**
- 문서 위치 규칙(AGENTS.md/CLAUDE.md)의 plan 경로에 있는 기존 계획서 제목과 비교
- 겹치면 경고 출력 + 기존 plan에 항목 추가 제안 (신규 생성 중단)

**D. reflect 실패 메타데이터 계약 검증:**
- reflect에서 전달된 실패 카테고리/종료코드/처리결과가 재검토 출력까지 보존되는지 확인
- 누락 시 review-plan 결과표에 보강 기록하고, 원인(입력 누락/포맷 불일치) 명시

**E. 로컬 drift 검토:**
- `계획서 수정 이후의 로컬 수정사항`은 **현재 워킹트리의 staged/unstaged 변경만** 대상으로 본다.
- `기준커밋 이후 전체 diff`, 최근 커밋 이력, unrelated main 변경은 로컬 drift 판정 범위에 포함하지 않는다.
- 입력 계획서의 `제목 키워드`, `파일 경로`, `핵심 심볼/모듈명`을 seed로 삼아 겹치는 변경만 검토한다.
- 겹치지 않는 로컬 변경은 review-plan 중단 사유가 아니다.
- 판정은 `영향 없음`, `참조만`, `보정 반영`, `재검토 실패` 중 하나로 기록한다.

**F. 연관 active plan 참조 검토:**
- 문서 위치 규칙의 plan 경로에서 입력 계획서의 `제목 키워드`, `파일 경로`, `핵심 심볼/모듈명` 3축으로 후보를 검색한다.
- active plan은 `초안`, `검토대기`, `검토완료`, `구현중`, `수정필요` 같은 미완료 상태 문서를 뜻한다.
- active plan은 충돌/중복/선행관계만 판정하고, **다른 active plan 본문은 수정하지 않는다.**
- active plan과 겹치면 현재 입력 계획서에 `선행관계`, `범위 제외`, `중복 회피` 중 필요한 문구만 반영한다.
- 검색 결과가 0건이면 `0-hit`와 탐색 seed를 결과표 또는 비고에 남긴다.

**G. archive 참조 검토:**
- 문서 위치 규칙의 archive 경로를 같은 seed(`제목 키워드`, `파일 경로`, `핵심 심볼/모듈명`)로 검색한다.
- archive는 읽기 전용 참조 근거다. **archive 파일은 수정하지 않는다.**
- archive와 현재 계획 방향이 충돌하면 archive는 그대로 두고, 현재 입력 계획서의 기술적 고려사항 또는 TODO 문구를 보정한다.
- 검색 결과가 0건이면 `0-hit`와 탐색 seed를 결과표 또는 비고에 남긴다.

**H. 환경 오염 / 임시 해법 감지:**

계획서 텍스트에서 아래 감지 패턴 또는 키워드 seed를 발견하면 검증을 수행한다.

| 패턴 | 예시 |
|------|------|
| 워크트리 아티팩트 기인 변경 | "worktree build 환경에서 `$env/static/public` export가 비어" |
| 엄격 → 유연 전환으로 에러 우회 | `$env/static/public` → `$env/dynamic/public`, 타입 강제 → `any` |
| fallback/placeholder 신규 추가 | `?? 'placeholder-anon-key'`, `\|\| 'https://placeholder.supabase.co'` |
| 환경 의존성 역전 | 빌드타임 고정값 → 런타임 읽기 (값 검증 타이밍이 뒤로 밀림) |
| 임시 표시 | "임시", "workaround", "빌드 통과용", "TODO: 나중에 교체" |

**키워드 seed**: `임시`, `workaround`, `placeholder`, `빌드 통과용`, `TODO: 나중에`, `$env/dynamic`, `?? '`, `|| '`

감지 시 아래 3단계를 검증한다:
1. **에러 원인 확인**: 이 에러는 프로덕션에서도 발생하는가, 아니면 개발/워크트리 환경에서만 발생하는가?
2. **변경 방향 검증**: 더 엄격한 방식 → 더 유연한 방식으로 전환할 때, 프로덕션에서 새로운 실패 경로가 열리는가?
3. **올바른 대안 확인**: 환경 아티팩트 기인 에러라면 코드 변경이 아니라 환경 설정이나 검증 위치 변경으로 해결해야 한다.

판정:
- `해당 없음`: 감지된 패턴 없음
- `⚠️ 경고`: 환경 아티팩트 기인 변경 감지 → 아래 deterministic bullet을 입력 계획서에 삽입한다:
  - `## 기술적 고려사항` 섹션이 있으면: 섹션 하단에 bullet 1개 추가
  - `## 기술적 고려사항` 섹션이 없으면: `## 기술적 고려사항` 섹션을 새로 생성하고 bullet 추가
  - **삽입 bullet 템플릿**: `- 프로덕션 환경에서 동일 에러 재현 여부를 먼저 확인하고, placeholder/fallback이 런타임 동작을 바꾸지 않는지 검증한다.`
- `🚫 차단`: 임시 해법이 프로덕션에 반영되는 구조 → expand-todo 수행 전에 종료 (계획서 수정 없이는 확장 진행 불가)
  - 차단 메시지에 반드시 포함할 3요소: **감지된 패턴** / **왜 위험한지** (프로덕션에서의 새 실패 경로) / **요구 수정 방향** (환경 설정 변경 또는 검증 위치 이동)

**재검토 실패 시:**
- 해당 계획서 파일은 유지한다. 자동 삭제/재생성하지 않는다.
- 로컬 drift 충돌, related-plan 충돌, 입력 누락 같은 실패 사유를 결과표와 종료 메시지에 그대로 남긴다.
- 현재 입력 계획서에 deterministic한 보정이 이미 반영된 경우, 이후 단계는 그 보정된 파일을 기준으로 판단한다.

### 1.5단계: 헤더 형식 검증 (owner set 허용)

계획서 헤더의 `> worktree-owner:` 필드 검증 시:
- **단일 경로** (기존 형식): 유효
- **쉼표 구분 경로 목록** (attach 모드): 유효 — `path1, path2, path3` 형식. 첫 항목=primary, 나머지=attached
- 포함 여부 기준으로 소유권 확인 (정확히 일치 기준 아님)
- 이 형식이 발견되어도 "형식 오류"로 판정하지 않는다.

### 1.7단계: hedging 자기 검토 (1단계 보정 후)

1단계 재검토에서 in-place 보정(요약/배경/추가 bullet 등)을 **LLM이 직접 작성**한 경우, 그 글에 자기 의심 톤이 남아있는지 점검한다.
expand-todo의 5.4단계와 동일 절차: [../expand-todo/references/hedging-cleanup.md](../expand-todo/references/hedging-cleanup.md).

- 1단계에서 보정 자체가 없었다면 통과(no-op)
- 보정 텍스트에 한해 self-review 수행 — 사용자/이전 author가 작성한 본문은 손대지 않는다

### 1.8단계: skill-edit fence audit (외부 프로젝트 한정)

**발동 조건**: review-plan이 wtools 외 프로젝트(monitor-page 등)에서 호출됐고, plan 본문에 fence 경로 수정 todo가 존재할 때.
wtools 자체에서 호출된 경우 이 단계를 스킵하고 결과표에 `해당 없음` 표시.

#### fence 대상 경로

| 경로 패턴 | 설명 |
|---|---|
| `.claude/skills/**` | Claude 스킬 원본 |
| `.agents/skills/**` | 에이전트 스킬 원본 |
| `.claude/agents/**` | Claude 에이전트 원본 |
| `.gemini/agents/**` | Gemini 에이전트 원본 |
| `.gemini/commands/**` | Gemini 커맨드 원본 |
| `.agent/workflows/**` | 에이전트 워크플로우 원본 |

#### detector 규칙

- **매칭 대상**: 체크박스 라인(`- [ ]`, `- [x]`) 또는 파일 경로 헤더 라인
- **제외**: 코드블록(` ``` `) 내부, 인용(`>`) 라인 — false positive 방지
- **정규식 예시**: `^\s*-\s*\[[ x]\].*\.(claude/skills|agents/skills|claude/agents|gemini/agents|gemini/commands|agent/workflows)/`

#### 처리 옵션

fence 경로 todo가 감지되면 사용자에게 아래 3가지 옵션을 제시한다.

**옵션 1 — 이관:**
- 원본 plan에서 해당 fence todo 라인 제거
- wtools `.worktrees/plans/docs/plan/<date>_<원본-slug>_skill-mirror.md` 신규 생성 (원본 plan cross-reference 포함)
- 원본 plan에 `> 스킬 갱신은 wtools <plan-path>에서 처리 후 sync 대기` placeholder 삽입
- 이관 plan 헤더 필수 필드: `> 원본 plan: <project>/<plan-path>`, `> 출처: review-plan fence audit 이관`, `> 요약:` (원본 fence todo 요약)
- 이관 plan 파일명 규칙:
  - fence 항목이 기존 주제 연장: `<원본-date>_<원본-slug>_skill-mirror.md`
  - fence 항목이 새 주제: `<오늘-date>_<주제>_skill-edit.md`

**옵션 2 — monitor-page mirror 정당화:**
- 사용자 사유를 입력받아 plan 기술적 고려사항에 `프로젝트 한정 mirror modification: <사유>` bullet 추가
- fence audit 결과: `허용: <사유>` 표시
- 사용 예: monitor-page worker target restart 분기처럼 단일 프로젝트 한정 룰이 SKILL.md mirror에 들어가야 하는 경우

**옵션 3 — 차단:**
- review-plan을 `🚫 차단: skill-edit fence` 상태로 종료
- plan 수정 없이 사용자 결정을 대기
- expand-todo 진행 금지

#### 결과표 출력

결과표 헤더에 `fence audit` 컬럼 추가:

| fence audit 값 | 의미 |
|---|---|
| `해당 없음` | wtools 자체 호출 또는 fence 경로 todo 없음 |
| `이관: <wtools-plan>` | 이관 완료, 생성된 wtools plan 경로 |
| `허용: <사유>` | 정당화 완료, 입력된 사유 |
| `🚫 차단` | 차단 상태로 종료 |

`### 검토 근거 및 상세 내역` 섹션에 fence audit 검출 내역(감지된 todo 라인 목록)과 처리 결과를 기록한다.

---

### 2단계: expand-todo Skill 호출

재검토 통과한 각 계획서에 대해 **Skill 도구로 `/expand-todo`를 직접 호출**한다.
expand-todo SKILL.md를 읽어 인라인으로 수행하지 않는다 — Skill 호출 실패 시 인라인 fallback 금지.

**호출 규칙:**
- **인자**: 1단계 재검토에서 in-place 보정이 발생했으면 보정된 파일 절대경로, 보정 없으면 입력 파일 그대로 전달
- **순차 처리**: N개 plan은 순차 호출. 병렬 금지 — Skill 도구는 호출자 컨텍스트에서 동작
- **에러 격리**: 한 plan의 expand 실패/진행 중단이 다음 plan 처리를 막지 않는다
- **fallback 금지**: Skill 호출 실패 사유는 그대로 표면화한다

**결과표 `expand` 칸 기록:**

| 결과 | 기록 |
|------|------|
| 정상 완료 | `✅ {N}개 작업` |
| 이미 확장됨 | `✅ 변경 없음 (이미 확장됨)` |
| 진행 중단/실패 | `❌ {사유}` |

Phase R 자동 삽입, V1~V6 정합성 검증, 5-Phase 테스트 구조 등 모든 expand 규칙은 expand-todo SSOT가 적용한다. review-plan은 이 규칙들을 중복 기재하지 않는다.

### 3단계: 커밋

expand-todo의 5.6단계가 expand 결과를 자체 커밋한다. review-plan의 추가 커밋은 잔여 변경(1단계 보정 bullet 등)이 있을 때만 수행한다.

- 각 `/expand-todo` 호출 후 `git status --porcelain`으로 잔여 변경 확인
  - 비어있으면 커밋 **스킵**
  - 변경이 있으면 아래 절차로 커밋
- plans 워크트리 문서면 `Resolve-DocsCommitRoot` 기준 cwd로 이동해 그 경로에서만 git 작업한다.
- 스테이징은 `Resolve-DocsCommitCandidates` 반환 파일만 사용한다. 일반 docs-only 경로에서도 화이트리스트 파일만 스테이징한다: `{plan경로}/*.md`, `TODO.md`
- `git add .` / `git add -A` 사용 금지 — 화이트리스트 파일만 개별 add
- 커밋 메시지: `docs: review — {계획서 제목 요약}`
- 커밋 스크립트 사용 (git commit 직접 사용 금지)
- race 방지가 필요하면 `commit.ps1 -Files` 또는 `commit.sh --files`로 add+commit을 한 호출에 묶는다.
- push가 필요하면 literal `origin plans`가 아니라 현재 docs commit root가 추적하는 upstream으로만 `git push`한다.
- 커밋 또는 push가 실패하면 non-blocking으로 경고와 복구 명령만 남기고 종료한다.

## 출력 형식

```markdown
## 계획서 재검토 결과

| # | 계획서 | 재검토 | 로컬변경 | 연관 active plan | archive 참조 | 환경오염 | expand | 실패메타데이터 | 비고 |
|---|--------|--------|----------|------------------|-------------|---------|--------|----------------|------|
| 1 | {파일명} | ✅ 통과 | {영향 없음/참조만/보정 반영} | {0-hit/중복 회피/선행관계} | {0-hit/참조 반영} | {해당 없음/⚠️ 경고: {패턴}/🚫 차단: {사유}} | ✅ {N}개 작업 | {카테고리/종료코드/처리결과} | — |
| 2 | {파일명} | ❌ 실패 | {재검토 실패/보정 반영} | {충돌/0-hit} | {참조만/0-hit} | {해당 없음/⚠️ 경고: {패턴}/🚫 차단: {사유}} | — | {있음/없음} | {사유} |

### 검토 근거 및 상세 내역

- **{파일명}**:
  - **내용 정합성**: 목표와 예상 결과의 논리적 일관성 설명
  - **로컬/연관 검토**: 발견된 로컬 drift, 연관 plan 중복/충돌 여부에 대한 구체적인 설명
  - **안전성**: 환경 오염, 임시 해법, 사이드 이펙트 등 우려 사항 (없으면 없다고 명시)
  - **결론**: 최종 통과/수정/반려 이유 요약

구현을 시작하려면 "다음" 또는 "구현해"라고 말씀해주세요.
```

## 주의사항

- **코드 직접 수정 금지** — 계획서 검증과 확장만 수행
- **다른 active plan/archive 무단 수정 금지** — 다른 문서는 수정하지 않는다. 현재 입력 계획서 보정만 허용한다.
- **expand-todo는 Skill 호출 SSOT** — Phase R 자동 삽입, 테스트 Phase, V1~V6 정합성 검증 등 expand 규칙은 Skill 호출이 자동 적용한다. review-plan 본문에 이 규칙들을 중복 기재하지 않는다.
- `.agents` ↔ `.claude` mirror 동시 수정 — review-plan/reflect 변경 시 두 경로 모두 같은 내용으로 적용
- **환경 아티팩트 예시** — H 체크에서 "개발/워크트리 환경에서만 발생"으로 판정되는 대표 사례:
  - 워크트리 `.svelte-kit/ambient.d.ts` 비어있음 (`node_modules` 없어서 svelte-kit sync 미실행)
  - worktree `node_modules` 없음 → `$env/static/public` 타입 미생성 에러
  - CI-only 환경변수 미설정/placeholder (`wrangler.toml [vars]`의 `your-project.supabase.co` 등)

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **커밋**: 커밋 스크립트 필수 (`commit.ps1` 또는 `commit.sh`)
