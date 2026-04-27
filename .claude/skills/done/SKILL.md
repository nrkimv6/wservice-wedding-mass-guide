---
name: done
description: "구현 완료 후처리 (plan 체크, archive, TODO→DONE, commit). Use when: 완료, 끝, done, 마무리, 완료처리"
---

# 구현 완료 후처리

> **본문 분리 원칙**: 호출 컨텍스트가 다르면 본문도 다르다. 공유 레시피는 [`_recipes.md`](./_recipes.md)로만.

구현 완료 후 문서 정리와 커밋을 자동으로 처리합니다.

## 트리거

- "완료", "끝", "done", "마무리"
- 구현이 끝났을 때

## 세션 targets / continue 계약 (필수)

- 사용자가 같은 세션에 plan 경로를 2개 이상 명시하면, 그 목록은 **session targets**로 고정한다.
- `/done`은 closeout 톤의 "최종 종료"가 아니라 **문서/아카이브 정리 owner**다.
  - 현재 target의 archive/DONE/TODO 정리를 끝냈더라도 **remaining targets**가 있으면 전체 완료로 말하지 않는다.
  - 출력은 `현재 target 완료, 남은 target N개` 형태로 남기고, 다음 target 처리(대개 `/implement` 재진입)로 **같은 턴에서 계속** 진행한다.
- 사용자가 `계속`, `멈추지마`, `끝날 때까지` 등으로 재지시한 경우:
  - 중간 성공(archive 완료, 커밋 완료)은 종료점이 아니라 **진행 업데이트**다.
  - 실제 중단은 hard blocker(충돌/커밋 실패/필수 evidence 누락 등)에서만 허용한다.

## 실행 단계

### 0단계: 고아 pytest 선제 정리

done 실행 전 잔여 pytest를 선제 정리한다. `.\scripts\kill-orphan-procs.ps1` 또는 공용 fallback 경로의 스크립트를 실행. 실패해도 무시하고 1단계로 진행.

### 1단계: 관련 plan 문서 찾기

프로젝트 경로는 `D:\work\project\service\wtools\.claude\projects.json` 참조.

**wtools 감지**: 현재 디렉토리에 `common/tools/` 폴더 존재 여부로 판단.

### 1.1단계: 대상 plan anchor precedence (고정)

- **1순위**: 사용자가 plan 파일 경로를 명시했다면 그 경로만 primary anchor로 사용한다. (예: `/done D:\...\plan\2026-...md`)
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
- 무시 모드는 "중단 판정 완화"에만 적용되며, 판정 범위를 제외한 동작은 기존 규칙을 유지한다.
- 단, `.git` 보호 규칙과 파괴적 명령 금지 규칙은 그대로 유지한다.

### 2단계: plan 문서 완료 체크 & 진행률 업데이트

**충돌 방지 마킹 해제**: `[→WORKER-ID]` 패턴 및 `[ ]`을 `[x]`로 변환.

**진행률 계산 후 헤더·푸터 업데이트** (`> 진행률: N/M (%)` + `*상태: ... | 진행률:...*`).

**완료 판단 시 MANUAL_TASKS 항목은 제외합니다.** 코드블럭 내 `[ ]`는 카운트에서 제외.

**Canonical metric 계약 (progress contract):**
- archive progress의 canonical source는 `Get-PlanMetadata()`(PS) 또는 `PlanParser.get_plan_progress()`(Python)이 계산한 helper-based checkbox count다.
- archive 헤더(`> 진행률:`), archive 본문 헤더, 푸터(`*상태: ... | 진행률:...*`), `wtools/TODO.md` sync는 모두 같은 `(done, total)` tuple을 출력해야 한다.
- "기존 헤더 텍스트 복사"는 canonical metric과 대조 후 일치할 때만 유효한 표현 방식이며, 독립 source-of-truth로 사용 금지.
- leaf 재계산이나 phase별 별도 집계를 독립 source-of-truth로 사용 금지.
- 선행 계약: `.worktrees/plans/docs/plan/2026-03-04_fix-checkbox-count-consistency.md` "single counting function" 원칙.

**4-surface 대조 read-back 규칙 (archive 완료 직후):**
1. archive file read-back: `> 진행률:` 헤더값 추출
2. archive file read-back: `*상태: ... | 진행률:...*` 푸터값 추출
3. wtools/TODO.md: 해당 plan 진행률 값 추출
4. 위 3개 값이 canonical metric `(done/total)`과 모두 일치하는지 확인
5. 불일치가 있으면 경고 출력 후 커밋 전 수동 수정 (auto-done.ps1은 hard stop)

### 1.5단계: 사전 검증 (구현완료 설정 전 게이트)

> **🔴 이 검증은 상태를 "구현완료"로 변경하기 전에 반드시 통과해야 한다.**
> 검증 실패 시 상태 변경 없이 즉시 중단한다.

| 게이트 | 트리거 조건 | 통과 조건 | 실패 시 동작 | 비고 |
|--------|-------------|-----------|--------------|------|
| **2.5 branch/worktree 차단** | plan 헤더에 `> branch:` 또는 `> worktree:` 필드 존재 | 두 필드 모두 없음 | "plan에 활성 branch/worktree가 있습니다. 먼저 /merge-test를 실행하세요." + 중단 | 자동 파이프라인(plan-runner Stage 6) 면제 |
| **2.6 fix: Phase R 누락** | 파일명에 `_fix-`/`_fix_` 포함 또는 제목이 `fix:`로 시작 | plan 본문에 `재발 경로 분석` 또는 `Phase R` 존재 + Phase R 섹션 내 "미방어" 없음 | "fix: plan에 Phase R이 없습니다." + 중단 | Phase R 섹션 내 "미방어" 잔존 시에도 중단 |
| **2.7 DB-Direct evidence** | plan/archive 본문에 `Phase DB-Direct` 존재 | `실행 SQL/명령`, `존재 확인 쿼리`, `live API 또는 runtime 결과` 3종 모두 확인 | "Phase DB-Direct 실행 증거 부족. /merge-test에서 evidence를 남기세요." + 중단 | 3종 중 하나라도 없으면 중단 |
| **2.8 owner set 역할 판정** | plan 헤더에 `> worktree-owner:` 필드 존재 | 역할 판정 후 분기 처리 완료 | 아래 별도 bullet 참조 | 필드 없으면 일반 단독 plan → 스킵 |

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

plan 문서의 모든 체크박스가 `[x]`이면:

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

6. **LLM Wiki ingest** — archive 이동 + 헤더 추가 성공 후 반드시 호출. `/archive-sweep` 스킬의 "LLM Wiki ingest" 절차에 위임. ingest 실패는 경고만, done 전체 흐름은 중단하지 않음.

### 3.5단계: 금지어 체크 (fix: plan만)

fix: plan인 경우, 안내 텍스트와 커밋 메시지에 아래 표현이 포함되면 경고 후 대체:
- ❌ "근본 수정", "근본 해결", "완전 해결", "최종 수정", "영구 수정"
- ✅ 대체: "N개 경로 방어 완료", "재발 경로 M개 중 M개 방어됨"

### 4단계: TODO → DONE 이동 (수동 검증 항목 분리)

**대상 프로젝트의 TODO.md 확인:**
```
{project}/TODO.md
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

**완료된 항목을 docs/DONE.md로 이동:** TODO.md에서 제거 → docs/DONE.md 상단에 추가.

### 5단계: DONE.md 아카이브 (10개 초과 시)

docs/DONE.md 항목이 10개를 초과하면:
1. `.worktrees/plans/`가 있는 프로젝트는 오래된 항목 → `.worktrees/plans/docs/archive/DONE-YYYY-MM.md`로 이동
2. `.worktrees/plans/`가 없는 프로젝트는 오래된 항목 → `{project}/docs/archive/DONE-YYYY-MM.md`로 이동
3. docs/DONE.md는 최근 5개만 유지

### 6단계: wtools/TODO.md 동기화 (wtools만 해당)

**wtools 감지 조건**: 현재 디렉토리에 `common/tools/` 폴더가 있는지 확인
- **있으면**: wtools 내부 → 아래 동기화 실행
- **없으면**: 외부 프로젝트 → 이 단계 **스킵**

wtools/TODO.md를 열어 해당 프로젝트 섹션을 갱신합니다:

1. 완료된 항목 반영 (제거 또는 ~~취소선~~)
2. 진행률 수치 업데이트
3. 해당 프로젝트의 모든 TODO 완료 시 "완료 ✅" 섹션으로 이동
4. "마지막 업데이트" 날짜를 오늘로 갱신


### 6.5단계: plans/TODO.md 동기화 (plans worktree)

동일 제목 key 1건만 찾아 `[x]` + `[archive](docs/archive/...)` + `(N/N, 100%)` 정규화 (0건/2건 이상이면 즉시 중단).

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
2. **프로젝트 TODO 확인**: `{project}/TODO.md`에서 완료 항목이 제거되었는지 확인
3. **wtools/TODO.md 확인**: 해당 프로젝트 섹션 진행률이 갱신되었는지 확인
4. **plans/TODO.md 확인**: plan 링크가 `docs/archive/...`를 가리키고 진행률이 `100%`인지 확인
5. **DONE.md 확인**: 완료 항목이 추가되었는지 확인

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
- **처리 범위**: plan 상태 갱신, 아카이브 이동, TODO→DONE, plans/TODO.md 동기화, wtools/TODO.md 동기화, 커밋
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

### 7.6단계: plans dirty 사전 점검

세션 종료 전 `Test-PlansDirty $RepoRoot`를 호출한다. true이면 에이전트 컨텍스트면 `Resolve-DocsCommitCandidates` 반환 파일만 add하여 자동 커밋 1회 시도, 사람 세션이면 경고 출력 후 수동 복구 안내. `git add -A`는 사용하지 않는다.

경고 템플릿 → [_recipes.md](./_recipes.md)의 "plans dirty 사전 점검 경고 템플릿" 참조.

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
- [ ] {project}/TODO.md에서 항목 제거됨
- [ ] {project}/docs/DONE.md에 항목 추가됨
- [ ] **plans/TODO.md 동기화됨**
- [ ] **wtools/TODO.md 동기화됨**
- [ ] **7단계 검증 통과** (누락 없이 모두 정리됨)

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
| 프로젝트 TODO | `{project}/TODO.md` |
| 프로젝트 DONE | `{project}/docs/DONE.md` |


## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **커밋**: `commit "message"` **필수** (git commit 명령어 절대 사용 금지). 상세 fallback: [_recipes.md](./_recipes.md) 및 CLAUDE.md 참조
