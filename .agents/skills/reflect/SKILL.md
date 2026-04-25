---
name: reflect
description: "구현 후 회고 — 우려점·유사문제·리팩토링·미발견오류·지시불이행·agent 교정작업 제안 추출 → 계획서 생성 → review-plan 자동 수행. Use when: 리뷰, reflect, 회고, 검토, 우려점"
---

# 컨텍스트 리뷰

구현 완료 후 현재 대화 컨텍스트를 분석하여 6가지 관점에서 후속 작업을 추출하고, 필요시 계획서를 자동 생성합니다.

## 트리거

- "리뷰", "review", "검토", "우려점"
- `/done` 완료 후 안내에서 연결

## 로컬 우선 규칙

- `wtools`에서 `/reflect`를 수정하거나 해석할 때 기준 파일은 `D:\work\project\service\wtools\.agents\skills\reflect\SKILL.md`이다.
- 전역 `C:\Users\Narang\.codex\skills\reflect\SKILL.md`는 참조용이며, 충돌 시 로컬 `.agents` 규칙을 우선한다.
- reflect 관련 후속 plan/교정작업은 먼저 로컬 `.agents` 스킬 수정 가능성을 검토한다.

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

프로젝트 전체(`tests/`, `.worktrees/`, `node_modules/` 제외)에서 Grep으로 같은 패턴 재검색:
- 프로젝트 전체(`tests/`, `.worktrees/`, `node_modules/` 제외)에서 Grep 수행 후 동일 패턴의 위치를 정렬
- 같은 함수명/변수명 패턴이 다른 파일에도 존재하는지 확인
- 동일 패턴이 모듈 경계를 넘어 나타나는지 판단

"해당 없음" 기준: 프로젝트 전체 Grep 결과 동일 패턴 0건, 또는 이미 방어된 패턴.

### 파일 이동/구조변경 참조처 검증

수정한 파일이 경로 이동/이름 변경/재배치와 연관되어 있으면, 같은 패턴의 이전 경로를 전체 Grep한 뒤 참조 처리를 점검한다.
- 이전 경로 문자열로 프로젝트 전체 Grep 검색 (`tests/`, `.worktrees/`, `node_modules/` 제외)
- `../`, `./`, `$PSScriptRoot`, `__file__`, `Path().parent` 등의 상대경로 깊이 일치 여부를 검증
- 깊이 불일치 또는 경로 하드코딩이 남아 있으면 Q1/Q2에 우려 항목으로 추가

**Q3. 리팩토링**

수정한 파일을 대상으로:
- 파일 규모/복잡도 확인 — 과도하게 비대한 파일 또는 복잡한 조건/분기 블록 탐지
- 중복 코드 여부 — 같은 로직이 2곳 이상에 존재하는지
- 임시 해결책 잔존 — HACK/WORKAROUND 주석

"해당 없음" 기준: 파일 크기 정상 + 중복/임시 코드 없음.

**Q4. 미발견 오류**

1-0단계 실패표 + 대화 로그를 함께 사용해 아래 항목을 열거한다:
- 실패표에 기록된 비정상 종료 명령(종료코드 != 0)
- 테스트 실패를 관찰했으나 수정하지 않고 넘어간 것
- 무시한 경고/에러 로그
- "이건 다른 문제" 라고 언급한 것

"해당 없음" 기준: 실패표 항목 0건 **AND** 대화/로그에 미처리 오류 언급 없음.

**Q5. 지시불이행**

대화/작업 로그에서 아래 항목을 확인한다:
- 사용자 직접 지시를 이행하지 않은 경우
- AGENTS.md, 프로젝트 규칙, 스킬 규칙의 필수 절차를 누락하거나 우회한 경우
- "계획서부터", "그 스킬로 해", "하지 마", "왜 안 지켰냐"처럼 사용자가 명시적으로 교정한 경우
- 사용자가 `[$skill](...SKILL.md)` 링크나 exact skill name을 다시 제시했는데도 실행 대신 설명을 반복한 경우
- `Phase DB-Direct`가 있는 plan에서 running DB 직접 실행, `존재 확인 쿼리`, `live API 또는 runtime 결과`를 남기지 않은 경우

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

판정 기준:
- 반복 재발 또는 범위 확장 리스크가 있는 수준만 포함
- 단순 아이디어 브레인스토밍, 사소한 말꼬리 제안은 제외

"해당 없음" 기준: 교정 제안이 모두 후속 계획/수정으로 연결되었거나, 별도 교정안이 제안되지 않음.

### 상호 영향 조사

`D:\work\project\service\wtools\.agents\skills\reflect\SKILL.md`는 수동 `/reflect` 규칙, `D:\work\project\service\wtools\.agents\agents\auto-reflect.md`는 자동 회고 계약, `D:\work\project\service\wtools\common\tools\plan-runner\cli\runner.py`는 auto-reflect runtime 호출부다. 세 surface는 파일과 owner가 나뉘어 있으므로, 한쪽만 수정해도 반대편 drift가 남는지 같은 review 단계에서 같이 판정해야 한다.

조사 목적:
- 새 정책 발명이 아니라, 이번 변경으로 반대편 surface에 stale contract나 runtime drift가 남는지 판정한다.
- 상호 영향 조사는 Q5/Q6와 별개가 아니라, 지시불이행 또는 교정작업 제안이 재발 방지 수정으로 이어져야 하는지 보강 판단하는 단계다.

조사 트리거:
- `reflect` 또는 다른 skill/agent instruction 문서를 수정했으면 `auto-reflect`와 `runner.py` 영향 여부를 같이 조사한다.
- `auto-reflect` 또는 `runner.py`를 수정했으면 수동 `/reflect` 규칙 수정 필요 여부를 같이 조사한다.
- 한쪽 문구만 고쳤는데 다른 쪽이 이전 계약을 계속 소비하거나 호출 조건을 유지하면 상호 영향 조사 결과를 남긴다.

판정값:
- `영향 없음`: 반대편 surface에 수정할 계약이나 runtime drift가 남지 않는다.
- `참조만`: 관련 surface는 있지만 이번 변경으로 실제 수정은 필요 없고 근거 파일/active plan만 함께 남긴다.
- `수정필요`: 반대편 surface에도 follow-up 수정 또는 기존 active plan 연결이 필요하다.

후속 규칙:
- `영향 없음`, `참조만`은 새 plan 생성 금지다. 근거 파일 또는 기존 active plan 링크만 남긴다.
- `수정필요`만 follow-up plan 또는 기존 active plan 링크 반환 대상이다.
- `수정필요`를 사용자 승인 없이 `불필요`로 축소하지 않는다. 이 축소 금지 정의 자체는 `D:\work\project\service\wtools\.worktrees\plans\docs\plan\2026-04-21_fix-done-reflect-target-fixation-and-git-mutation-serialization.md`가 owner다.
- 위 active plan이 아직 live instruction으로 반영되지 않았더라도, 상호 영향 조사에서 발견한 `수정필요`를 단순 참조만으로 닫지 않는다. 현재 세션 결과는 Q5/Q6 finding, `plan candidate`, 또는 active plan 링크 중 하나로 그대로 남긴다.

라우팅 규칙:
- `.agents` active surface 문구 drift는 `D:\work\project\service\wtools\.worktrees\plans\docs\plan\2026-04-21_fix-reflect-agent-plans-worktree-path-policy-drift.md` 계열로 연결한다.
- `.claude` mirror drift 또는 `runner.py` runtime parity는 `D:\work\project\service\wtools\.worktrees\plans\docs\plan\2026-04-21_fix-plan-runner-agent-surface-parity-and-phasez-drift.md` 계열로 연결한다.
- 신규 plan 생성 전에는 항상 기존 active plan 귀속 가능성을 먼저 검토한다.
- mixed finding이 두 surface에 함께 걸치면 `.agents` 문구 drift와 runtime/`.claude` parity를 각각 분리하지 말고, `runner.py` 소비 방식 또는 `.claude` mirror drift가 포함된 경우 runtime parity plan을 primary owner로 삼는다.
- mixed finding에 runtime/`.claude` 요소가 없고 `.agents` active-surface 문구 drift만 남으면 reflect active-surface plan을 primary owner로 삼는다.
- primary owner가 정해진 뒤 다른 surface는 `참조 plan`으로만 같이 남긴다. 하나의 finding을 동일 레벨 신규 plan 2개로 쪼개지 않는다.

### 수동 검토 시나리오

- 사례 1: 사용자가 "계획서부터 써"라고 지시했는데 plan 없이 전역 스킬부터 수정함
  - Q5에는 `계획서 선행 지시 미이행`, `로컬 스킬 대신 전역 수정`이 기록되어야 한다.
  - 동일 원인이 `.agents\skills\reflect\SKILL.md` 또는 관련 workflow 규칙 보강으로 해결 가능하면 후속 plan 생성 대상이다.

- 사례 2: 세션 중 "지시불이행, agent 교정작업 제안도 reflect에 들어가야 한다"는 교정 방향이 제안됐지만 plan/TODO/스킬 수정으로 이어지지 않음
  - Q6에는 `교정작업 제안만 있었고 후속 실행이 없었다`가 기록되어야 한다.
  - 반복 재발 방지를 위해 스킬 문구 또는 workflow 규칙 수정이 필요하면 Q5와 묶어서 하나의 plan으로 생성할 수 있다.

- 사례 3: docs-only 커밋에서 `git reset HEAD {파일}` 후 orphaned delete가 남았는데도 계속 진행하려 한 경우
  - Q4에는 `staged rename/delete mismatch 미처리`가 기록되어야 한다.
  - Q5에는 `docs-only exact-match 검증 누락`이 기록되어야 한다.
  - 같은 원인이 `review-plan`, `plan`, `auto-reflect` 문구 보강으로 막을 수 있으면 follow-up plan 생성 대상이다.

- 사례 4: 사용자가 `[$plan](...SKILL.md)` 또는 `[$review-plan](...SKILL.md)`를 다시 찍어줬는데도 실행 대신 설명을 이어간 경우
  - Q5에는 `explicit skill invocation execute-now 누락`이 기록되어야 한다.
  - Q6에는 `execute-now 교정 방향을 말했지만 가이드/스킬 수정 plan으로 연결하지 않음`이 기록되어야 한다.
  - 같은 원인이 해당 SKILL.md 보강으로 막을 수 있으면 same-file follow-up plan으로 묶는다.

- 사례 5: 사용자가 `계속`/`멈추지마`/`끝날 때까지`로 교정했는데도 agent가 단계별 closeout 톤으로 멈춘 경우
  - Q5에는 `explicit continue/no-stop 위반(중간 마일스톤을 종료로 오독)`이 기록되어야 한다.
  - Q6에는 `continue 계약을 owner SKILL.md/가이드에 반영하지 않음`이 기록되어야 한다.
  - 이 유형이 발견되면 owner SKILL.md 반영 여부를 확인하고, 미반영이면 follow-up plan 또는 existing active plan 링크로 승격한다.
  - 설명이 맞고 내용이 정확해도 멈춘 타이밍이 틀리면 지시불이행이다 — 단순 커뮤니케이션 문제로 축소하지 않는다.
  - 같은 원인이 `implement`/`merge-test`/`done` 스킬 문구 보강으로 막을 수 있으면 follow-up plan 생성 대상이다.

- 사례 6: `Phase DB-Direct`가 있는 plan에서 사용자가 "직접 실행" 또는 동등한 재지시를 남겼는데도 running DB 반영과 live 검증 evidence 없이 거의 완료처럼 보고한 경우
  - Q5에는 `DB-direct 미실행`, `live 검증 미실행`, `직접 실행 대기` 상태를 숨긴 workflow 누락이 기록되어야 한다.
  - Q6에는 `DB-direct hard gate 교정안을 plan candidate로 승격하지 않음`이 기록되어야 한다.
  - 같은 원인이 SKILL.md/workflow 규칙 보강으로 재발 방지 가능하면 follow-up plan 생성 대상이다.

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
   - 수정 대상이 특정 프로젝트의 `app/`, `frontend/`, `scripts/` 등 → **해당 프로젝트**의 `docs/plan/`에 생성
   - 복수 프로젝트에 걸친 변경 → **wtools** `.worktrees/plans/docs/plan/`에 생성
2. `/plan` 스킬의 `_template.md` 형식으로 계획서 작성
3. 파일명: `{plan경로}/YYYY-MM-DD_{주제}.md`
4. 헤더에 `> 출처: /review에서 자동 생성` 표기

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
- 상호 영향 조사 결과가 `수정필요`면 기존 active plan 귀속 가능성을 먼저 본다. `.agents` 문구 drift는 reflect active-surface plan, runtime/`.claude` parity는 plan-runner parity plan 링크를 우선 검토한다.
- mixed finding에 `runner.py` 소비 방식 또는 `.claude` mirror drift가 포함되면 runtime parity plan을 primary owner로 고르고, `.agents` 문구 drift는 `참조 plan`으로만 남긴다.
- mixed finding이 `.agents` active-surface 문구 drift에만 머물면 reflect active-surface plan을 primary owner로 고르고, 같은 finding을 중복 plan 2개로 쪼개지 않는다.
- `fix-done-reflect-target-fixation-and-git-mutation-serialization` plan의 축소 금지 규칙이 아직 live instruction에 반영되지 않았더라도, Q5/Q6 또는 상호 영향 조사 `수정필요`를 "참조했으니 해결됨"으로 닫지 않는다.
- `Phase DB-Direct` plan의 실행 증거 누락은 파일/규칙 수정으로 재발 방지가 가능하면 최소 `plan candidate`로 남긴다.
- 사용자가 "직접 실행" 재지시를 남긴 경우, 이를 단순 커뮤니케이션 누락으로 축소하지 않고 workflow gap 근거로 기록한다.

**0건 처리:**
6가지 모두 "해당 없음"이면:
```
리뷰 완료 — 추가 작업 없음
```
출력 후 3단계 스킵, 종료.

### 2.5단계: 신규 계획서 커밋 지시 (필수)

- 신규 계획서가 1개 이상 생성되면 **반드시 커밋한다**.
- 기본 모드: 3단계에서 수행되는 `/review-plan`의 커밋으로 충족한다.
- 예외(Fallback): `/review-plan` 단계가 실패/스킵되면, `reflect`가 직접 화이트리스트 커밋(`{plan경로}/*.md`, 필요 시 `TODO.md`)을 수행하고 종료한다.
- `/review-plan` 실패 사유가 `local drift 충돌`, `related-plan 충돌`, 입력 누락 등 새 재검토 실패 유형이어도, reflect는 그 사유를 **출력 표와 종료 메시지에 그대로 기록**한다.
- `/review-plan` 실패 전에 현재 입력 계획서에 deterministic한 보정이 반영된 경우, reflect fallback은 **그 현재 입력 계획서 파일만** 화이트리스트 커밋 대상으로 판정한다.
- 새 실패 유형 때문에 화이트리스트 exact-match 검증이 통과하지 않으면 커밋하지 않고, 실패 사유만 그대로 보고하고 종료한다.
- 조사만/조사 모드: 3단계를 스킵하므로 `reflect`가 직접 화이트리스트 커밋을 수행한다.
- direct fallback 커밋에서 staged mismatch, `D`/`R`/`RM`/`??` 비대칭, 비화이트리스트 파일이 보이면 `git reset`로 정리하고 계속하지 않는다. 실패를 그대로 보고하고 종료한다.
- 커밋 메시지 예: `docs: reflect — add follow-up plans`
- 생성 계획서가 0건이면 커밋하지 않는다.

### 조사만 모드 분기

**"조사만" 또는 "조사" 인자가 감지된 경우:**
- 계획서 목록 출력 + 화이트리스트 커밋 수행 후 **종료**
- 3단계(review-plan) 호출 **스킵**
- 출력:
  ```
  생성된 계획서: {경로1}, {경로2}, ...
  재검토가 필요하면 /review-plan {경로}를 실행하세요.
  ```

### 3단계: 계획서 재검토 및 확장

생성된 계획서에 대해 `/review-plan` 스킬의 SKILL.md를 읽고, 그 실행 단계를 **직접 수행**한다.
(Skill 도구로 `/review-plan`을 호출하는 것이 아님 — reflect 실행 중에 인라인으로 재검토 → expand-todo → 커밋을 처리)
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
| 5 | 지시불이행 | {내용 또는 해당 없음} | {plan 링크, 사용자 보고, 또는 —} |
| 6 | agent 교정작업 제안 | {내용 또는 해당 없음} | {plan 링크, 사용자 보고, 또는 —} |

상호 영향 조사:
| 방향 | 판정 | 근거 파일 | 후속 파일 또는 plan 링크 |
|------|------|-----------|---------------------------|
| reflect/skill -> auto-reflect/runner | {영향 없음|참조만|수정필요} | {reflect SKILL.md, auto-reflect.md, runner.py 중 관련 파일} | {후속 파일, active plan 링크, 또는 —} |
| auto-reflect/runner -> reflect/skill | {영향 없음|참조만|수정필요} | {auto-reflect.md, runner.py, reflect SKILL.md 중 관련 파일} | {후속 파일, active plan 링크, 또는 —} |

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

## 주의사항

- **코드 직접 수정 금지** — 리뷰는 계획서 생성까지만. 코드 수정은 `/implement`에서
- **기존 plan 무단 수정 금지** — 중복 발견 시 사용자에게 보고만
- **review-plan 새 실패 사유 보존** — `local drift 충돌`, `related-plan 충돌` 같은 재검토 실패도 fallback 출력/종료 메시지에서 생략하지 않는다.
- **plan-runner 경로** — 수동 `/reflect`는 대화 컨텍스트 기반, 자동 파이프라인은 `auto-reflect` 에이전트(로그+실패표 기반)를 사용
- **과잉 생성 방지** — 사소한 발견도 계획서로 만들지 않음. 실제 작업이 필요한 수준인지 판단

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **커밋**: 커밋 스크립트 필수 (`commit.ps1` 또는 `commit.sh`)
- **git mutation**: `git add/reset/stash/worktree/branch` 및 `commit.ps1` 실행은 병렬 실행 금지. 병렬화는 read-only 명령에만 허용한다.
