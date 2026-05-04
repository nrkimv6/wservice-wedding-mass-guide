---
name: reflect
description: "구현 후 회고 — 우려점·유사문제·리팩토링·미발견오류·지시불이행·agent 교정작업 제안 추출 → 계획서 생성 → review-plan 자동 수행. Use when: 리뷰, reflect, 회고, 검토, 우려점"
---

# 컨텍스트 리뷰

구현 완료 후 현재 대화 컨텍스트를 분석하여 6가지 관점에서 후속 작업을 추출하고, 필요시 계획서를 자동 생성합니다.

## 트리거

- "리뷰", "review", "검토", "우려점"
- `/done` 완료 후 안내에서 연결

## 입력

- **필수**: 없음 (현재 대화 컨텍스트에서 자동 추출)
- **선택**: 파일경로, plan경로 (특정 범위 지정 시)
- **모드 인자**: `조사만` / `조사` — 1~2단계만 실행, `/review-plan` 자동 호출 스킵
  - 예: `/reflect 조사만`, `/reflect 조사`

### 입력 precedence (대상 고정)

- **1순위**: 사용자가 plan/파일 경로를 명시한 경우 그 경로를 primary 범위로 사용한다.
- **2순위**: 직전 완료/머지(`/merge-test`, `/done`)의 출력/메타에 나타난 plan/archive 경로를 primary anchor로 고정한다.
- **3순위**: 위 둘이 없고 현재 대화에서 plan 링크가 **단 1개**면 그 plan을 anchor로 삼는다.
- 후보가 2개 이상이면 자동 선택하지 말고 사용자에게 explicit plan 경로를 요청한다. unrelated active/dirty plan은 primary 범위에서 제외하고, 필요 시 "연관 plan 참고"로만 분류한다.

## 세션 targets / continue 계약 (필수)

- 사용자가 같은 세션에 plan 경로를 2개 이상 명시하면, 그 목록은 **session targets**로 고정한다.
- "남은 항목" 응답도 같은 **session targets** 기준으로만 산정한다.
  - global backlog(`.worktrees/plans/TODO.md`)는 후속 plan 생성이나 remaining target 계산에 자동 합류시키지 않는다.
  - global backlog가 필요하면 `참고 backlog`로 분리해 보여주고, 사용자가 명시하지 않으면 자동 reroute/진행하지 않는다.
  - 타 프로젝트 대상 plan을 발견해도 사용자가 명시하지 않으면 자동 reroute하지 않고 참고 후보로만 둔다.
- 사용자가 명시한 경로가 대표 plan(`*_todo-N.md` 아님)이고 `> **실행 TODO:**` 링크 또는 sibling `_todo-*.md`가 있으면, 미완료 `_todo` 전부를 session targets에 포함한 것으로 해석한다.
  - 일부 `_todo`만 끝났다면 `현재 target 회고 완료, 남은 target N개`로만 출력하고 대표 plan 전체 완료로 말하지 않는다.
- 현재 target에 대한 회고/계획서 생성이 끝났더라도 **remaining targets**가 있으면 전체 완료로 말하지 않는다.
  - 출력은 `현재 target 회고 완료, 남은 target N개` 형태로 남기고, 다음 target 처리로 **같은 턴에서 계속** 진행한다.
- 사용자가 `계속`, `멈추지마`, `끝날 때까지` 등으로 재지시한 경우:
  - 중간 결과표 출력/계획서 1개 생성/커밋은 종료점이 아니라 **진행 업데이트**다.
  - 실제 중단은 hard blocker(입력 누락, git 실패, 파일 접근 불가 등)에서만 허용한다.

## main 기존 수정사항 무시 모드 (사용자 명시 지시 시)

사용자가 "main의 기존 수정사항을 고려하지 말라"고 명시한 경우:

- 실행 지시문(고정): **"상관없는 main 변경 감지는 무시하고, 현재 plan 대상 레포 변경만 처리한다."**
- 루트(main worktree)의 기존 `dirty`/`untracked` 파일은 reflect 중단 사유로 취급하지 않는다.
- 회고 분석과 후속 계획 판정은 현재 입력 plan/로그/실패표 범위만 기준으로 수행한다.
- 루트(main)의 기존 수정 파일은 읽기/수정/복구/스테이징 대상에서 제외한다.
- 무시 모드는 "중단 판정 완화"에만 적용되며, 판정 범위를 제외한 동작은 기존 규칙을 유지한다.
- 단, `.git` 보호 규칙과 파괴적 명령 금지 규칙은 그대로 유지한다.

## 실행 단계

### 세션 dirty 계약 (정의)

- **baseline dirty paths**: 스킬 시작 시점 `git status --short` 결과에서 추출한 dirty path 목록. 세션 시작 시 1회 고정.
- **touched paths**: 이 스킬 실행 중 agent가 직접 Edit/생성/git mv한 파일의 path 집합. 세션 내에서 점진적으로 추가된다.
- **self residual dirty**: 세션 종료 전 `current dirty ∩ $TouchedPaths`. agent가 만들었지만 아직 커밋하지 않은 dirty.
- **touched preexisting dirty**: baseline에 이미 있었으나 `$TouchedPaths`에도 포함된 path. agent가 같은 컨텍스트에서 수정했으면 whitelist 안에서는 커밋 책임이 agent에게 있다.
- **owner violation dirty**: root main protected dirty, impl worktree 밖 수정, post-merge 테스트/코드 dirty 잔여처럼 현재 owner flow가 소유하지 않은 위치에 생긴 dirty. Q5/Q6 후보에서 축소 금지한다.

### 0-pre단계: 세션 dirty baseline 기록

스킬 시작 직후, 조사만 모드 포함 모든 실행 경로에서 어떤 파일도 건드리기 전에 실행한다:
1. root와 `.worktrees/plans` 각각에서 `git status --short`로 path 목록을 `$BaselinePaths`/`$PlansBaselinePaths`로 기록한다.
2. `$TouchedPaths`를 빈 set으로 초기화한다.

### 1단계: 컨텍스트 리뷰 (6가지 추출)

현재 대화 컨텍스트 전체를 스캔하여 아래 6가지 항목을 추출한다.

### 1-0단계: 검증 게이트 실패표 선수집 (Q4 hard gate)

대화 텍스트 스캔 전에 최근 실행한 검증 명령을 표로 먼저 정리한다.

```markdown
| 실패 명령 | 종료코드 | 로그근거 | 카테고리 |
|----------|----------|---------|---------|
| {cmd} | {exit} | {요약} | {frontend-check|frontend-build|frontend-tsc|other} |
```

- 대상: `build/check/test` 게이트 명령 (`pnpm -C frontend check`, `pnpm -C frontend build`, `tsc`, `pytest` 등)
- 카테고리 분류 키워드:
  - `frontend-check`: `frontend check`, `svelte-check found`, `ELIFECYCLE`
  - `frontend-build`: `frontend build`, `vite build`, `npm run build`
  - `frontend-tsc`: `tsc`, `TypeScript`, `TS\d+`
- 실패 명령이 1개 이상이면 Q4를 **"해당 없음"으로 판정할 수 없다.**
- "본 변경 범위 외" 이슈라도 검증 게이트 실패면 후속 계획 후보로 강제 승격한다.

**Q1. 우려점**

대화 중 아래에 해당하는 내용을 탐색:
- 우회/타협한 부분 ("일단", "임시로", "나중에")
- 미해결 TODO/FIXME 추가
- 하드코딩된 값
- "나중에 수정" 류의 언급

추가로 수정한 파일을 Grep으로 스캔:
```powershell
# 워크트리 또는 프로젝트 디렉토리에서
grep -rn "TODO\|FIXME\|HACK\|WORKAROUND\|TEMP\|XXX" {수정된 파일들}
```

"해당 없음" 기준: 대화에 우회/타협 언급 없고, Grep 결과 0건이며, 구현이 plan 대로 완료됨.

**Q2. 유사 문제**

수정한 버그의 핵심 패턴을 **프로젝트 전체**에서 검색:
- 수정한 버그의 핵심 패턴을 Grep으로 **프로젝트 루트에서** (tests/ .worktrees/ node_modules/ .venv/ dist/ __pycache__/ 제외) 검색
- 같은 함수명/변수명 패턴이 다른 파일에도 존재하는지 확인

**[보안 패턴 전수 조사]** fix: plan이고 수정이 보안/권한/인증 관련인 경우:
- CLAUDE.md의 보안 패턴 레지스트리(있는 경우)를 읽고, 해당 패턴이 적용되지 않은 파일을 프로젝트 전체에서 검색
- 구체 키워드: `subprocess.run`, `subprocess.Popen`, `subprocess.call`, `os.system`, `os.popen` 등 호출 패턴을 grep 대상으로 명시

"해당 없음" 기준: Grep 결과 동일 패턴 0건, 또는 이미 방어된 패턴. 보안 패턴 레지스트리의 모든 패턴이 프로젝트 전체에서 적용되어 있음.

**[파일 이동/구조변경 참조처 검증]** 구현에서 파일 이동·삭제·이름변경·경로변경을 수행한 경우:
- 이전 경로를 참조하는 코드가 프로젝트에 잔존하는지 Grep으로 전체 검색
- `$PSScriptRoot`, `Split-Path`, `__file__`, `Path().parent` 등 상대경로 깊이 탐지 패턴이 새 디렉토리 구조의 깊이와 일치하는지 검증
- 설정 파일(CLAUDE.md, README, INDEX.md 등)의 하드코딩 경로가 업데이트되었는지 확인
- "해당 없음" 추가 기준: 파일 이동이 있었던 경우, 이전 경로 참조 0건 AND 상대경로 깊이 일치 확인됨

**Q3. 리팩토링**

수정한 파일을 대상으로:
- 줄 수 확인 — 500줄 초과 파일 탐지
- 중복 코드 여부 — 같은 로직이 2곳 이상에 존재하는지
- 임시 해결책 잔존 — HACK/WORKAROUND 주석

"해당 없음" 기준: 파일 크기 정상 + 중복/임시 코드 없음.

**Q4. 미발견 오류**

1-0단계 실패표 + 대화 로그를 함께 사용해 아래 항목을 열거한다:
- 실패표에 기록된 비정상 종료 명령(종료코드 != 0)
- 테스트 실패를 관찰했으나 수정하지 않고 넘어간 것
- 무시한 경고/에러 로그
- "이건 다른 문제" 라고 언급한 것
- T1~T5 TC가 plan Phase에서 약속한 필드/계약(예: 응답 키 존재, 반환 타입)을 실제 검증하는지 확인 — TC 제목과 assert 대상이 plan 계약과 일치하지 않으면 기록

"해당 없음" 기준: 실패표 항목 0건 **AND** 대화/로그에 미처리 오류 언급 없음.

**Q5. 지시불이행**

대화/작업 로그에서 아래 항목을 확인한다:
- 사용자 직접 지시를 이행하지 않은 경우
- AGENTS.md, 프로젝트 규칙, 스킬 규칙의 필수 절차를 누락하거나 우회한 경우
- 현재 impl worktree 밖 경로(root main, `.worktrees/plans`, sibling repo)를 직접 수정한 경우
- "계획서부터", "그 스킬로 해", "하지 마", "왜 안 지켰냐"처럼 사용자가 명시적으로 교정한 경우
- 사용자가 `[$skill](...SKILL.md)` 링크나 exact skill name을 다시 제시했는데도 실행 대신 설명을 반복한 경우
- `Phase DB-Direct`가 있는 plan에서 running DB 직접 실행, `존재 확인 쿼리`, `live API 또는 runtime 결과`를 남기지 않은 경우
- plan Phase 체크박스가 완료(`[x]`)로 표시됐으나 해당 파일 경로에 구현 흔적(함수/필드/import)이 없는 경우 — Grep으로 plan 언급 식별자를 해당 파일에서 검색해 확인
- child repo `.agents`/`.claude`/`.gemini` mirror 파일 직접 edit/commit을 제안하거나 실행한 경우. mirror drift는 wtools 원본 수정, downstream sync evidence, 또는 `/pull-sync` 수신 검증으로 라우팅해야 한다.

기록 기준:
- 단순 말실수나 표현 차이가 아니라, 실제 작업 흐름에 영향을 준 누락만 포함
- 위반 사실 자체와 그 근거(누락된 절차, 어긴 규칙, 사용자 교정 문장)를 같이 적는다

"해당 없음" 기준: 대화/로그에 명시적 지시 위반 또는 필수 절차 누락이 없고, 사용자 교정이 발생하지 않음.
사용자가 "직접 실행", "직접 마이그레이션", "live로 다시 검증" 같은 재지시를 남긴 경우, DB-direct/live 누락을 Q5 `해당 없음`으로 축소하지 않는다.

- **축소 금지 (필수):** Q5 또는 Q6 성격의 문제가 발견되면 사용자 승인 없이 `해당 없음`, `불필요`, `과함`, `닫음`으로 종결하지 않는다.
- 최소 `사용자 보고`로 남기고, 재발 방지 수정(스킬/규칙/코드)이 필요하면 `plan/new` 또는 `plan candidate`로 승격한다. (`조사만`/`조사` 모드도 동일)

**Q6. agent 교정작업 제안**

에이전트가 이전 분석 또는 진행 중에 제안했으나 실제 plan/TODO/스킬 수정으로 이어지지 않은 교정안을 추출한다.
- 수정 방향을 제안했지만 미적용
- 반복 재발 방지 액션을 언급했지만 후속 작업으로 연결하지 않음
- 세션 중 교정 필요성이 드러났는데 plan 생성이나 규칙 수정 없이 종료하려 한 경우
- explicit skill execute-now 교정안을 말했지만 `skills.md` 또는 관련 SKILL.md 수정 plan으로 연결하지 않은 경우
- DB-direct/live validation 누락이 반복되는데도 hard gate 교정안을 `plan candidate`로 승격하지 않은 경우
- child repo mirror direct edit를 wtools 원본 수정 또는 sync evidence flow로 reroute하지 않은 경우

판정 기준:
- 반복 재발 또는 범위 확장 리스크가 있는 수준만 포함
- 단순 아이디어 브레인스토밍, 사소한 말꼬리 제안은 제외

"해당 없음" 기준: 교정 제안이 모두 후속 계획/수정으로 연결되었거나, 별도 교정안이 제안되지 않음.

### 수동 검토 시나리오

- 사례 1: 사용자가 "계획서부터 써"라고 지시했는데 plan 없이 전역 스킬부터 수정함
  - Q5에는 `계획서 선행 지시 미이행`, `로컬 스킬 대신 전역 수정`이 기록되어야 한다.
  - 동일 원인이 `.claude\skills\reflect\SKILL.md` 또는 관련 workflow 규칙 보강으로 해결 가능하면 후속 plan 생성 대상이다.

- 사례 2: 세션 중 "지시불이행, agent 교정작업 제안도 reflect에 들어가야 한다"는 교정 방향이 제안됐지만 plan/TODO/스킬 수정으로 이어지지 않음
  - Q6에는 `교정작업 제안만 있었고 후속 실행이 없었다`가 기록되어야 한다.
  - 반복 재발 방지를 위해 스킬 문구 또는 workflow 규칙 수정이 필요하면 Q5와 묶어서 하나의 plan으로 생성할 수 있다.

- 사례 3: 사용자가 `[$plan](...SKILL.md)` 또는 `[$review-plan](...SKILL.md)`를 다시 찍어줬는데도 실행 대신 설명을 이어간 경우
  - Q5에는 `explicit skill invocation execute-now 누락`이 기록되어야 한다.
  - Q6에는 `execute-now 교정 방향을 말했지만 가이드/스킬 수정 plan으로 연결하지 않음`이 기록되어야 한다.
  - 같은 원인이 해당 SKILL.md 보강으로 막을 수 있으면 same-file follow-up plan으로 묶는다.

- 사례 4: 사용자가 `계속`/`멈추지마`/`끝날 때까지`로 교정했는데도 agent가 단계별 closeout 톤으로 멈춘 경우
  - Q5에는 `explicit continue/no-stop 위반(중간 마일스톤을 종료로 오독)`이 기록되어야 한다.
  - Q6에는 `continue 계약을 owner SKILL.md/가이드에 반영하지 않음`이 기록되어야 한다.
  - 이 유형이 발견되면 owner SKILL.md 반영 여부를 확인하고, 미반영이면 follow-up plan 또는 existing active plan 링크로 승격한다.
  - 같은 원인이 `implement`/`merge-test`/`done` 스킬 문구 보강으로 막을 수 있으면 follow-up plan 생성 대상이다.

- 사례 5: 대표 plan가 `_todo-N`으로 분리돼 있는데 child 1개만 처리하고 대표 plan 전체 완료/회고 종료로 보고한 경우
  - Q5에는 `_todo 분리 plan completeness gate 누락`이 기록되어야 한다.
  - Q6에는 `representative plan -> remaining _todo continuation 규칙을 스킬/가이드에 반영하지 않음`이 기록되어야 한다.
  - 같은 원인이 `implement`/`merge-test`/`reflect` 문구 보강으로 막을 수 있으면 follow-up plan 생성 대상이다.

- 사례 6: `Phase DB-Direct`가 있는 plan에서 사용자가 "직접 실행" 또는 동등한 재지시를 남겼는데도 running DB 반영과 live 검증 evidence 없이 거의 완료처럼 보고한 경우
  - Q5에는 `DB-direct 미실행`, `live 검증 미실행`, `직접 실행 대기` 상태를 숨긴 workflow 누락이 기록되어야 한다.
  - Q6에는 `DB-direct hard gate 교정안을 plan candidate로 승격하지 않음`이 기록되어야 한다.
  - 같은 원인이 SKILL.md/workflow 규칙 보강으로 재발 방지 가능하면 follow-up plan 생성 대상이다.

**owner violation dirty Q5/Q6 규칙:**
- post-merge 보강이나 테스트 수정이 main root protected path(`app/`, `frontend/`, `scripts/`, `tests/`, `.agents/`, `.claude`)에 dirty로 남았거나 impl worktree 밖에서 수정된 경우, Q5에는 `root main 직접 수정`, `impl worktree 밖 수정`, `post-merge 테스트/코드 dirty 잔여`를 지시불이행 후보로 기록한다.
- Q6에는 `ROOT_PROTECTED_DIRTY_CREATED repair`, `related-plan dirty`, `dirty 0 종료 조건` 같은 workflow guard가 누락됐는지 교정 후보로 남긴다.
- 조사만 모드에서도 이 dirty finding은 보고 표에 남긴다. `해당 없음`으로 축소하지 않고 기존 active plan attach 또는 신규 plan 후보로 둔다.
- 사용자가 이미 방어를 요구했는데 agent가 진행불가/중단으로 답한 경우, 단순 커뮤니케이션 실패가 아니라 Q5/Q6 교정 사례로 기록한다.

### plan necessity gate

finding을 plan으로 승격하기 전에 아래 4가지를 판정한다:

| 판정 | 조건 | 후속 동작 |
|------|------|----------|
| `must_plan` | 실패 증거 있음 + 구체 owner 있음 + 기존 active plan에 귀속 불가 + 사용자 보고만으로 닫을 수 없는 잔여 리스크 | 즉시 plan 생성 |
| `attach_existing` | 기존 active plan이 같은 owner/범위를 커버 | 기존 plan에 항목 추가, 신규 생성 스킵 |
| `user-review` | 증거 약함 / owner 불명확 / expected outcome 추상적 | 사용자검토 후보로 보류 |
| `report-only` | 관찰만이고 액션 없음 | 출력 텍스트에만 기록, plan 생성 스킵 |

**즉시 승격 예외군** (위 gate를 우선 적용하지 않음):
- Q4 hard gate: 실패한 build/check/test → `must_plan` 강제
- Q5/Q6 재발 방지: 수정 후에도 재발 위험이 코드에 남은 경우 → `must_plan` 강제
- owner violation dirty: root main protected dirty, impl worktree 밖 수정, post-merge 테스트/코드 dirty 잔여 → 기존 active plan attach 또는 `must_plan` 강제

### 2단계: 계획서 생성

추출 결과를 **의미 단위로 묶어** 계획서를 생성한다.

**묶기 규칙:**
- 같은 파일/모듈에 대한 항목은 하나의 계획서로 묶는다
- Q1+Q3이 같은 파일이면 "리팩토링 + 우려점 해소" 계획서 1개
- 서로 무관한 항목은 별도 계획서
- 최소 1개 ~ 최대 N개 (강제 상한 없음)

**생성 절차:**
1. 프로젝트 문서 위치 규칙(AGENTS.md/CLAUDE.md)과 `_path-rules.md` helper 우선순위(`PLAN_ROOT -> .worktrees/plans/docs/plan -> docs/plan`)를 함께 확인한다.
   (예: wtools 공통은 `.worktrees/plans/docs/plan`, 일반 프로젝트는 `docs/plan`)
   **계획서 생성 위치 분기** — 발견 항목의 수정 대상에 따라 올바른 프로젝트에 생성:
   - 수정 대상이 `.claude/skills/`, `.claude/agents/`, 공통 스크립트 → **wtools** `.worktrees/plans/docs/plan/`에 생성
   - 수정 대상이 child repo `.agents`, `.claude`, `.gemini` mirror 파일이면 wtools 원본 수정 plan, downstream sync evidence task, 또는 `/pull-sync` 수신 검증 task로 분류하고 child repo impl plan은 생성 금지
     - 허용: wtools 원본 수정 + GitHub Actions sync commit 대기
     - 허용: child repo `git pull` 또는 `/pull-sync`로 sync commit 수신
     - 허용: child repo에서 sync commit 수신 후 downstream file read-back 검증
     - 금지: child repo `.agents`/`.claude`/`.gemini` mirror 파일을 직접 edit/commit해 wtools 원본과 수동 정렬 — Q5 위반
     - conflict 발생 시 방치하지 말고 `/pull-sync` conflict 분류 정책으로 위임한다.
   - 수정 대상이 특정 프로젝트의 `app/`, `frontend/`, `scripts/` 등 → **해당 프로젝트**의 `docs/plan/`에 생성
   - 복수 프로젝트에 걸친 변경 → **wtools** `.worktrees/plans/docs/plan/`에 생성
2. `/plan` 스킬의 `_template.md` 형식으로 계획서 작성
3. 파일명: `{plan경로}/YYYY-MM-DD_{주제}.md`
4. 헤더에 `> 출처: /reflect에서 자동 생성` 표기

**중복 처리 규칙 (필수):**
- 신규 생성 전 `{plan경로}`의 미완료 plan을 검색한다.
- `제목 키워드 + 실패 카테고리 + 최근 N일`이 일치하면 신규 생성 대신 기존 plan 링크를 반환한다.
- 처리결과는 `plan/new`(신규 생성) 또는 `existing`(기존 링크 반환)로 기록한다.
- **archive 경로는 중복 검색 대상 외**다. `docs/archive/`, `.worktrees/plans/docs/archive/`에만 남은 우려점은 **"이미 기록됨" 근거가 될 수 없다**.
- archive에만 기록된 우려점이 다시 발견되면 active plan에 재승격하거나 신규 plan으로 생성한다.

**Q5/Q6 계획서 생성 규칙:**
- 스킬/에이전트 파일, 공통 스크립트, 문서 규칙 수정으로 재발 방지가 가능한 경우에만 plan 생성
- 파일 수정으로 해결 불가능한 일반 습관 문제는 plan 생성 없이 사용자에게 직접 보고
- Q5(위반 사실)와 Q6(교정안 누락)가 같은 파일/규칙을 가리키면 하나의 plan으로 묶는다
- explicit skill invocation 재발처럼 `skills.md`와 특정 SKILL.md가 같은 계약을 공유하면 same-file 또는 same-rule follow-up plan으로 묶는다

**0건 처리:**
6가지 모두 "해당 없음"이면:
```
리뷰 완료.
```
출력 후 3단계 스킵, 종료.

### 2.5단계: 신규 계획서 커밋 지시 (필수)

- 신규 plan 생성 직후 path를 `$TouchedPaths`에 추가하고, fallback/review-plan 전 `current dirty ∩ $TouchedPaths`로 self residual을 계산한다.
- 신규 plan 외 whitelist 밖 self dirty가 남아도 review-plan 흐름은 계속 진행하고, 최종 보고 표에 `남은 dirty` 행으로 기록한다.
- 신규 계획서가 1개 이상 생성되면 **반드시 커밋한다**.
- 기본 모드: 3단계에서 수행되는 `/review-plan`의 커밋으로 충족한다.
- 예외(Fallback): `/review-plan` 단계가 실패/스킵되면, `reflect`가 직접 화이트리스트 커밋(`{plan경로}/*.md`, 필요 시 `TODO.md`)을 수행하고 종료한다.
- `/review-plan` 실패 사유가 `local drift 충돌`, `related-plan 충돌`, 입력 누락 등 새 재검토 실패 유형이어도, reflect는 그 사유를 **출력 표와 종료 메시지에 그대로 기록**한다.
- `/review-plan` 실패 전에 현재 입력 계획서에 deterministic한 보정이 반영된 경우, reflect fallback은 **그 현재 입력 계획서 파일만** 화이트리스트 커밋 대상으로 판정한다.
- 새 실패 유형 때문에 화이트리스트 exact-match 검증이 통과하지 않으면 커밋하지 않고, 실패 사유만 그대로 보고하고 종료한다.
- 조사만/조사 모드: 3단계를 스킵하므로 `reflect`가 직접 화이트리스트 커밋을 수행한다.
- plans 워크트리가 존재하면 `Resolve-DocsCommitRoot` 기준 cwd로 이동하고 `Resolve-DocsCommitCandidates` 반환 파일만 `git add`한다. `git add -A`는 사용하지 않는다.
- 커밋 메시지 예: `docs: reflect — add follow-up plans`
- 생성 계획서가 0건이면 커밋하지 않는다.

### 조사만 모드 분기

**"조사만" 또는 "조사" 인자가 감지된 경우:**
- 종료 전 `current dirty ∩ $TouchedPaths`로 touched plan 파일이 dirty인지 확인하고, whitelist 안이면 화이트리스트 커밋을 시도한다.
- 계획서 목록 출력 + 화이트리스트 커밋 수행 후 **종료**
- 3단계(review-plan) 호출 **스킵**
- 출력:
  ```
  생성된 계획서: {경로1}, {경로2}, ...
  재검토가 필요하면 /review-plan {경로}를 실행하세요.
  ```
- 커밋 불가 또는 whitelist 밖 dirty가 있으면 `조사 완료`와 함께 `남은 dirty: {path 목록}`을 출력한다.

### 3단계: 계획서 재검토 및 확장

- review-plan 보정 중 수정한 계획서 path를 `$TouchedPaths`에 추가한다.

생성된 계획서에 대해 `/review-plan` 스킬의 SKILL.md를 읽고, 그 실행 단계를 **직접 수행**한다.
(Skill 도구로 `/review-plan`을 호출하는 것이 아님 — review-plan 절차를 인라인으로 따르되, review-plan이 요구하는 downstream Skill 호출/커밋 규칙을 그대로 따른다. 특히 review-plan 2단계는 expand-todo를 Skill 도구로 직접 호출하므로, reflect도 expand-todo를 직접 인라인 수행하지 않는다.)
계획서 경로 목록을 review-plan의 입력으로 사용한다.
- 이 단계에서 `review-plan`은 로컬 drift/연관 계획서 참조를 검토한 뒤 **현재 입력 계획서만** 보정할 수 있다.
- `review-plan`이 `local drift 충돌`, `related-plan 충돌`, 입력 누락 등으로 실패하면, reflect는 같은 실패 사유를 결과 표와 종료 메시지에 남기고 2.5단계 fallback 규칙으로 종료한다.

## 출력 형식

```markdown
## 컨텍스트 리뷰 결과

| # | 카테고리 | 발견 | 계획서 |
|---|---------|------|--------|
| 1 | 우려점 | {내용 또는 해당 없음} | {plan 링크 또는 —} |
| 2 | 유사 문제 | {내용 또는 해당 없음} | {plan 링크 또는 —} |
| 3 | 리팩토링 | {내용 또는 해당 없음} | {plan 링크 또는 —} |
| 4 | 미발견 오류 | {내용 또는 해당 없음} | {plan 링크 또는 —} |
| 5 | 지시불이행 | {내용 또는 해당 없음} | {plan 링크 또는 —} |
| 6 | agent 교정작업 제안 | {내용 또는 해당 없음} | {plan 링크 또는 —} |

실패 명령 표:
| 실패 명령 | 종료코드 | 카테고리 | 처리결과(plan/new|existing) |
|----------|----------|---------|-----------------------------|
| {cmd} | {exit} | {frontend-check|frontend-build|frontend-tsc|other} | {plan/new|existing} |

생성된 계획서: N개
→ review-plan 실행 단계를 인라인으로 수행 중...

review-plan 실패 시:
- 실패 사유: {local drift 충돌|related-plan 충돌|입력 누락|기타}
- fallback 커밋: {실행|스킵}
```


### 사용자검토 후보

`user-review` 판정 finding이 있으면 아래 형식으로 출력한다:

| finding | 판정 사유 | 권장 조치 |
|---------|---------|---------|
| {finding 요약} | owner 불명확: {사유} | 필요 시 직접 plan 생성 |

후보가 없으면 이 섹션을 생략한다.

### 마무리 문구 규칙

/reflect 실행이 끝날 때 아래 규칙을 따른다.

**금지 문구 (자기 참조)**:
> `회고가 필요하면 /reflect를 실행하세요.` 또는 유사 문구 — 출력 금지.
> 사용자가 방금 `/reflect`를 완료했으므로 자기 호출 안내는 순환 참조다.
> `/done`·`/merge-test` 완료 안내에서는 적절하지만, `/reflect` 자체 종료 시에는 사용하지 않는다.

**대체 문구**:

| 상황 | 출력 |
|------|------|
| 후속 액션 없음 (0건) | `리뷰 완료.` |
| 계획서 생성됨 (N개) | `리뷰 완료.`<br>`생성된 계획서: N개 ({경로 목록})` |
| 후속 /implement 권장 | `리뷰 완료.`<br>`생성된 계획서: N개`<br>`다음 단계: /implement {plan경로}` |

- 0건 처리(`리뷰 완료 — 추가 작업 없음`)는 `리뷰 완료.`로 통일한다.
- `/done`·`/merge-test`의 완료 안내 문구를 그대로 복사하지 않는다.

## 주의사항

- **코드 직접 수정 금지** — 리뷰는 계획서 생성까지만. 코드 수정은 `/implement`에서
- **기존 plan 무단 수정 금지** — 중복 발견 시 사용자에게 보고만
- **review-plan 새 실패 사유 보존** — `local drift 충돌`, `related-plan 충돌` 같은 재검토 실패도 fallback 출력/종료 메시지에서 생략하지 않는다.
- **plan-runner 경로** — 수동 `/reflect`는 대화 컨텍스트 기반, 자동 파이프라인은 `auto-reflect` 에이전트(로그+실패표 기반)를 사용
- **과잉 생성 방지** — 사소한 발견도 계획서로 만들지 않음. 실제 작업이 필요한 수준인지 판단
- **자기 참조 금지** — `/reflect` 마무리 출력에 "회고가 필요하면 /reflect를 실행하세요." 류 문구 금지. `/done`·`/merge-test` 안내 문구를 그대로 복사하지 말 것

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **커밋**: 커밋 스크립트 필수 (`commit.ps1` 또는 `commit.sh`)
- **git mutation**: `git add/reset/stash/worktree/branch` 및 `commit.ps1` 실행은 병렬 실행 금지. 병렬화는 read-only 명령에만 허용한다.
