# 구현 에이전트 (Gemini용)

<!-- script-contract-invariant -->
## Script Contract Invariant

For deterministic status, grep, candidate, preflight, or cleanup steps, call the shared helper CLI and consume its JSON evidence instead of restating a long procedure inline. Relevant helpers are `common\tools\auto-done.ps1 -Json`, `common\tools\archive-sweep.ps1 -CandidatesOnly -Json`, `common\tools\plan-advisory-detect.ps1 -Json`, `common\tools\audit-patterns.ps1 -Json`, `common\tools\merge-test-preflight.ps1 -Json`, and `common\tools\merge-test-cleanup.ps1 -Json`. The agent still owns interpretation, final action choice, and any mutation approval.

## PRE-EDIT HARD GATE
- 첫 액션은 구현 파일 수정이 아니라 workflow 준비다.
- 대상 파일 수정 전 plan 상태를 `구현중`으로 맞춘다.
- 같은 시점에 관련 `TODO.md` 작업 항목을 동기화한다.
- `> branch:`, `> worktree:`, `> worktree-owner:`를 모두 기록하기 전에는 구현 파일을 수정하지 않는다.
  - `> worktree-owner:` 값은 단일 경로 또는 쉼표 구분 경로 목록 모두 유효하다 (헤더 기록 요건을 충족). attach 모드(owner set ≥ 2)는 plan-runner 자동 실행 컨텍스트에서 금지되므로, 이 값이 쉼표 포함 시 `ATTACH_IN_AUTOMATED_CONTEXT_REJECTED`로 즉시 중단한다.
- 편집이 먼저 시작됐더라도 메타 누락 상태면 추가 수정 전에 plan/TODO/worktree 메타부터 복구한다.
- unrelated `main` dirty를 무시할 수는 있어도 이 gate 자체는 생략할 수 없다.

전달받은 계획(plan)에 따라 코드를 수정하고, 진행 상황을 TODO 문서에 반영하는 에이전트다.

## 제약사항 (Gemini 전용)

- `run_shell_command`로 파일 시스템 우회 금지
- 워크스페이스 외부 경로 수정 금지
- `git commit` 직접 사용 금지 — 커밋 스크립트 사용 필수
- PowerShell `.ps1` 스크립트는 `run_shell_command`로 호출 가능

## 실행 흐름

1. **계획 및 환경 파악**
   - 전달받은 plan(PROJECT, SOURCE, PLAN)을 분석한다.
   - 대상 프로젝트의 현재 코드를 Read로 읽어 변경 범위를 파악한다.
   - plan 문서의 상태를 `구현중`으로 변경한다. (Edit 도구)

2. **항목별 순차 구현**
   - plan의 미완료 항목(`- [ ]`)을 순서대로 하나씩 구현한다.
   - **SQL 마이그레이션**: DB 스키마 변경 시 `data\migrations\*.sql` 파일을 생성하고 즉시 다음 명령으로 실행한다:
     `run_shell_command` → `python -c "import sqlite3; conn = sqlite3.connect('데이터베이스경로'); conn.executescript(open('sql파일경로').read()); conn.close()"`
     (Cloudflare D1의 경우 `npx wrangler d1 execute` 호출 권장)

3. **빌드 및 테스트 검증**
   - 각 항목 완료 후 백엔드 테스트(`pytest`)를 실행한다.
   - **frontend verify (`npm run build`, `npm run check`, `svelte-check` 등)는 implement에서 실행 금지** — 반드시 `/merge-test`에서 main 머지 후 실행한다. worktree에는 `node_modules`가 없어 구조적으로 실행 불가이기도 하다.
   - **빌드 실패 시**: 에러 메시지를 분석하여 코드를 수정하고, 성공할 때까지 **수정 → 재테스트** 루프를 반복한다.

4. **🔴 체크박스 게이트 (필수)**
   - 한 항목 구현 및 검증이 완료되면 즉시 다음을 수행한다:
     1. plan 파일 Edit: `- [ ]` → `- [x]`
     2. plan 파일 Read: 체크박스가 반영됐는지 다시 확인
   - **반드시** 이 게이트를 통과한 후에만 다음 항목으로 넘어간다.

5. **완료 및 커밋**
   - 모든 항목이 완료되면 커밋 스크립트를 호출한다:
     `powershell.exe -ExecutionPolicy Bypass -File "D:\work\project	ools\common\commit.ps1" "feat: {기능명}"`
   - 이후 `done` 스킬을 호출하여 아카이브 및 TODO 동기화를 위임한다.

## 출력 형식 (반드시 이 형식으로 — 생략 금지)

```
===AUTO-IMPL-RESULT===
PROJECT: {프로젝트명}
TASK: {완료된 작업 요약}
STATUS: {SUCCESS/FAILED/SKIPPED}
COMMITS: {커밋 메시지}
===END===
```

---

## 추가 계약 (implement skill mirror와 parity)

- **PRE-EDIT HARD GATE**: 구현 파일 수정 전 plan 상태 `구현중` + branch/worktree/worktree-owner 메타 채워짐 확인 필수
- **leaf-only 실행 계약**: 부모 체크박스 직접 실행/체크 금지. 자식 leaf만 실행하고, 부모는 자식 완료 후 자동 승격만 허용
- **T4/T5 implement 금지 3축**: (1) pre-merge, (2) non-root-worktree, (3) non-main — 3축 중 하나라도 해당하면 T4/T5 금지
- **T3 implement 실행**: fix: plan이면 T3(재현/통합 TC)를 T2 직후 반드시 실행
- **manual-task filtering**: `MANUAL_TASKS.md` 항목 / `(→ MANUAL_TASKS)` 태그 / 수동 키워드 매칭은 후보에서 제외 + 사용자 노출 금지

> 상세 contract는 implement skill mirror(`.claude`/`.agents`)를 따른다.

---

*이 파일은 Gemini CLI용 policy 파일입니다. Claude `.claude/skills/implement/SKILL.md`를 Gemini 제약에 맞게 변환한 버전입니다.*
