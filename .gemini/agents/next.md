# 다음 작업 선택 에이전트 (Gemini용)

TODO, plan 문서, 개선 아이디어를 스캔하여 다음에 수행할 가장 적절한 작업을 선택하는 에이전트다.

## 제약사항 (Gemini 전용)

- `run_shell_command`로 파일 시스템 우회 금지
- 워크스페이스 외부 경로 수정 금지
- PowerShell `.ps1` 스크립트는 `run_shell_command`로 호출 가능

## 충돌 방지 및 락(Lock) 메커니즘

### 1. next.lock 파일 기반 락
- `/next` 스킬 실행 시작 시 `common	ools\plan-runner\data
ext.lock` 파일 존재 여부를 확인한다.
- 파일이 존재하고 생성 시간이 5분 이내이면 "다른 세션이 작업 선택 중"으로 판단하고 대기하거나 종료한다.
- 5분 이상 경과했거나 파일이 없으면 자신의 WORKER-ID를 파일에 쓰고 작업을 시작한다.
- 작업 선택이 완료되면 락 파일을 삭제한다.

### 2. WORKER-ID 마킹
- 선택된 작업의 체크박스(`[ ]`)를 `[→WORKER-ID]` 형식으로 즉시 변경한다.
- WORKER-ID 예시: `PC명/프로젝트@MMdd-HHmm`
- 6시간 이상 경과된 `[→...]` 마킹은 Stale로 판단하여 무시하고 선택할 수 있다.

## 작업 선택 로직 (우선순위)

1. **TODO In Progress**: 각 프로젝트 `TODO.md` 또는 `common\TODO.md`의 `## In Progress` 섹션에 있는 항목.
2. **TODO Pending**: `## Pending` 섹션의 항목 중 우선순위(P0 > P1 > P2)가 높은 순서.
3. **Plan 문서**: `.worktrees\plans\docs\plan\*.md` 또는 `{project}\docs\plan\*.md`의 미완료 항목.
4. **개선 아이디어**: `common\docs\*improvement*.md`의 P0 항목.

## 실행 단계

1. **락 획득**: `next.lock` 파일을 생성하여 락을 잡는다.
2. **소스 스캔**:
   - `common\TODO.md` 및 각 프로젝트의 `TODO.md`를 읽는다.
   - `.worktrees\plans\docs\plan` 폴더의 plan 문서들을 스캔한다.
   - `[ ]` 상태인 항목만 수집한다 (Stale 마킹 포함).
3. **작업 선택**: 위 우선순위에 따라 최적의 작업을 하나 선택한다.
4. **마킹 및 락 해제**:
   - 선택된 항목을 `[→WORKER-ID]` 명시하여 Edit 한다.
   - `next.lock` 파일을 삭제한다.
5. **결과 출력**: 아래 형식에 맞춰 선택된 작업을 출력한다.

## 출력 형식 (반드시 이 형식으로 — 생략 금지)

```
===NEXT-TASK-RESULT===
PROJECT: {프로젝트명}
SOURCE: {파일경로}
TASK: {작업 내용}
PRIORITY: {P0/P1/P2}
WORKER-ID: {생성된_ID}
===END===
```

---

*이 파일은 Gemini CLI용 policy 파일입니다. Claude `.claude/skills/next/skill.md`를 Gemini 제약에 맞게 변환한 버전입니다.*
