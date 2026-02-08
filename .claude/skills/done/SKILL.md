---
name: done
description: "구현 완료 후처리 (plan 체크, archive, TODO→DONE, commit). Use when: 완료, 끝, done, 마무리, 완료처리"
---

# 구현 완료 후처리

구현 완료 후 문서 정리와 커밋을 자동으로 처리합니다.

## 트리거

- "완료", "끝", "done", "마무리"
- 구현이 끝났을 때

## 실행 단계

### 1단계: 관련 plan 문서 찾기

아래 **모든 경로**에서 현재 작업과 관련된 계획 문서를 찾습니다:

```
common/docs/plan/*.md
{project}/docs/plan/*.md
```

두 경로 모두 확인해야 합니다.

### 2단계: plan 문서 완료 체크 & 진행률 업데이트

**구현 순서 섹션의 항목 체크:**
```markdown
## 구현 순서

1. [x] P0: 완료된 항목   ← [ ] 또는 [→WORKER-ID] → [x] 변경
2. [ ] P1: 미완료 항목
```

**충돌 방지 마킹 해제**:
- `[→WORKER-ID]` 패턴을 `[x]`로 변환 (정규식: `\[→[^\]]+\]` → `[x]`)
- `[ ]`도 여전히 `[x]`로 변환 (기존 동작 유지)

**진행률 계산 후 헤더·푸터 업데이트:**
```markdown
> 상태: 진행 중
> 진행률: 1/2 (50%)       ← [x] 개수 / 전체 개수
...
*상태: 진행 중 | 진행률: 1/2 (50%)*
```

**완료 판단 시 MANUAL_TASKS 항목은 제외합니다.** (수동 검증은 사용자 몫)

**모든 항목 완료 시 상태 변경:**
```markdown
> 상태: 완료
> 진행률: 2/2 (100%)
...
*상태: 완료 | 진행률: 2/2 (100%)*
```

### 3단계: plan 문서 아카이브 (모든 항목 완료 시)

plan 문서의 모든 체크박스가 `[x]`이면:

1. **프로젝트 특정 plan**: `common/docs/plan/{파일}.md` → `{project}/docs/archive/{파일}.md`
2. **공통/복수 프로젝트 plan**: `common/docs/plan/{파일}.md` → `common/docs/archive/{파일}.md`
3. 아카이브 헤더 추가:

```markdown
# {제목}

> 완료일: YYYY-MM-DD
> 아카이브됨
> 진행률: N/N (100%)
```

### 4단계: TODO → DONE 이동 (수동 검증 항목 분리)

**대상 프로젝트의 TODO.md 확인:**
```
{project}/TODO.md
```

**수동 검증 항목 분리:**

완료된 항목 중 CLI로 검증 불가능한 항목(눈으로 보고 판단해야 하는 것)은 `{project}/MANUAL_TASKS.md`로 분리:

```markdown
# MANUAL_TASKS

- 2026-02-08: 캘린더 UI 레이아웃이 디자인과 일치하는지 확인
- 2026-02-08: 다크모드에서 텍스트 가독성 확인
```

**판단 기준:**
- **MANUAL_TASKS**: UI 시각 확인, 디자인 일치 여부, UX 느낌, 실기기 테스트 등
- **DONE**: 기능 구현, 버그 수정, 리팩토링 등 CLI/코드로 완료 확인 가능한 것

**완료 상태는 MANUAL_TASKS 제외 후 판단합니다.** 수동 검증 항목이 남아있어도 나머지가 모두 완료되면 "완료"로 처리합니다.

**완료된 항목을 docs/DONE.md로 이동:**

TODO.md에서:
```markdown
## In Progress
- [ ] 캘린더 내보내기   ← 제거
```

docs/DONE.md 상단에 추가:
```markdown
# DONE

- [x] 2026-01-08: 캘린더 내보내기
```

### 5단계: DONE.md 아카이브 (5개 초과 시)

docs/DONE.md 항목이 5개를 초과하면:
1. 오래된 항목 → `{project}/docs/archive/DONE-YYYY-MM.md`로 이동
2. docs/DONE.md는 최근 5개만 유지

### 6단계: wtools/TODO.md 동기화

wtools/TODO.md를 열어 해당 프로젝트 섹션을 갱신합니다:

1. 완료된 항목 반영 (제거 또는 ~~취소선~~)
2. 진행률 수치 업데이트
3. 해당 프로젝트의 모든 TODO 완료 시 "완료 ✅" 섹션으로 이동
4. "마지막 업데이트" 날짜를 오늘로 갱신

### 6.5단계: CHANGELOG 동기화

완료된 작업을 CHANGELOG.md에 기록합니다.

**판단 기준:**
- **plan 기반 작업**: CHANGELOG에 추가 (큰 단위 완료 이력)
- **세부 작업만**: DONE.md만 업데이트, CHANGELOG 스킵 (작은 단위는 DONE.md로 충분)

**CHANGELOG 업데이트 대상:**
1. `wtools/CHANGELOG.md` (wtools 공통 작업 또는 멀티레포 작업)
2. `{project}/CHANGELOG.md` (프로젝트별 작업)

**작성 형식:**

```markdown
## YYYY-MM-DD

### {카테고리 또는 프로젝트명}
- ✅ **{작업 제목}** — [plan]({계획서 경로}) (N/N, 100%)
  - {주요 내용 1-2줄 요약} (선택 사항)
```

**작성 규칙:**
1. 최신 날짜가 상단 (날짜별 역순 정렬)
2. 같은 날짜 내에서는 카테고리별 분류
3. 체크마크 ✅ 사용
4. plan 문서 링크 포함
5. 진행률 표시 (N/N, 100%)

**예시:**

```markdown
## 2026-02-08

### wtools 공통
- ✅ **TODO.md 최소화 및 CHANGELOG 구조 개선** — [plan](common/docs/plan/2026-02-08_todo-changelog-restructure_todo.md) (29/29, 100%)
  - TODO.md 251줄 → 111줄 (56% 감소)
  - CHANGELOG.md 도입으로 히스토리 분리

### activity-hub
- ✅ **Mobile Layout 개선** — [plan](docs/plan/2026-02-05_activity-hub-layout-fix.md) (18/18, 100%)
```

**스킵 조건:**
- plan 없는 작은 버그 수정
- 단순 코드 정리 (리팩토링)
- 문서만 수정한 경우

### 7단계: 완료 검증

커밋 전 실제로 정리가 되었는지 확인합니다:

1. **plan 문서 확인**: `common/docs/plan/`, `{project}/docs/plan/`에 완료된 작업의 plan이 남아있지 않은지 확인
2. **프로젝트 TODO 확인**: `{project}/TODO.md`에서 완료 항목이 제거되었는지 확인
3. **wtools/TODO.md 확인**: 해당 프로젝트 섹션 진행률이 갱신되었는지 확인
4. **DONE.md 확인**: 완료 항목이 추가되었는지 확인
5. **CHANGELOG.md 확인**: plan 기반 작업이면 CHANGELOG.md에 항목 추가되었는지 확인 (wtools 또는 프로젝트별)

누락된 항목이 있으면 돌아가서 처리합니다.

### 8단계: 커밋

**🔴 이 단계를 건너뛰면 문서 변경이 uncommitted 상태로 남습니다. 반드시 실행하세요.**

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

**강제 체크:**
- [ ] `git commit` 명령어를 사용하려고 하는가? → 즉시 중단
- [ ] `commit "message"` 사용했는가? → 진행

## 체크리스트

실행 전 확인사항:

- [ ] 구현 코드가 완료되었는가?
- [ ] 테스트가 통과했는가?
- [ ] 빌드가 성공했는가?

실행 후 확인사항:

- [ ] **커밋 완료** 🔴
- [ ] plan 문서 항목 체크됨 (common/docs/plan + {project}/docs/plan 모두)
- [ ] 완료된 plan은 archive로 이동됨
- [ ] {project}/TODO.md에서 항목 제거됨
- [ ] {project}/docs/DONE.md에 항목 추가됨
- [ ] **CHANGELOG.md 동기화됨** (plan 기반 작업일 경우)
- [ ] **wtools/TODO.md 동기화됨**
- [ ] **7단계 검증 통과** (누락 없이 모두 정리됨)

## 파일 경로 규칙

| 문서 | 경로 |
|------|------|
| 계획 문서 (공통) | `common/docs/plan/*.md` |
| 계획 문서 (프로젝트) | `{project}/docs/plan/*.md` |
| 아카이브 (프로젝트별) | `{project}/docs/archive/*.md` |
| 아카이브 (공통) | `common/docs/archive/*.md` |
| 프로젝트 TODO | `{project}/TODO.md` |
| 프로젝트 DONE | `{project}/docs/DONE.md` |

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **커밋**: `commit "message"` **필수** (git commit 명령어 절대 사용 금지)

## 🚨 절대 금지 명령어

```bash
# ❌ FORBIDDEN
git commit
git commit -m "..."
git commit -am "..."
git commit --amend

# ✅ REQUIRED
commit "message"
```
