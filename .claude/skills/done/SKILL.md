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

**프로젝트 경로 해석:**
```powershell
$configPath = "D:\work\project\service\wtools\.claude\projects.json"
$config = Get-Content $configPath | ConvertFrom-Json
# 각 프로젝트의 절대경로: $config.projects[].path
```

**wtools 감지**: 현재 디렉토리에 `common/` 폴더 존재 여부로 판단
- **있으면**: wtools 내부 → `common/docs/plan/` 및 `{proj.path}/docs/plan/` 확인
- **없으면**: 외부 프로젝트 → 현재 프로젝트의 `docs/plan/`만 확인

아래 **모든 경로**에서 현재 작업과 관련된 계획 문서를 찾습니다:

```
common/docs/plan/*.md (wtools 내부일 때만)
{proj.path}/docs/plan/*.md
```

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
> 상태: 구현중
> 진행률: 1/2 (50%)       ← [x] 개수 / 전체 개수
...
*상태: 구현중 | 진행률: 1/2 (50%)*
```

**완료 판단 시 MANUAL_TASKS 항목은 제외합니다.** (수동 검증은 사용자 몫)

**모든 항목 완료 시 상태 변경:**
```markdown
> 상태: 구현완료
> 진행률: 2/2 (100%)
...
*상태: 구현완료 | 진행률: 2/2 (100%)*
```

### 3단계: plan 문서 아카이브 (모든 항목 완료 시)

plan 문서의 모든 체크박스가 `[x]`이면:

1. **프로젝트 특정 plan**: `common/docs/plan/{파일}.md` (wtools만) → `{proj.path}/docs/archive/{파일}.md`
2. **공통/복수 프로젝트 plan**: `common/docs/plan/{파일}.md` (wtools만) → `common/docs/archive/{파일}.md`
3. **외부 프로젝트 plan**: `{proj.path}/docs/plan/{파일}.md` → `{proj.path}/docs/archive/{파일}.md`
4. 아카이브 헤더 추가:

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

**수동 검증 항목 식별 절차:**

A. plan 문서의 `## 구현 순서` 아래 모든 체크박스 항목(`- [ ]`, `- [x]`) 텍스트를 스캔
B. 각 항목 텍스트에 수동 작업 판단 키워드가 포함되어 있는지 확인
C. 매칭된 항목을 추출하여 리스트로 수집

**수동 작업 판단 키워드**: `common/docs/guide/project-management/manual-tasks-format.md` 참조
- 한국어: `브라우저`, `UI`, `디자인`, `육안`, `시각`, `레이아웃`, `가독성`, `실기기`, `모바일`, `대시보드`, `로그인 테스트`, `배포 확인`, `스크린샷`, `스타일`, `색상`, `폰트`
- 영어: `Android`, `iOS`, `Firebase Console`, `Supabase Dashboard`, `Google.*인증`, `Kakao.*인증`, `Play Store`

**MANUAL_TASKS.md 생성/갱신:**

1. **파일 위치**: `{project}/MANUAL_TASKS.md` (프로젝트 루트)
2. **파일이 없으면**: 표준 형식 템플릿으로 신규 생성
   ```markdown
   # MANUAL_TASKS

   > 이 문서의 항목은 브라우저 테스트, UI 육안 확인 등 CLI로 검증 불가능한 작업입니다.
   > Claude는 이 항목을 "/next" 작업 후보에서 제외합니다.

   ## 미완료

   - [ ] {작업 내용} — from: {plan파일명.md}#{항목번호} ({날짜})

   ## 완료
   ```

3. **파일이 있으면**: `## 미완료` 섹션 하단에 새 항목 추가
4. **각 항목 형식**: `- [ ] {작업 내용} — from: {plan파일명.md}#{항목번호} ({오늘날짜})`
5. **중복 방지**: 이미 같은 `from:` 참조가 있으면 스킵
6. **plan 문서 표시**: 수동 항목은 `[x]`로 체크하고 항목 뒤에 `(→ MANUAL_TASKS)` 태그 추가

**예시:**

plan 문서에서:
```markdown
## 구현 순서
1. [x] P0: API 구현
2. [x] P1: 브라우저에서 UI 레이아웃 확인 (→ MANUAL_TASKS)
3. [x] P2: 다크모드 가독성 검증 (→ MANUAL_TASKS)
```

`{project}/MANUAL_TASKS.md`에:
```markdown
# MANUAL_TASKS

> 이 문서의 항목은 브라우저 테스트, UI 육안 확인 등 CLI로 검증 불가능한 작업입니다.
> Claude는 이 항목을 "/next" 작업 후보에서 제외합니다.

## 미완료

- [ ] 브라우저에서 UI 레이아웃 확인 — from: calendar-plan.md#2 (2026-02-08)
- [ ] 다크모드 가독성 검증 — from: calendar-plan.md#3 (2026-02-08)

## 완료
```

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

### 6단계: wtools/TODO.md 동기화 (wtools만 해당)

**wtools 감지 조건**: 현재 디렉토리에 `common/` 폴더가 있는지 확인
- **있으면**: wtools 내부 → 아래 동기화 실행
- **없으면**: 외부 프로젝트 → 이 단계 **스킵**

wtools/TODO.md를 열어 해당 프로젝트 섹션을 갱신합니다:

1. 완료된 항목 반영 (제거 또는 ~~취소선~~)
2. 진행률 수치 업데이트
3. 해당 프로젝트의 모든 TODO 완료 시 "완료 ✅" 섹션으로 이동
4. "마지막 업데이트" 날짜를 오늘로 갱신

### 7단계: 완료 검증

커밋 전 실제로 정리가 되었는지 확인합니다:

1. **plan 문서 확인**: `common/docs/plan/`, `{project}/docs/plan/`에 완료된 작업의 plan이 남아있지 않은지 확인
2. **프로젝트 TODO 확인**: `{project}/TODO.md`에서 완료 항목이 제거되었는지 확인
3. **wtools/TODO.md 확인**: 해당 프로젝트 섹션 진행률이 갱신되었는지 확인
4. **DONE.md 확인**: 완료 항목이 추가되었는지 확인

누락된 항목이 있으면 돌아가서 처리합니다.

### 대안: auto-done.ps1 스크립트 (auto-next 전용)

**auto-next 워크플로우**에서는 `common/tools/auto-done.ps1 -PlanFile <경로>`로 1~8단계를 자동 처리합니다.

- **사용 시점**: auto-next가 plan 완료를 감지했을 때 (Phase 3.5)
- **처리 범위**: plan 상태 갱신, 아카이브 이동, TODO→DONE, wtools/TODO.md 동기화, 커밋
- **수동 실행**: `powershell -File "common\tools\auto-done.ps1" -PlanFile "path/to/plan.md"`

done 스킬은 **수동 작업 시** 또는 **auto-done.ps1 실패 시** fallback으로 사용합니다.

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
