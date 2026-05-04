---
name: batch-done
description: "완료 plan 일괄 done 처리 (full done flow). Use when: 일괄 done, batch done, 전체 완료 처리"
---


<!-- script-contract-invariant -->
## Script Contract Invariant

Completed-plan discovery is a helper contract. Use `common\tools\archive-sweep.ps1 -CandidatesOnly -Json` to collect checkbox-complete candidates and branch/worktree skips, then call `common\tools\auto-done.ps1 -PlanFile <plan> -Json` for the full TODO->DONE/archive flow. Do not duplicate candidate tables by ad hoc grep unless the helper is unavailable and the failure is reported.
# 완료 plan 일괄 done 처리

체크박스 100% 완료된 `_todo.md` 파일을 기계적으로 탐색하여 full done flow(아카이브 이동, TODO→DONE, wtools 동기화, 커밋)를 일괄 처리합니다.

## 트리거

- "일괄 done", "batch done", "전체 완료 처리", "다 완료된 거 처리해"

## archive-sweep vs batch-done 역할 차이

| | `/archive-sweep` | `/batch-done` |
|--|--|--|
| 완료 판정 | haiku LLM 판단 | 체크박스 100% 기계적 판정 |
| 처리 범위 | archive 이동만 | full done flow (TODO→DONE, wtools sync, commit) |
| worktree 점검 | 포함 (스킵) | 포함 (스킵) |
| 대상 파일 | `.md` (plan 원본) | `_todo.md` (작업 파일) |

## 실행 단계

### 1단계: 완료 파일 수집

**프로젝트 경로 해석:**

```powershell
$configPath = "D:\work\project\service\wtools\.claude\projects.json"
$config = Get-Content $configPath | ConvertFrom-Json
```

**스캔 대상:**

```
CLAUDE.md 문서 위치 규칙의 plan 경로/*_todo.md  (모든 프로젝트)
```

**완료 판정 기준 (기계적 — LLM 불필요):**

- 파일 헤더에서 `> 진행률: N/N (100%)` 정규식 매치
- 또는 파일 전체에서 `- [ ]` 패턴이 0개 + `- [x]` 패턴이 1개 이상

**deterministic parser 허용 범위**: 위 checkbox/header 정규식과 `> branch:`/`> worktree:` 추출은 구조화된 문법을 읽는 deterministic parser다. 자연어 키워드로 완료/스킵/아카이브를 판단하지 않는다.

### 2단계: 전제조건 검증 (worktree/branch 존재 여부)

각 완료 파일에 대해:

1. 파일 상위 20줄에서 `> branch:` / `> worktree:` 값 추출
2. `> branch:` 값 있으면 → `git branch --list {값}` 실행 → stdout이 비어있지 않으면 **제외**
3. `> worktree:` 값 있으면 → `git worktree list` 출력에서 해당 경로 포함 여부 → 포함이면 **제외**
4. 제외된 파일은 `[SKIP]` 로그와 함께 결과 보고에 포함

### 3단계: 사용자 확인

검증 통과 파일을 테이블로 출력:

```
처리 예정 파일 목록:
| 파일명 | 프로젝트 | 진행률 |
|-------|---------|-------|
| 2026-01-01_foo_todo.md | monitor-page | 10/10 (100%) |
| 2026-01-02_bar_todo.md | wtools | 5/5 (100%) |

스킵 (worktree/branch 존재):
| 파일명 | 이유 |
|-------|------|
| 2026-01-03_baz_todo.md | branch impl/baz 존재 |

위 N개 파일을 일괄 done 처리합니다. 계속할까요?
```

사용자 확인 후 진행.

### 4단계: 순차 처리

각 파일에 대해 **done SKILL.md 2단계~8단계** 순서대로 처리:

1. plan 문서 완료 체크 & 진행률 업데이트
2. (2.5단계 스킵 — 이미 3단계에서 검증 완료)
3. plan 문서 아카이브 (`_todo.md` + 원본 plan 함께 `git mv`)
4. TODO → DONE 이동
5. DONE.md 아카이브 (10개 초과 시)
6. wtools/TODO.md 동기화
7. 완료 검증
8. 커밋 (`docs: batch done — {파일명들}`)

**실패 시 동작**: 해당 파일만 스킵 후 다음 파일 계속 처리. 실패 파일은 결과 요약에 기록.

### 5단계: 결과 요약

```
batch-done 완료

성공 (N개):
- 2026-01-01_foo_todo.md
- 2026-01-02_bar_todo.md

실패 (N개):
- 2026-01-04_err_todo.md — 오류: git mv 실패

스킵 (N개):
- 2026-01-03_baz_todo.md — branch impl/baz 존재
```

## 주의사항

- **LLM 판정 없음**: 체크박스 카운트만으로 완료 판정. LLM 판단이 필요한 경우 `/archive-sweep` 사용.
- **순차 처리**: 각 파일을 하나씩 처리 (병렬 처리 시 git 충돌 위험).
- **커밋 단위**: 파일별 개별 커밋 또는 전체 일괄 커밋 — 파일 수에 따라 판단.

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **커밋**: `commit "message"` **필수** (git commit 명령어 절대 사용 금지)
