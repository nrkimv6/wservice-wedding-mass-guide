# auto-done

> **트리거**: plan-runner Stage 6 전용 — `_run_auto_done_via_cli()` 호출 시 자동 활성화
> **모델**: haiku (경량, done flow는 명확한 절차적 작업)
> **직접 호출 금지**: 이 agent는 plan-runner가 자동 호출. 수동 완료 처리는 `/done` 스킬 사용.

## 입력 규약

프롬프트 첫 줄에 plan 파일 절대경로가 전달된다:

```
/path/to/docs/plan/YYYY-MM-DD_{주제}_todo.md
```

- 이 경로의 `_todo.md`가 **primary 작업 파일**이다
- 같은 디렉토리에 `YYYY-MM-DD_{주제}.md` (원본 plan)이 `docs/archive/`에 이미 있을 수 있다

## 전제조건 (생략)

> **자동 파이프라인에서 호출되므로 worktree/branch 검증은 불필요.**
> plan-runner Stage 6 도달 시점에 MergeWorkflow가 이미 worktree와 branch를 삭제한 상태이다.
> (수동 `/done` 경로에서만 2.5단계 검증이 필요)

## 처리 절차

done SKILL.md 2단계~8단계를 순서대로 실행:

### 1. plan 문서 완료 체크 & 진행률 업데이트

- `_todo.md` 내 `[ ]` → `[x]` 전환 (미완료 항목 있으면 경고 후 계속)
- 헤더 `> 상태:` → `구현완료`, `> 진행률:` → `N/N (100%)`
- 푸터 `*상태: ... | 진행률: ...*` 동기화

### 2. plan 문서 아카이브

- `_todo.md` → `docs/archive/YYYY-MM-DD_{주제}_todo.md` (`git mv`)
- 원본 plan `.md`가 `docs/plan/`에 아직 있으면 → `docs/archive/`로 함께 이동 (`git mv`)
- 이미 `docs/archive/`에 있으면 스킵
- `git add` 스테이징

### 3. TODO → DONE 이동

- `{project}/TODO.md` 열기
- plan과 연관된 항목을 `In Progress`/`Pending`에서 제거
- `{project}/docs/DONE.md` 상단에 `- [x] {오늘날짜}: {제목}` 추가

### 4. DONE.md 아카이브 (10개 초과 시)

- 10개 초과 시 오래된 항목 → `docs/archive/DONE-YYYY-MM.md`로 이동

### 5. wtools/TODO.md 동기화

- wtools 내부(현재 디렉토리에 `common/` 존재)일 때만 실행
- 해당 프로젝트 섹션 갱신, "마지막 업데이트" 오늘로 갱신

### 6. 커밋

```powershell
# 1순위: bash에서 powershell.exe 경유
powershell.exe -Command "Set-Location '{레포경로}'; & 'D:\work\project\tools\common\commit.ps1' 'docs: done — {plan 제목}'"

# 2순위: commit.sh
cd "{레포경로}" && bash "/d/work/project/tools/common/commit.sh" "docs: done — {plan 제목}"
```

## 실패 처리

- 오류 발생 시 에러 메시지를 stdout에 출력하고 종료
- 재시도는 plan-runner 책임 (이 agent는 단순 실행)
- **절대 git reset, git checkout, git clean 실행 금지** — 상태 오염 방지

## 출력 계약

성공 시:

```
auto-done 완료: {plan 제목}
- archive: {archive 경로}
- todo_archive: {_todo archive 경로}
- commit: {커밋 해시 또는 "완료"}
```

실패 시:

```
auto-done 실패: {plan 제목}
ERROR: {오류 메시지}
```
