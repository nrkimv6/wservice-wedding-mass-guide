---
name: commit
description: 커밋 스크립트를 통한 안전한 git commit 실행. 커밋, commit, 저장 요청 시 자동 호출 (project)
allowed-tools: Bash,Read
---

# Git Commit

커밋 스크립트를 통해 안전하게 git commit을 실행합니다.

## 사용법

커밋 스크립트는 3개가 존재하며, 위에서부터 순서대로 시도하고 **실패하거나 없으면** 다음 순위로 fallback합니다.

| 순위 | 스크립트 | 환경 | 경로 |
|------|---------|------|------|
| 1순위 | `commit.ps1` (공용) | PowerShell / powershell.exe 경유 | `D:\work\project\tools\common\commit.ps1` |
| 2순위 | `commit.sh` (공용) | Bash | `D:\work\project\tools\common\commit.sh` |
| 3순위 | `commit.sh` (로컬) | Bash | 스킬 폴더 내 `commit.sh` (이 파일과 같은 디렉토리) |

### 1순위: commit.ps1 (PowerShell)
```powershell
git add <files>
& "D:\work\project\tools\common\commit.ps1" "커밋 메시지"
```

Bash에서 powershell.exe 경유:
```bash
git add <files>
powershell.exe -Command "Set-Location 'D:\work\project\service\wtools'; & 'D:\work\project\tools\common\commit.ps1' '커밋 메시지'"
```

### 2순위: commit.sh (공용, fallback)
```bash
# ⚠️ 반드시 cd로 레포 디렉토리 이동 후 실행!
cd "/d/work/project/service/wtools" && git add <files> && bash "/d/work/project/tools/common/commit.sh" "커밋 메시지"
```

### 3순위: commit.sh (로컬, 최후 fallback)
```bash
# 공용 스크립트가 모두 없을 때 스킬 폴더 내 commit.sh 사용
cd "/d/work/project/service/wtools" && git add <files> && bash "/d/work/project/service/wtools/.claude/skills/commit/commit.sh" "커밋 메시지"
```

**참고**: 모든 commit.sh는 commit.ps1과 동일한 기능을 수행합니다.

## Workflow

1. **변경사항 확인**: `git status`로 수정된 파일 확인
2. **스테이징**: `git add <files>` 또는 `git add .`
2.5. **커밋 prefix 판단**: 커밋 메시지의 prefix 확인
   - `feat:` → minor bump 필요
   - `fix:` → patch bump 필요
   - `feat!:` 또는 BREAKING CHANGE → major bump 필요
   - `refactor:` / `style:` / `perf:` / `test:` / `docs:` / `chore:` → bump 불필요 (skip)
2.6. **version-bump 실행** (bump 필요 시):
   ```powershell
   # 1순위: PowerShell
   & "D:\work\project\tools\common\version-bump.ps1" -BumpType <patch|minor|major> -ProjectDir "$(Get-Location)"
   # 2순위: bash
   bash "/d/work/project/tools/common/version-bump.sh" "<patch|minor|major>"
   ```
2.7. **CHANGELOG.md 항목 추가** (bump 발생 시, Keep a Changelog 형식):
   ```markdown
   ## [새버전] - YYYY-MM-DD
   ### Added      ← feat: 커밋
   ### Fixed       ← fix: 커밋
   ### Breaking    ← feat!: / BREAKING CHANGE
   - 변경 내용 설명
   ```
   CHANGELOG.md가 없으면 파일 자동 생성 후 추가.
2.8. **변경 파일 추가 스테이징**: `git add CHANGELOG.md`
3. **커밋 실행**: 커밋 스크립트 호출
4. **태그 생성** (bump 발생 시): `git tag v{새버전}`

## 커밋 메시지 규칙

| Prefix | 용도 |
|--------|------|
| `feat:` | 새 기능 |
| `fix:` | 버그 수정 |
| `docs:` | 문서 수정 |
| `refactor:` | 리팩토링 |
| `chore:` | 기타 작업 |
| `test:` | 테스트 추가/수정 |

## 주의사항

- **git commit 직접 사용 금지**: 반드시 커밋 스크립트 사용
- **커밋 단위**: 작게, phase별 여러 개 가능
- **스테이징 필수**: 스크립트 실행 전 `git add` 필요

## 예시

```powershell
# 1순위: commit.ps1
cd "D:\work\project\service\wtools"
git add app/routes/monitor.py
& "D:\work\project\tools\common\commit.ps1" "feat: 모니터링 API 추가"
```

```bash
# 1순위 (bash에서): powershell.exe 경유
git add app/routes/monitor.py
powershell.exe -Command "Set-Location 'D:\work\project\service\wtools'; & 'D:\work\project\tools\common\commit.ps1' 'feat: 모니터링 API 추가'"

# 2순위: 공용 commit.sh (반드시 cd 먼저)
cd "/d/work/project/service/wtools"
git add app/routes/monitor.py
bash "/d/work/project/tools/common/commit.sh" "feat: 모니터링 API 추가"

# 3순위: 로컬 commit.sh (공용 스크립트 없을 때)
cd "/d/work/project/service/wtools"
git add app/routes/monitor.py
bash "/d/work/project/service/wtools/.claude/skills/commit/commit.sh" "feat: 모니터링 API 추가"
```
