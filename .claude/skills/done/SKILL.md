---
name: done
description: "구현 완료 후처리 (plan 체크, archive, TODO→DONE, commit). Use when: 완료, 끝, done, 마무리, 완료처리"
---



<!-- script-contract-invariant -->
## Script Contract Invariant

The deterministic completion flow is owned by `common\tools\auto-done.ps1`. Use `-DryRun -Json` for preflight evidence and `-Json` for structured result reporting when possible. In `-Json` mode, blocked results are machine-readable contract payloads; consume the `tool=auto-done` JSON object from stdout and do not depend on trailing human `Write-Error` text. AI remains responsible for routing (`/merge-test` vs `/done`), conflict classification, and deciding whether helper failure requires owner intervention.
> Routing gate: branch/worktree present -> /merge-test; absent -> /done
# 구현 완료 후처리

> **본문 분리 원칙**: 호출 컨텍스트가 다르면 본문도 다르다. 공유 레시피는 [`_recipes.md`](./_recipes.md)로만.

구현 완료 후 문서 정리와 커밋을 자동으로 처리합니다.

## Routing Gate Summary

- Gate: `branch/worktree present -> /merge-test; absent -> /done`
- plan 헤더에 `> branch:` 또는 `> worktree:`가 있으면 `/done`을 중단하고 `/merge-test`를 먼저 실행한다.
- plan 헤더에 두 필드가 모두 없을 때만 `/done`이 직접 archive/TODO→DONE/커밋을 처리한다.
- 이 기준은 `/implement`의 완료 후 owner 선택 및 `/merge-test`의 전제 조건과 같은 계약이다.
- 사용자가 "파일 닫어", "파일 닫기", "닫어", "닫기", "마무리"처럼 closeout을 지시하면 대상 plan의 `> branch:`/`> worktree:` 헤더를 먼저 읽는다.
- `branch/worktree present -> /merge-test; absent -> /done` 판정은 같은 턴에서 수행하며, 사용자에게 같은 지시를 다시 입력하라고 떠넘기지 않는다.
- `/merge-test` owner가 필요하면 같은 턴에서 local/project `/merge-test` `SKILL.md`를 읽고 이어간다.

### 세션 dirty 계약 (정의)

- **baseline dirty paths**: 스킬 시작 시점 `git status --short` 결과에서 추출한 dirty path 목록. 세션 시작 시 1회 고정.
- **touched paths**: 이 스킬 실행 중 agent가 직접 Edit/생성/git mv한 파일의 path 집합. 세션 내에서 점진적으로 추가된다.
- **self residual dirty**: 세션 종료 전 `current dirty ∩ $TouchedPaths`. agent가 만들었지만 아직 커밋하지 않은 dirty.
- **touched preexisting dirty**: baseline에 이미 있었으나 `$TouchedPaths`에도 포함된 path. agent가 같은 컨텍스트에서 수정했으면 whitelist 안에서는 커밋 책임이 agent에게 있다.
- **touched whitelist dirty**: docs commit root 기준 `TODO.md`, `docs/DONE.md`, `docs/plan/*.md`, `docs/archive/*.md`, `docs/history/*.md` 안에서 `$TouchedPaths`와 현재 dirty가 만나는 path. wtools에서는 `TODO.md`/`docs/DONE.md`가 `.worktrees/plans/TODO.md`/`.worktrees/plans/docs/DONE.md`를 뜻한다. repo root ledger는 touched whitelist가 아니다. 성공 종료 전 exact path set으로 커밋해야 하며, 커밋할 수 없으면 hard-fail한다.
- **related-plan dirty**: `$TouchedPaths`에는 없더라도 현재 plan/Phase Z/검증 로그/직전 `/merge-test` 출력/직전 `impl/post-merge-*` branch나 merge evidence에 등장한 코드·테스트 path가 현재 dirty로 남은 상태. 특히 `tests/*.py` 일반 테스트, `app/*`, `frontend/*`, `scripts/*`는 whitelist에 직접 추가하지 않고 이 관련성 근거로만 승격한다.
- **post-merge-owned dirty**: `/merge-test`의 post-merge repair branch, repair commit, final merge commit evidence에 포함된 path가 `/done` 진입 시 아직 dirty인 상태. 이는 self residual이 아니어도 현재 owner chain의 커밋 책임이다.
- **UNTRACKED_ORIGIN_BLOB_RESIDUE**: current HEAD에는 없고 `origin/main` 같은 upstream ref에는 tracked이며 local untracked blob hash가 upstream blob hash와 같은 파일. normal unrelated dirty가 아니며 `pre-existing unrelated dirty`만으로 무시할 수 없다.
- **UNTRACKED_OVERWRITE_RISK**: current HEAD에는 없고 upstream에는 tracked인 path가 local untracked로 남아 pull/merge 시 overwrite될 수 있는 파일. hash가 같지 않으면 origin blob residue는 아니지만 closeout evidence 표에는 별도 위험으로 남긴다.
- **residue closeout gate**: archive move 전 target repo root와 downstream repo root를 `common\tools\plan-runner\core\residue_detector.py` 계약으로 검사한다. `UNTRACKED_ORIGIN_BLOB_RESIDUE`가 있으면 `commit`, `quarantine`, `explicit preserve with owner plan` 중 하나의 evidence가 있어야 하며, 없으면 `UNTRACKED_ORIGIN_BLOB_RESIDUE_BLOCKED`로 상태 변경 없이 중단한다. 실패 payload에는 path, `head_deleted`, `upstream_tracked`, `hash_equal`, `no_unmerged_state`, candidate owner plan, dirty-left plan을 포함한다.
- **preexisting staged paths**: 스킬 시작 시점과 commit 직전의 `git diff --cached --name-status`로 읽은 staged path 목록. current owner의 expected staged set이 아니면 unrelated staged inclusion 위험이다.
- **expected staged set**: 현재 owner가 실제로 생성/수정/삭제/이동한 exact path set이다. archive move pair는 source deletion과 destination add를 expected staged set에 함께 넣는다.
- **staged ownership**: commit 직전 staged set이 비어 있거나 expected staged set과 정확히 일치해야 하는 계약이다. preexisting staged가 current owner expected staged set이 아니면 `commit.ps1` 호출 전 hard stop이다.

## 트리거

- "완료", "끝", "done", "마무리"
- 구현이 끝났을 때

## Corrective Action Boundary

- 완료/정리 단계에서 leftover item 삭제와 기능 rollback을 같은 cleanup으로 묶지 않는다.
- `TrackingItem id=5 삭제` 같은 특정 DB item 조치는 `data_cleanup`으로 분리하고, scheduler 경로 삭제, 기능 제거, commit revert, migration 제거 같은 `feature_rollback`은 별도 명시 승인 없이는 수행하지 않는다.
- done closeout summary는 실행한 mutation class와 실행하지 않은 mutation class를 분리해 남긴다.

## 세션 targets / continue 계약 (필수)

- 사용자가 같은 세션에 plan 경로를 2개 이상 명시하면, 그 목록은 **session targets**로 고정한다.
- "남은 항목" 또는 "남은 plan" 응답은 기본적으로 이 **session targets**만 기준으로 산정한다.
  - global backlog(`.worktrees/plans/TODO.md` 전체 큐)는 자동 합류시키지 않고 **참고 backlog** 섹션으로만 분리해 출력한다.
  - session targets가 0건이면 `남은 session target 없음`으로 닫는다. 사용자가 global backlog 진행을 명시하지 않았으면 다음 backlog를 자동 실행하지 않는다.
- `/done`은 closeout 톤의 "최종 종료"가 아니라 **문서/아카이브 정리 owner**다.
  - 현재 target의 archive/DONE/TODO 정리를 끝냈더라도 **remaining targets**가 있으면 전체 완료로 말하지 않는다.
  - 출력은 `현재 target 완료, 남은 target N개` 형태로 남기고, 다음 target 처리(대개 `/implement` 재진입)로 **같은 턴에서 계속** 진행한다.
- session targets는 처리 전 반드시 `eligible`, `blocked`, `already_archived`, `ignored` partition으로 분류한다.
  - `eligible`이 1건 이상이면 `blocked` target이 있어도 eligible target의 archive/DONE/TODO 정리는 계속 진행한다.
  - `blocked` target은 target-local reason(`plan_incomplete`, `phase_z_incomplete`, `branch_worktree_present`, `ds_evidence_missing`, `non_product_only`, `dirty_conflict` 등), 필요 owner, 남은 path를 closeout에 남긴다.
  - 검증 실패로 blocked된 target은 `failure_class`, `blocks_archive`, `blocks_other_targets`, `next_owner`를 같이 남긴다. `failure_class`는 `product_regression`, `contract_regression`, `test_fixture_stale`, `environment_failure` 중 하나로 분류한다. `blocks_other_targets=false`인 row는 session 전체 중단 근거가 아니며 다른 eligible target의 archive/DONE/TODO 정리를 계속한다.
  - `failure_class=test_fixture_stale` 또는 `environment_failure`는 전체 보류/전체 중지 근거로 승격하지 않고 target-local warning/blocker로만 남긴다.
  - `already_archived` target은 성공-equivalent로 집계하되 archive metadata/TODO/DONE을 재삽입하거나 재이동하지 않는다.
  - `ignored`는 session target 밖 backlog 또는 명시 제외 항목만 허용하며, session target 누락을 ignored로 숨기지 않는다.
- 완료 집계 표는 `already_archived`와 이번 턴에 실제 처리한 `processed_this_turn`을 분리해 출력한다.
  이미 archive된 target은 session read-back에는 포함하지만, 이번 턴 완료 수를 부풀리는 근거로 쓰지 않는다.
- `blocked` 또는 `excluded_unconfirmed` row가 하나라도 있으면 `전체 완료`, `모두 완료`, `마무리 완료` 표현을 금지한다.
- 사용자가 "남은 거"를 물으면 global backlog가 아니라 현재 session targets의 `remaining`/`blocked`/`excluded_unconfirmed`만 기준으로 답한다.
- 사용자가 `계속`, `멈추지마`, `끝날 때까지` 등으로 재지시한 경우:
  - 중간 성공(archive 완료, 커밋 완료)은 종료점이 아니라 **진행 업데이트**다.
  - 실제 중단은 hard blocker(충돌/커밋 실패/필수 evidence 누락 등)에서만 허용한다.

### 명시 다중 skill 호출 결과표

- 사용자가 `[$done] [$reflect]`처럼 여러 skill을 같은 턴에 명시하면 각 skill을 독립 target으로 취급하고 아래 결과표를 출력한다.
- 이미 완료된 plan에 대한 `/done`은 no-op 분기로 처리하되, archive/DONE/commit evidence를 read-back하고 `already_archived`로 보고한다. archive/TODO/DONE을 재삽입하거나 재이동하지 않는다.
- 일부 skill을 실행하지 못했으면 `남은 조치`에 같은 턴에서 이어갈 owner 또는 blocker를 적는다.

| skill | 실행 여부 | evidence | 남은 조치 |
|-------|-----------|----------|-----------|
| `{skill}` | `{executed|already_archived|blocked|skipped}` | `{archive path, DONE row, commit hash, blocker code}` | `{next owner 또는 없음}` |

## 실행 단계

### 0-pre단계: 세션 dirty baseline 기록

스킬 시작 직후, 어떤 파일도 건드리기 전에 실행한다:
1. root와 `.worktrees/plans` 각각에서 `git status --short`로 path 목록을 `$BaselinePaths`/`$PlansBaselinePaths`로 기록한다.
2. `$TouchedPaths`를 빈 set으로 초기화한다.
PowerShell 예시는 [`_recipes.md`](./_recipes.md)의 "baseline dirty 기록" 섹션 참조.

### 1단계: 관련 plan 문서 찾기

프로젝트 경로는 `D:\work\project\service\wtools\.claude\projects.json` 참조.

**wtools 감지**: 현재 디렉토리에 `common/tools/` 폴더 존재 여부로 판단.

### 1.1단계: 대상 plan anchor precedence (고정)

- **1순위**: 사용자가 plan 파일 경로를 명시했다면 그 경로만 primary anchor로 사용한다. (예: `/done D:\...\plan\2026-...md`)
- **1.1순위**: 1순위에서 0건이면 키워드 화이트리스트를 감지해 wtools plans 워크트리 fallback을 적용한다. 키워드와 탐색 순서는 review-plan/SKILL.md의 "입력 경로 fallback (키워드 기반)" 섹션과 동일하다.
- **2순위**: 직전 `/merge-test` 또는 `/implement` 흐름에서 `worktree-owner`/parent plan 경로가 명시돼 있으면 그 plan을 primary anchor로 고정한다.
- **3순위**: 위 둘이 없고 현재 대화에서 plan 링크가 **단 1개**면 그 plan을 anchor로 삼는다.
- **4순위**: 후보가 2개 이상이면 자동 선택하지 말고 **중단**하고 사용자에게 explicit plan 경로를 요청한다. (auto-switch 금지)
- unrelated active/dirty plan은 primary anchor에서 제외하고, 필요 시 "연관 plan 참고"로만 분류한다.

아래 **모든 경로**에서 현재 작업과 관련된 계획 문서를 찾습니다:

```
CLAUDE.md 문서 위치 규칙의 plan 경로/*.md
```

### 1.2단계: main 기존 수정사항 무시 모드 (사용자 명시 지시 시)

사용자가 "main의 기존 수정사항을 고려하지 말라"고 명시한 경우:

- 실행 지시문(고정): **"상관없는 main 변경 감지는 무시하고, 현재 plan 대상 레포 변경만 처리한다."**
- 루트(main worktree)의 기존 `dirty`/`untracked` 파일은 done 중단 사유로 취급하지 않는다.
- 루트(main)의 기존 수정 파일은 읽기/수정/복구/스테이징 대상에서 제외한다.
- plan 완료 판정, TODO→DONE 이동, 커밋 대상 판단은 현재 작업 워크트리(impl/\*) 변경분만 기준으로 수행한다.
- root dirty는 자동 커밋 대상이나 검증 중단 사유로 쓰지 않고, plans archive exact path set과 현재 owner chain path만 처리한다.
- ignored dirty는 `ignored_dirty` ledger로 보고하되 읽기/수정/stage 대상에서 계속 제외한다.
- 무시 모드는 "중단 판정 완화"에만 적용되며, 판정 범위를 제외한 동작은 기존 규칙을 유지한다.
- 단, `.git` 보호 규칙과 파괴적 명령 금지 규칙은 그대로 유지한다.

### 2단계: plan 문서 완료 체크 & 진행률 업데이트

**충돌 방지 마킹 해제**: `[→WORKER-ID]` 패턴 및 `[ ]`을 `[x]`로 변환.

**진행률 계산 후 헤더·푸터 업데이트** (`> 진행률: N/M (%)` + `*상태: ... | 진행률:...*`).

**완료 판단 시 MANUAL_TASKS 항목은 제외합니다.** 코드블럭 내 `[ ]`는 카운트에서 제외.

**Canonical metric 계약 (progress contract):**
- archive progress의 canonical source는 `Get-PlanMetadata()`(PS) 또는 `PlanParser.get_plan_progress()`(Python)이 계산한 helper-based checkbox count다.
- archive 헤더(`> 진행률:`), archive 본문 헤더, 푸터(`*상태: ... | 진행률:...*`), plans TODO ledger sync는 모두 같은 `(done, total)` tuple을 출력해야 한다.
- "기존 헤더 텍스트 복사"는 canonical metric과 대조 후 일치할 때만 유효한 표현 방식이며, 독립 source-of-truth로 사용 금지.
- leaf 재계산이나 phase별 별도 집계를 독립 source-of-truth로 사용 금지.
- 선행 계약: `.worktrees/plans/docs/plan/2026-03-04_fix-checkbox-count-consistency.md` "single counting function" 원칙.

**deterministic parser 허용 범위**: checkbox count, progress header/footer, `> branch:`/`> worktree:`, `MERGE_HEAD`, unmerged marker, `git status --porcelain`은 구조화된 상태 입력이므로 deterministic parser로 유지한다. 자연어 키워드만으로 완료, archive, 수동 작업 제외, 또는 차단을 확정하지 않는다.

**4-surface 대조 read-back 규칙 (archive 완료 직후):**
1. archive file read-back: `> 진행률:` 헤더값 추출
2. archive file read-back: `*상태: ... | 진행률:...*` 푸터값 추출
3. `.worktrees/plans/TODO.md`: 해당 plan 진행률 값 추출
4. 위 3개 값이 canonical metric `(done/total)`과 모두 일치하는지 확인
5. 불일치가 있으면 경고 출력 후 커밋 전 수동 수정 (auto-done.ps1은 hard stop)
6. plan/archive 본문에 `Phase Z` 또는 `> 머지커밋:`이 있으면, archive read-back에서 `Phase Z` 미완료 0건 + `> 머지커밋:`이 실제 merge commit evidence로 보존되는지 확인한다. `> 후속정리커밋:`이 있으면 현재 main HEAD 또는 현재 main HEAD로 이어지는 post-merge docs cleanup commit evidence로 검증한다.
7. plan/archive 본문에 T4/T5 phase 또는 `T4/T5 evidence table` requirement가 있으면 archive 전 `stage|command|cwd|result|exit_code|log_ref|blocker_code` schema의 T4/T5 evidence table, 또는 explicit `> T4 E2E 해당 없음:`/`> T5 HTTP 해당 없음:` read-back을 확인한다.
8. final summary는 `target_read_back.active_exists=false`, `target_read_back.archive_exists=true`, `done_ledger_state=present`, `todo_ledger_state=absent`가 확인된 target만 `완료`로 보고한다. code merge만 끝났거나 archive/DONE/TODO read-back이 모자란 target은 `archive pending` 또는 `blocked`로 분리한다.
9. `active_exists=false`, `archive_exists=true`, `DONE present`, `TODO absent`, `상태=구현완료`, `진행률=100%` read-back 전에는 "완료", "다 했다", "추가 작업 없음"이라고 말하지 않는다. 하나라도 부족하면 `target_read_back_incomplete`로 남긴다.

### 1.5단계: 사전 검증 (구현완료 설정 전 게이트)

> **🔴 이 검증은 상태를 "구현완료"로 변경하기 전에 반드시 통과해야 한다.**
> 검증 실패 시 상태 변경 없이 즉시 중단한다.

| 게이트 | 트리거 조건 | 통과 조건 | 실패 시 동작 | 비고 |
|--------|-------------|-----------|--------------|------|
| **2.5 branch/worktree 차단** | plan 헤더에 `> branch:` 또는 `> worktree:` 필드 존재 | 두 필드 모두 없음 | "plan에 활성 branch/worktree가 있습니다. 먼저 /merge-test를 실행하세요." + 중단 | 자동 파이프라인(plan-runner Stage 6) 면제 |
| **2.55 post-merge finalization** | plan/archive 본문에 `Phase Z` 또는 `> 머지커밋:` 존재 | `Phase Z` 미완료 0건 + `> 머지커밋:`이 실제 merge commit evidence로 보존됨. `> 후속정리커밋:`이 있으면 current HEAD 또는 current HEAD로 이어지는 post-merge docs cleanup evidence와 일치 | "archive false-complete 위험: Phase Z/머지커밋/후속정리커밋 finalization이 덜 끝났습니다. /merge-test owner step을 먼저 마무리하세요." + 중단. `> 머지커밋:` 누락이면 `write_merge_commit_to_plan` 미실행 가능 — `/merge-test`를 재실행하거나 수동으로 `> 머지커밋:` 헤더를 삽입한다. | stale merge metadata/unchecked Phase Z 차단 |
| **2.6 fix: Phase R 누락** | 파일명에 `_fix-`/`_fix_` 포함 또는 제목이 `fix:`로 시작 | plan 본문에 `재발 경로 분석` 또는 `Phase R` 존재 + Phase R 섹션 내 "미방어" 없음 | "fix: plan에 Phase R이 없습니다." + 중단 | Phase R 섹션 내 "미방어" 잔존 시에도 중단 |
| **2.7 DB-Direct evidence** | plan/archive 본문에 `Phase DB-Direct` 존재 | `실행 SQL/명령`, `존재 확인 쿼리`, `live API 또는 runtime 결과` 3종 모두 확인 | "Phase DB-Direct 실행 증거 부족. /merge-test에서 evidence를 남기세요." + 중단 | 3종 중 하나라도 없으면 중단 |
| **2.75 external remote evidence** | plan 또는 split `_todo-*` leaf 본문에 `push`, `origin/main`, `remote`, 외부 repo 목록이 존재 | `git ls-remote origin main`, `git show origin/main:<path>`, 또는 대상 repo의 `origin/main content read-back` evidence 확인 | "external remote evidence 대기: local commit만으로 구현완료/archive 처리할 수 없습니다." + 상태 변경 없이 중단 | 외부 repo push leaf는 remote read-back 전까지 완료 금지 |
| **2.76 product-surface evidence scope** | plan 헤더에 `> completion-scope: product_surface` 또는 `> completion scope: product_surface` 존재 | evidence에 product surface path/read-back(`app/`, `frontend/`, `backend/`, `src/`, `packages/`, `services/`, `common/tools/` 등) 1개 이상 존재하거나 scratch/private utility evidence만 존재하지 않음 | `non_product_only`로 target-local blocked 처리. 상태 변경/archive/TODO→DONE 금지 | `scripts/scratch/`, `scratch/`, `tmp/`, `private/`, `.private/` 등만으로 product-surface plan 완료 금지 |
| **2.77 T4/T5 evidence table** | plan/archive 본문에 `Phase T4`, `Phase T5`, 또는 `T4/T5 evidence table` requirement 존재 | target별 `stage`, `command`, `cwd`, `result`, `exit_code`, `log_ref`, `blocker_code` row completeness 확인. 해당 없음은 explicit blockquote read-back과 non-empty `blocker_code` 필요 | `t4_t5_evidence_missing`, `t4_t5_not_run`, `t4_t5_blocked` 중 하나로 target-local blocked 처리. 상태 변경/archive/TODO→DONE 금지 | `merge`/`broad pytest`/`collect-only`만으로 archive 금지 |
| **2.8 owner set 역할 판정** | plan 헤더에 `> worktree-owner:` 필드 존재 | 역할 판정 후 분기 처리 완료 | 아래 별도 bullet 참조 | 필드 없으면 일반 단독 plan → 스킵 |
| **2.9 Phase 파일 vs git 이력 교차 경고** | plan 본문 Phase 1~N에 `app/`, `scripts/`, `frontend/` 패턴 파일 경로 언급 존재 | (경고만, non-blocking) | plan Phase 언급 파일 중 `git log --name-only HEAD~20` 이력에 없는 파일 목록을 `⚠️ Plan Phase에 언급된 파일 중 git 이력에서 수정 흔적 없음: {파일 목록}. 미구현 가능성을 확인하세요.` 로 출력 | hard block 금지 — 외부 PR/다른 worktree 구현 시 false positive 방지 |

**T4/T5 evidence parser contract:** inline code evidence table 셀은 `common\tools\auto-done.ps1` helper가 보존해야 한다. 사람이 먼저 backtick을 제거하거나 parser-safe rewrite로 표를 고치는 방식은 fallback이 아니며, helper가 `command`, `cwd`, `blocker_code`를 읽지 못하면 helper/parser 결함으로 분류한다.

**already_archived_resume contract:** helper JSON이 `already_archived_resume=true`를 반환하면 archive 이동을 반복하지 않는다. `searched_paths`와 `resumed_steps`를 read-back해 TODO/DONE/read-back/commit 잔여 단계만 이어가며, active path 부재 자체를 실패로 승격하지 않는다.

**2.8 owner set 역할 판정 분기:**

1. `> worktree-owner:` 값을 쉼표로 split + trim → owner set 구성 (빈 토큰 제외, `\`/`/` 정규화)
2. **역할 판정**: owner set 첫 항목 == 현재 plan 경로 → **primary** / 두 번째+ 항목 중 현재 경로 포함 → **attached** / 없음 → 일반 단독 plan (스킵)
3. **attached인 경우**: 자기 헤더 3필드 제거 → primary `> worktree-owner:`에서 자기 경로 제거 → 실패 시 `OWNER_SET_CROSS_UPDATE_FAILED` 중단 → plans 워크트리에서 `chore: detach {slug}` 커밋 → 자기 plan만 대상으로 계속 진행
4. **primary이고 owner set 길이 ≥ 2**: `ATTACHED_NOT_COMPLETED: {N}개 attached plan 먼저 /done 완료` + 중단
5. **primary이고 owner set 길이 = 1**: 자기 헤더 3필드 제거 후 정상 완료 처리

> 1.5단계를 통과한 경우에만 아래 2단계(구현완료 상태 설정 + 반영일시 기록)로 진행한다.
**모든 항목 완료 시 상태 변경:**
```markdown
> 상태: 구현완료
> 반영일시: YYYY-MM-DD HH:MM
> 진행률: 2/2 (100%)
...
*상태: 구현완료 | 진행률: 2/2 (100%)*
```

`반영일시`는 상태를 `구현완료`로 변경하는 시점의 로컬 시각을 분 단위로 기록한다.

### 3단계: plan 문서 아카이브 (모든 항목 완료 시)

- archive `git mv` 시 원본 plan path와 archive destination path를 `$TouchedPaths`에 추가한다.

plan 문서의 모든 체크박스가 `[x]`이면:

planless branch는 archive 대상이 아니다. batch/done 보고에서는 `plan 없음` row로 분리하고, archive 없음 사유와 worktree/branch cleanup 결과를 별도 상태로 남긴다.
root guard 차단은 정상 방어다. `/done`은 `.agents/`, `.claude/`, `.gemini/`, `app/`, `frontend/`, `scripts/`, `tests/` 같은 구현성 파일을 root main에서 직접 커밋하지 않는다.
root guard가 staged `.agents/.claude/.gemini` sync merge를 차단하면 `ROOT_GUARD_BLOCKED_PENDING_SYNC_MERGE` evidence로 기록하고, root direct commit 또는 local merge resolution으로 닫지 않는다. 보존/abort evidence를 남긴 뒤 ff-only 복구 절차 또는 upstream sync 재생성, remote fast-forward 수신 evidence로만 전환한다. archive closeout 중 downstream sync evidence가 없으면 source repo에서 `git fetch origin` + `git rev-list --left-right --count HEAD...origin/main`을 먼저 실행하고, `ahead-only`(`left>0 && right=0`, `behind=0`)일 때만 `git push origin main` 또는 GitHub Actions `sync-skills.yml` `workflow_dispatch`를 시도한다. `diverged`(`left>0 && right>0`)이면 push-first 금지이며 `DOWNSTREAM_DIVERGED_PUSH_BLOCKED`로 중단한다. ff-only 불가능/권한 문제의 `NON_FF_SYNC_BLOCKED`와 diverged 상태의 `DOWNSTREAM_DIVERGED_PUSH_BLOCKED`는 서로 다른 blocker로 보고한다. trigger 실패는 `DOWNSTREAM_SYNC_TRIGGER_FAILED`로 중단한다.

**⚠️ archive 우려점 사장(沈沒) 경고 (blocking 아님)**

- `기술적 고려사항` 섹션에 질문형 bullet, TODO/FIXME, 임시 우회 메모가 남아 있으면 archive 후 활성 추적이 끊긴다.
- 이런 우려점은 archive 경로에 남아 있어도 **"이미 기록됨"으로 닫지 않는다**. 활성 추적이 필요하면 `/reflect`를 먼저 실행한다.

**🔴 TODO 파일 동반 아카이브 필수**

- `/done` 실행 시 Claude가 선택하는 **primary 파일은 TODO 파일**이다.
  (`_todo.md` 단일 파일 또는 `_todo-N.md` 복수 파일)
- **복수 TODO (`_todo-N.md`)**: 같은 stem의 `{stem}_todo-*.md`를 glob 탐색하여 **모든 `_todo-N.md`가 완료**(`[ ]` 잔존 없음)일 때만 전체 archive 진행. 대표 문서(`{stem}.md`)도 함께 archive.
  대표 문서의 진행률 = 모든 `_todo-N.md`의 `[x]` 합계 / 전체 체크박스 합계.
- **단일 TODO (`_todo.md`)**: 기존 동작 유지 — plan 원본도 함께 archive. (하위 호환)
- **단일 파일 plan** (TODO 분리 없음): plan 파일 하나만 아카이브.

**아카이브 이동 대상:**

| 형태 | primary | 동반 파일 |
|---|---|---|
| 분리 | `_todo-1.md`, `_todo-2.md`, ... | 대표 문서 `{stem}.md` |
| 단일 TODO | `_todo.md` | plan 원본 `{stem}.md` (archive에 있으면 스킵) |
| 단일 파일 | plan `.md` | 없음 |

1. **plan**: CLAUDE.md 문서 위치 규칙의 plan 경로 → CLAUDE.md 문서 위치 규칙의 archive 경로
**아카이브 이동 규칙:**
1. 반드시 `git mv` 사용 (`Move-Item`/`Remove-Item` 금지 — git 히스토리 유실)
2. orphan 도입 프로젝트: plans 워크트리 내에서 `git mv` 후 commit/push
3. plans 워크트리에서는 `Resolve-DocsCommitCandidates` 반환 파일만 add (`git add -A` 금지)
4. 미도입 프로젝트: 일반 `git mv`

PowerShell 풀 코드 → [_recipes.md](./_recipes.md)의 "archive 이동" 섹션 참조.

5. 아카이브 헤더 추가 (`git mv` 이동 후 Edit 도구 또는 Set-Content로 파일 상단에 삽입):

```markdown
# {제목}

> 완료일: YYYY-MM-DD
> 아카이브됨
> 진행률: N/N (100%)
> 요약: {원본 plan에서 복사}
```

5.5. archive 이동 직전과 직후 read-back에서 `Phase Z` 미완료 0건과 `> 머지커밋:` 실제 merge commit evidence 보존을 다시 확인한다. `> 후속정리커밋:`이 있으면 current HEAD 또는 current HEAD로 이어지는 post-merge docs cleanup evidence와 일치해야 한다. 하나라도 어긋나면 false-complete로 보고 중단한다.

5.6. LLM conflict resolve tracking item이 이전 plan path를 참조하면 `common/tools/auto-done.py`가 archive 이동 직후 monitor-page tracking CLI를 통해 plan 링크를 archive path로 best-effort 갱신한다. 미발견/미설정은 silent skip + 로그이며 done 흐름을 차단하지 않는다.

6. **LLM Wiki ingest** — archive 이동 + 헤더 추가 성공 후 반드시 호출. `/archive-sweep` 스킬의 "LLM Wiki ingest" 절차에 위임. ingest 실패는 경고만, done 전체 흐름은 중단하지 않음. `/archive-sweep` 스킬 본문을 읽을 수 없거나 해당 절차가 없으면 fallback으로 `POST http://localhost:8001/api/v1/plans/records/ingest`를 단건 호출하며, request body에는 `file_path`, `project`, `raw_content`를 포함한다. 이 fallback 실패도 archive 이동을 되돌리지 않고 경고와 복구 힌트로 남긴다.

7. **Archive reference drift gate** — archive 이동 직후 현재 repo의 `docs/plan` 및 `docs/archive`에서 이동 전 plan filename/path를 직접 가리키는 참조를 검색한다.
   - 수정 범위는 현재 repo 안의 직접 stale path만이다. 모든 과거 문서의 역사적 설명을 현대화하지 않는다.
   - 클릭 가능한 현재경로 구 `docs/plan/...`와 legacy literal `common/docs/plan/...`(drift detection 대상 전용) 참조는 현재 archive 경로 또는 경로 없는 제목 언급으로 보정한다.
   - 의도적 역사 기록으로 남기는 경우에는 왜 stale path가 아닌지 근거를 본문 또는 plan 결과에 남긴다.
   - unresolved direct stale reference가 남으면 완료 검증에서 경고하고, 일반 완료 선언 전에 수정하거나 의도적 예외로 분류한다.

### 3.5단계: 금지어 체크 (fix: plan만)

fix: plan인 경우, 안내 텍스트와 커밋 메시지에 아래 표현이 포함되면 경고 후 대체:
- ❌ "근본 수정", "근본 해결", "완전 해결", "최종 수정", "영구 수정"
- ✅ 대체: "N개 경로 방어 완료", "재발 경로 M개 중 M개 방어됨"

### 4단계: TODO → DONE 이동 (수동 검증 항목 분리)

- docs commit root 기준 TODO.md, docs/DONE.md 수정 시 해당 path를 `$TouchedPaths`에 추가한다. wtools root `TODO.md`/`docs/DONE.md`/`wtools/TODO.md`는 직접 수정하지 않는다.

**canonical TODO ledger 확인:**
```
.worktrees/plans/TODO.md
```

**수동 검증 항목 식별 절차:**

A. plan 문서의 `## 구현 순서` 아래 모든 체크박스 항목(`- [ ]`, `- [x]`) 텍스트를 스캔
B. 각 항목 텍스트에 수동 작업 판단 키워드가 포함되어 있거나, `(→ MANUAL_TASKS)` 태그가 이미 존재하는지 확인 (키워드 OR 태그 존재 = 수동 항목으로 판정)
C. 매칭된 항목을 추출하여 리스트로 수집


**수동 작업 판단 키워드**: `common/docs/guide/project-management/manual-tasks-format.md` 참조
키워드 목록 전체 + MANUAL_TASKS.md 생성 예시 → [`_recipes.md`](./_recipes.md)의 "MANUAL_TASKS 분리 절차" 섹션 참조.

**MANUAL_TASKS.md 생성/갱신:**
1. 위치: `{project}/MANUAL_TASKS.md` (없으면 신규 생성)
2. `## 미완료` 섹션 하단에 항목 추가: `- [ ] {내용} — from: {plan파일명.md}#{번호} ({날짜})`
3. 중복 방지: 이미 같은 `from:` 참조가 있으면 스킵
4. plan 문서: 수동 항목은 `[x]` + `(→ MANUAL_TASKS)` 태그 추가

**완료 상태는 MANUAL_TASKS 제외 후 판단합니다.**

**완료된 항목을 docs/DONE.md로 이동:** `.worktrees/plans/TODO.md`에서 제거 → `.worktrees/plans/docs/DONE.md` 상단에 추가.

### 5단계: DONE.md 아카이브 (10개 초과 시)

docs commit root 기준 `docs/DONE.md` 항목이 10개를 초과하면:
1. `.worktrees/plans/`가 있는 프로젝트는 오래된 항목 → `.worktrees/plans/docs/archive/DONE-YYYY-MM.md`로 이동
2. `.worktrees/plans/`가 없는 프로젝트는 오래된 항목 → `{project}/docs/archive/DONE-YYYY-MM.md`로 이동
3. `docs/DONE.md`는 최근 5개만 유지

### 6단계: root legacy ledger 미갱신 확인 (wtools만 해당)

**wtools 감지 조건**: 현재 디렉토리에 `common/tools/` 폴더가 있는지 확인
- **있으면**: wtools 내부 → 아래 경계 확인 실행
- **없으면**: 외부 프로젝트 → 이 단계 **스킵**

repo root `TODO.md`, `docs/DONE.md`, `wtools/TODO.md`는 legacy/stub 또는 downstream mirror read-back 대상이다. `/done`은 이 파일들을 완료 이동 대상으로 직접 갱신하지 않고, `.worktrees/plans/TODO.md`와 `.worktrees/plans/docs/DONE.md`만 canonical ledger로 갱신한다.


### 6.5단계: plans/TODO.md 동기화 (plans worktree)

동일 제목 key 1건만 찾아 `[x]` + `[archive](docs/archive/...)` + `(N/N, 100%)` 정규화 후 해당 라인을 `## In Progress` 섹션에서 제거한다 (0건은 경고, 2건 이상이면 즉시 중단).

PowerShell 예시 → [_recipes.md](./_recipes.md)의 "plans/TODO.md 동기화" 섹션 참조.

### 7단계: 완료 검증

**전제 조건 확인 (먼저 실행):**

> branch/worktree 검증은 1.5단계에서 이미 수행했으므로 여기서는 생략한다.

- plan 상태가 `구현완료`가 아니면 → 경고 출력:
  - 상태가 `구현중`이고 `> branch:` 없으면 → 계속 진행 (worktree 미사용 직접 구현)
  - 상태가 `수정필요`이면 → "현재 상태: 수정필요. merge-test 후속 수정이 끝나지 않았습니다. `/implement`로 continuation 입력을 반영한 뒤 다시 `/merge-test` 또는 `/done`을 진행하세요." + 중단
  - 그 외 상태 → "현재 상태: {상태}. `/merge-test` 또는 `/implement` 먼저 완료하세요." + 중단

커밋 전 실제로 정리가 되었는지 확인합니다:

1. **plan 문서 확인**: CLAUDE.md 문서 위치 규칙의 plan 경로에 완료된 작업의 plan이 남아있지 않은지 확인
2. **plans/TODO.md 확인**: plan 링크가 `docs/archive/...`를 가리키고 진행률이 `100%`인지 확인
3. **plans docs/DONE.md 확인**: 완료 항목이 추가되었는지 확인
4. **root legacy ledger 확인**: repo root `TODO.md`, `docs/DONE.md`, `wtools/TODO.md`가 이번 done 실행으로 신규 변경되지 않았는지 확인

6. **워크트리/브랜치 정리 확인**: `git worktree list`에 `impl-` 패턴 없음, `git branch --list 'impl/*'`에 현재 plan 관련 브랜치 없음

누락된 항목이 있으면 돌아가서 처리합니다.

### 7.2단계: /reflect 누락 금지 체크

- 최근 실행 로그/plan 본문에서 `build/check/test` 실패 이력을 탐지한다.
- 실패 이력이 있으면 완료 안내에 아래 문구를 추가한다:
  - `⚠️ 최근 검증 실패 이력이 있어 /reflect에서 Q4 누락 금지 체크를 수행하세요.`
- 실패 이력이 없으면 기존 안내만 유지한다.

### 대안: auto-done.ps1 스크립트 (plan-runner 전용)

**plan-runner 워크플로우**에서는 `common/tools/auto-done.ps1 -PlanFile <경로>`로 1~8단계를 자동 처리합니다.

- **사용 시점**: plan-runner가 plan 완료를 감지했을 때 (Phase 3.5)
- **처리 범위**: plan 상태 갱신, 아카이브 이동, `.worktrees/plans/TODO.md`→`.worktrees/plans/docs/DONE.md`, 커밋
- **수동 실행**: `powershell -File "common\tools\auto-done.ps1" -PlanFile "path/to/plan.md"`

done 스킬은 **수동 작업 시** 또는 **auto-done.ps1 실패 시** fallback으로 사용합니다.

### 7.5단계: version-bump 판단

커밋 메시지의 prefix를 확인하여 버전 bump 여부를 결정합니다:

| prefix | 액션 |
|--------|------|
| `feat:` | minor bump |
| `fix:` | patch bump |
| `feat!:` / BREAKING CHANGE | major bump |
| `refactor:` / `style:` / `perf:` / `test:` / `docs:` / `chore:` | skip (bump 없음) |


bump 필요 시 실행 명령 + CHANGELOG 형식 → [_recipes.md](./_recipes.md)의 "version-bump + CHANGELOG" 섹션 참조.

### 7.55단계: self residual dirty 계산

완료 선언 전 다음 절차를 수행한다:
1. root와 plans dirty를 `git status --short`로 다시 수집해 `$CurrentDirty`를 갱신한다.
2. `$SelfResidual = $CurrentDirty ∩ $TouchedPaths`를 계산한다.
3. baseline에 없던 path가 `$TouchedPaths`에 있으면 → self dirty 분류.
4. baseline에 있었으나 `$TouchedPaths`에도 있으면 → touched preexisting dirty — 커밋 대상에 포함한다.
5. `$CurrentDirty - $SelfResidual` 중 현재 plan 본문, Phase Z evidence, 검증 로그, 직전 merge-test 출력, 직전 `impl/post-merge-*` branch/repair commit/final merge commit에 등장한 path는 `related-plan dirty` 또는 `post-merge-owned dirty`로 승격한다.
6. 성공 종료 조건은 dirty 0이다. 다만 preexisting-unrelated/protected-secret/unknown-protected는 제품 커밋에 섞지 않고 보존 branch, 별도 명시 커밋, 또는 최종 evidence 표로 남겨야 한다.

**처리 분기:**
- whitelist(docs commit root 기준 `TODO.md`, `docs/DONE.md`, `docs/plan/*.md`, `docs/archive/*.md`, `docs/history/*.md`)는 candidate classification에만 사용한다.
- self residual 커밋은 `TouchedPaths ∩ current dirty`에서 나온 **exact path set**만 개별 stage한다. `docs/plan/*.md` glob, `git add -u -- docs/plan`, `git add -A`를 stage pathspec으로 직접 쓰지 않는다.
- `related-plan dirty`/`post-merge-owned dirty`는 whitelist 확장이 아니다. exact path set과 관련성 evidence를 함께 기록한 뒤 commit wrapper로 커밋한다.
- negative requirement: 일반 코드 path(`tests/*.py`, `app/*`, `frontend/*`, `scripts/*`)를 done 자동 커밋 whitelist에 직접 추가하지 않는다. 반드시 `related-plan dirty` 또는 `post-merge-owned dirty` 판정 경로를 통해서만 커밋 후보가 된다.
- skill source 변경이 포함된 owner chain에서는 `python common/tools/plan-runner/scripts/sync_gemini_surfaces.py --check`가 marker drift를 보고하면 `/done` 성공 종료를 차단한다. sync 적용 또는 보존 evidence 없이 `dirty 0`으로 보고하지 않는다.
- archive 이동은 source deletion과 destination add를 expected staged set에 함께 넣는다.
- commit.ps1 호출 전 `git diff --cached --name-status`가 비어 있거나 current owner expected staged set과 정확히 일치해야 한다.
- preexisting staged가 current owner expected staged set이 아니면 **staged ownership** 위반으로 hard stop하고 커밋하지 않는다.
- `commit.ps1 -Files` warning은 success가 아니라 staged ownership 재검증 trigger다. warning 이후에는 `git diff --cached --name-status`를 다시 읽고 expected staged set mismatch가 없을 때만 완료 보고한다.
- commit.ps1 호출 전 `git diff --cached --name-status`가 expected staged set과 정확히 일치하지 않으면 **staged mismatch** hard stop으로 중단하고 커밋하지 않는다.
- auto-done이 commit 단계에서 timeout, lock, commit wrapper failure로 끊기면 JSON의 `expected_paths`, `staged_paths`, `lock_path`, `lock_exists`, `running_git_processes`를 먼저 읽는다. stale lock/process를 확인한 뒤 `expected_paths`와 정확히 일치하는 staged set만 커밋하고, 성공 후 archive metadata와 `target_read_back`을 다시 수행한다. unrelated dirty/staged path가 하나라도 섞이면 수동 복구 전까지 완료 보고 금지.
- whitelist 밖 touched dirty → 흐름을 중단하지 않고 최종 보고의 "남은 dirty" 목록에 기록한다.

### 7.6단계: main+plans dirty 사전 점검

세션 종료 전 `Test-WorktreeDirty $RepoRoot -IncludeMain:$true`를 호출한다. true이면 에이전트 컨텍스트에서는 main worktree와 plans worktree dirty를 분리하고, docs commit root 기준 화이트리스트(`docs/plan/**`, `docs/archive/**`, `docs/history/**`, `TODO.md`, `docs/DONE.md`, `tests/**/fixtures/**`) 후보만 자동 커밋 1회 시도한다. 블랙리스트(`.env*`, `credentials.json`, `*.key`, `*.pem`, `secrets/**`)는 fail-fast 처리하고, 사람 세션이면 경고 출력 후 수동 복구 안내한다. repo root ledger는 wtools canonical 후보가 아니다. `git add -A`는 사용하지 않는다.

경고 템플릿 → [_recipes.md](./_recipes.md)의 "main+plans dirty 사전 점검 경고 템플릿" 참조.

---

### 8단계: 커밋

**🔴 이 단계를 건너뛰면 문서 변경이 uncommitted 상태로 남습니다. 반드시 실행하세요.**

**git mutation 직렬화 (필수):**
- `git add`, `git reset`, `git stash`, `commit.ps1` 같은 mutation은 **한 번에 하나씩**만 실행한다. (병렬 실행 금지 — `.git/index.lock` 재발 방지)

**🚨 CRITICAL: 반드시 PowerShell commit 함수 사용**

**💡 코드 변경과 문서 변경이 모두 unstaged 상태이면 한번에 커밋하세요.**

변경된 파일들을 커밋:
```powershell
# ✅ CORRECT
commit "docs: update plan and done"
commit "feat: {기능명}"

# ❌ WRONG - 절대 사용 금지!
git commit -m "..."
```
plans 워크트리에서 문서 변경이 있으면 `Resolve-DocsCommitRoot` 기준 cwd로 이동하고, `Resolve-DocsCommitCandidates` 반환 파일만 add한다. `git add -A`는 사용하지 않는다.

race 방지가 필요하면 `commit.ps1 -Files` 또는 `commit.sh --files`로 명시 파일 add+commit을 한 호출에 묶는다.

커밋 fallback 명령 상세 → [_recipes.md](./_recipes.md)의 "커밋 fallback 명령" 섹션 및 글로벌 CLAUDE.md "커밋 방법" 참조.

## 체크리스트

실행 전 확인사항:

- [ ] 구현 코드가 완료되었는가?
- [ ] 테스트가 통과했는가?
- [ ] 빌드가 성공했는가?
- [ ] DB 마이그레이션 SQL 파일을 생성했다면 실행했는가? (미실행 시 API 장애)

실행 후 확인사항:

- [ ] **커밋 완료** 🔴
- [ ] plan 문서 항목 체크됨 (CLAUDE.md 문서 위치 규칙의 plan 경로)
- [ ] 완료된 plan은 archive로 이동됨
- [ ] `.worktrees/plans/TODO.md`에서 항목 제거됨
- [ ] `.worktrees/plans/docs/DONE.md`에 항목 추가됨
- [ ] **plans/TODO.md 동기화됨**
- [ ] **root legacy ledger 미변경 확인됨**
- [ ] **7단계 검증 통과** (누락 없이 모두 정리됨)

### done→reflect escalation handoff

- 같은 세션에 사용자 재지시/질책/강한 불만 신호가 있었으면 `/done` closeout은 이를 `사용자 escalation 처리` evidence로 요약해 `/reflect` 입력에 넘긴다.
- handoff에는 `escalation evidence`, `무엇을 다시 확인했고 무엇을 고쳤는지`, `남은 작업 또는 blocked owner`, `plan/TODO/status/read-back 근거`를 포함한다.
- `왜 멈췄냐`, `다 하지도 않았는데`, `계획서를 다시 읽고`, `남은 작업 계속해`, `stash 했으면 pop 하라고`, `죽을래?` 같은 발화는 안전 훈계가 아니라 작업 품질 누락 신호로 분류한다.
- escalation evidence가 있는데 위 handoff row 없이 일반 안내만 출력하면 완료 처리가 끝난 것이 아니다. 최소 `사용자 escalation 처리: {무엇을 다시 확인했고 무엇을 고쳤는지}` 한 줄을 최종 보고에 남긴다.

**완료 후 안내:** 모든 단계가 끝나면 아래 안내를 출력한다:
```
회고가 필요하면 /reflect를 실행하세요.
(우려점, 유사 문제, 리팩토링, 미발견 오류를 분석하고 필요시 계획서를 생성합니다)
최근 검증 실패가 있었다면 실패 명령/종료코드 표를 먼저 작성하고 Q4 해당 없음 판정을 금지하세요.
```

## 파일 경로 규칙

| 문서 | 경로 |
|------|------|
| 계획 문서 | CLAUDE.md 문서 위치 규칙의 plan 경로 |
| 아카이브 | CLAUDE.md 문서 위치 규칙의 archive 경로 |
| TODO ledger | `.worktrees/plans/TODO.md` |
| DONE ledger | `.worktrees/plans/docs/DONE.md` |


## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **커밋**: `commit "message"` **필수** (git commit 명령어 절대 사용 금지). 상세 fallback: [_recipes.md](./_recipes.md) 및 CLAUDE.md 참조

