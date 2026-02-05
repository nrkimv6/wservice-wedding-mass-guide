---
name: check-repos
description: "wtools 하위 repo 미커밋 사항 확인 및 정리. Use when: 미커밋 확인, repo 상태, check repos, 커밋 정리"
---

# 하위 Repo 미커밋 확인 및 커밋

wtools 하위 폴더들의 git 상태를 확인하고, 완료된 구현은 TODO 업데이트 후 커밋합니다.

## 트리거

- "미커밋 확인", "repo 상태", "check repos", "커밋 정리"
- 하위 프로젝트들의 git 상태를 일괄 점검할 때

## 실행 단계

### 1단계: 하위 폴더 git 상태 확인

wtools 하위의 모든 git repo 상태를 확인합니다.

```powershell
# 각 하위 폴더에서 git status --short 실행
cd "D:\work\project\service\wtools\{project}"
git status --short
```

**확인 대상 폴더:**
- _sample, activity-hub, admin-tools, auth-worker, common
- gentle-words, line-minder, memo-alarm, mini-toolbox
- sacred-hours, screenshot-generator, story-weaver, tb-wish
- tool-view, wedding-mass-guide

### 2단계: 미커밋 사항 분류

각 repo의 미커밋 사항을 분석합니다:

| 상태 | 의미 | 조치 |
|------|------|------|
| (clean) | 변경 없음 | skip |
| M (modified) | 수정됨 | 분석 필요 |
| ?? (untracked) | 새 파일 | 분석 필요 |

### 3단계: 변경 내용 분석

미커밋 사항이 있는 repo에서:

```powershell
cd "D:\work\project\service\wtools\{project}"
git diff
git diff --stat
```

**판단 기준:**
- **완료된 구현**: 기능이 완성되고 동작하는 상태
- **미완료 구현**: 작업 중인 상태, 임시 코드, TODO 주석 등

### 4단계: TODO.md 확인 및 업데이트

완료된 구현인 경우:

1. **프로젝트 TODO.md 확인**
   ```
   {project}/TODO.md
   ```

2. **관련 계획서 확인** (있는 경우)
   ```
   {project}/docs/plan/*.md
   common/docs/plan/*.md
   ```

3. **TODO 항목 업데이트**
   - 기존 항목 있음 → 완료 표시 (`[ ]` → `[x]`)
   - 기존 항목 없음 → 새로 등록 후 완료 표시

4. **계획서 진행률 업데이트** (해당 시)
   ```markdown
   > 진행률: X/Y (Z%)
   ```

### 5단계: 각 Repo 커밋

**🚨 CRITICAL: 반드시 전역 커밋 스크립트 사용**

```powershell
cd "D:\work\project\service\wtools\{project}"
git add .
"D:\work\project\tools\common\commit.sh" "{type}: {message}"
```

**커밋 타입:**
- `feat`: 새 기능
- `fix`: 버그 수정
- `refactor`: 리팩토링
- `docs`: 문서 수정
- `chore`: 기타

**예시:**
```powershell
cd "D:\work\project\service\wtools\memo-alarm"
git add .
"D:\work\project\tools\common\commit.sh" "refactor: memosStore 메서드 이름 일관성 개선"

cd "D:\work\project\service\wtools\wedding-mass-guide"
git add .
"D:\work\project\tools\common\commit.sh" "fix: 결함 감사 Phase 2-3 수정 완료"
```

## 출력 형식

```markdown
## 미커밋 사항 확인 결과

| 프로젝트 | 상태 | 변경 내용 | 조치 |
|---------|------|----------|------|
| memo-alarm | Modified | TodoForm.svelte | 커밋 완료 |
| wedding-mass-guide | Modified | 10 files | 커밋 완료 |
| 기타 13개 | Clean | - | skip |

## 커밋 내역
- memo-alarm: `refactor: ...`
- wedding-mass-guide: `fix: ...`
```

## 체크리스트

실행 전 확인:
- [ ] 각 변경사항이 완료된 구현인지 확인
- [ ] 미완료 작업은 커밋하지 않음

실행 후 확인:
- [ ] TODO.md 업데이트됨
- [ ] 계획서 진행률 업데이트됨 (해당 시)
- [ ] 각 repo에서 커밋 완료
- [ ] git status가 clean 상태

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **커밋**: `"D:\work\project\tools\common\commit.sh"` **필수**

## 🚨 절대 금지 명령어

```bash
# ❌ FORBIDDEN
git commit
git commit -m "..."

# ✅ REQUIRED
"D:\work\project\tools\common\commit.sh" "message"
```
