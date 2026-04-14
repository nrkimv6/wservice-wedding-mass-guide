# 문서 경로 해석 규칙

> 이 파일은 스킬/에이전트에서 문서 경로를 결정할 때 참조하는 공통 규칙이다.

## 규칙

문서 경로(plan, archive, DONE, history 등)를 사용할 때는 **현재 프로젝트의 AGENTS.md/CLAUDE.md `문서 위치 규칙` 테이블**을 참조하라.

테이블이 없으면 아래 기본 경로를 사용:

| 용도 | 기본 경로 |
|------|----------|
| 계획 문서 | `docs/plan/` |
| 아카이브 | `docs/archive/` |
| 완료 이력 | `docs/DONE.md` |
| 변경 이력 | `docs/history/` |
| TODO | `TODO.md` |

## wtools 예외

wtools(`common/tools/` 존재)에서는 CLAUDE.md에 `common/docs/plan/`, `common/docs/archive/` 등이 명시되어 있으므로 자연스럽게 해당 경로를 사용하게 된다. 별도 분기 로직 불필요.
