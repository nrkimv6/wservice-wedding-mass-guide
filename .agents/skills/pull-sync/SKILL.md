---
name: pull-sync
description: "git pull 후 plan/TODO 자동 동기화. Use when: 풀 동기화, pull sync, 풀 받아, 업데이트 받아"
---

# git pull 후 TODO 자동 동기화

하위 프로젝트들을 git pull하고, 변경된 plan 문서를 분석하여 TODO/DONE을 자동으로 동기화합니다.

## 트리거

- "풀 동기화", "pull sync", "풀 받아", "pull", "업데이트 받아"
- 원격 저장소에서 변경사항을 받아올 때

## 실행 단계

### 1단계: 전체 하위 프로젝트 git pull (병렬)

**대상 프로젝트:** `.agents/projects.json`의 모든 프로젝트(없을 경우 `.claude/projects.json` fallback) (15개, 절대경로 사용)

**프로젝트 목록 읽기:**
```powershell
$projectConfigPath = "D:\work\project\service\wtools\.agents\projects.json"
if (-not (Test-Path $projectConfigPath)) {
  $projectConfigPath = "D:\work\project\service\wtools\.claude\projects.json"
}
$config = Get-Content $projectConfigPath | ConvertFrom-Json
# 각 프로젝트의 절대경로: $config.projects[].path
```

**안전한 pull 절차 (각 프로젝트마다):**

```bash
cd "{proj.path}"

# 1. 상태 확인
git status --short
# → 출력 있으면 (dirty) → 스킵 + 보고

# 2. 브랜치 확인
git branch --show-current
# → main 아니면 → 스킵 + 보고

# 3. 현재 커밋 해시 저장
BEFORE_HASH=$(git rev-parse HEAD)

# 4. pull 실행 (1+2 모두 통과 시에만)
git pull origin main
# → 실패/충돌 시 → 1.7단계 conflict 분류로 전환
```

**병렬 실행:**
- Task 도구(subagent_type=Bash)로 15개 프로젝트 동시 실행
- 각각 독립 repo이므로 병렬 가능 (~5배 속도 향상)

**출력 수집:**
- 각 프로젝트: (상태, 변경 파일 수, 이전 해시)
- clean + pull 성공 → 2단계로 진행
- dirty/비main/실패 → 스킵 (보고 목록에 추가)

### 1.7단계: conflict 분류

`git pull`이 conflict로 멈춘 경우 방치하거나 무조건 스킵하지 않고 파일 성격별로 분류한다.

| 분류 | 대상 | 처리 |
|---|---|---|
| 일반 코드/문서 | `app/`, `frontend/`, `scripts/`, `docs/plan`, `TODO.md` 등 | 해당 repo owner flow에서 resolve/test/commit한다. |
| 운영 긴급 | 서비스 복구에 필요한 설정/운영 파일 | 복구 우선으로 resolve하고 사유와 검증 evidence를 남긴다. |
| mirror surface | `.agents/`, `.claude/`, `.gemini/` | root에서 resolve/commit하지 않는다. `pull --ff-only` 수신만 허용하고 실패 시 abort/preserve 후 upstream sync 재생성을 요구한다. |
| unknown | 파일 성격을 판정할 수 없음 | 사용자에게 conflict 파일과 상태를 보고하고 결정 대기한다. |

mirror surface conflict는 수동 sync 구현이 아니다. 아래 evidence를 확보한 뒤 root에서 merge resolution으로 닫지 않는다. remote sync commit은 `git pull --ff-only`로만 수신하고, ff-only 실패나 conflict가 있으면 abort/preserve evidence를 남긴 뒤 upstream sync 재생성 또는 원격 정리를 요구한다.
- `MERGE_HEAD`
- `git merge-base ours theirs`
- `git log --oneline ours..theirs`
- divergent child-local commit hash
- conflict 파일 surface 종류

mirror conflict resolution을 `git checkout --theirs -- <path>` 또는 `git merge --strategy-option=theirs` 같은 local merge resolution으로 처리하지 않는다. child repo mirror 파일을 직접 edit/commit해서 wtools 원본과 맞추는 구현 계획으로 승격하지 않으며, root receiver는 remote fast-forward 수신 또는 upstream sync 재생성 evidence만 인정한다.

### 1.5단계: Redis 잔존 상태 정리 (monitor-page 전용)

**1단계 git pull 완료 후 즉시 실행:**

```bash
curl -s -X POST http://localhost:8001/api/v1/dev-runner/runners/cleanup-stale \
  -H "Content-Type: application/json" \
  --max-time 5
```

- API 실패(서버 미실행, 타임아웃 등) 시 → **경고만 출력하고 계속 진행** (중단 금지)
- 응답에서 `cleaned` > 0 이면 → 5단계 리포트에 "Redis 잔존 N개 정리됨" 표시
- `cleaned` = 0 이면 → 리포트에서 생략

### 2단계: 변경된 plan 문서 감지

**대상:** 1단계에서 pull 성공한 프로젝트만

**변경 파일 확인:**
```bash
cd "{proj.path}"
git diff ${BEFORE_HASH} --name-only
```

**plan 문서 필터링:**
- 결과에서 `_path-rules.md` helper 우선순위 기준 plan 경로를 매칭
  - `.worktrees/plans/docs/plan/*.md`
  - `docs/plan/*.md`
- 변경된 plan 문서 없으면 → 해당 프로젝트 스킵
- 있으면 → 변경된 plan 문서 목록 수집 (3단계로)

### 3단계: plan 문서 분석 및 처리

#### 3-A: plan 완료 판단

**각 변경된 plan 문서를:**
1. Read 도구로 읽기
2. 체크박스 개수 세기:
   - `[ ]` 개수 (미완료)
   - `[x]` 개수 (완료)
3. 판단:
   - `[ ]` = 0 & `[x]` >= 1 → **완료**
   - `[ ]` >= 1 → **미완료**

#### 3-B: 완료된 plan 처리

**아카이빙:**
1. plan 파일 이동:
   - 프로젝트별 plan: `{project}/docs/plan/*.md` → `{project}/docs/archive/*.md`
   - plan: AGENTS.md 문서 위치 규칙의 plan 경로 → archive 경로

2. plan 헤더 수정:
   ```markdown
   > 완료일: 2026-02-05
   > 아카이브됨
   ```

3. DONE.md에 기록:
   - `{project}/docs/DONE.md` 상단에 추가
   - DONE.md 없으면 생성
   ```markdown
   ## 2026-02-05: {plan 제목}
   - [x] 완료 — [archive](archive/{파일명}.md)
   ```

#### 3-C: 미완료 plan 처리

**TODO.md 반영:**
1. `{project}/TODO.md`의 Pending 섹션 확인
2. 해당 plan 항목 검색:
   - **이미 있으면** → 진행률만 갱신
     ```markdown
     - [ ] **{제목}** — [plan]({경로}) (5/27, 19%)
     ```
   - **없으면** → 새 항목 추가
     ```markdown
     - [ ] **{제목}** — [plan]({경로}) (0/27, 0%)
     ```

### 4단계: wtools/TODO.md 글로벌 동기화

**동기화 로직 (기존 `/check-repos` 6단계와 동일):**

1. wtools/TODO.md 열기
2. 각 프로젝트 섹션 찾기
3. 변경된 프로젝트의 항목/진행률 갱신
4. 모든 TODO 완료된 프로젝트 → "완료 ✅" 섹션으로 이동
5. "마지막 업데이트" 날짜를 오늘로 갱신

### 5단계: 결과 리포트

**출력 형식:**

```markdown
## Pull Sync 결과

### Git Pull
| 프로젝트 | 상태 | 변경 파일 수 |
|---------|------|------------|
| activity-hub | Updated | 3 files |
| memo-alarm | Already up to date | 0 |
| line-minder | ⚠️ Dirty (스킵) | - |
| auth-worker | ⚠️ Not on main (스킵) | - |

### Plan 변경 감지
| 프로젝트 | Plan 문서 | 상태 | 조치 |
|---------|----------|------|------|
| activity-hub | layout-fix.md | 완료 (18/18) | → archive + DONE.md |
| line-minder | auth-layout.md | 미완료 (5/27) | → TODO.md 갱신 |

### wtools/TODO.md
- ✅ 동기화 완료 (마지막 업데이트: 2026-02-05)

### Redis 정리 (monitor-page)
- ✅ Redis 잔존 N개 정리됨  ← cleaned > 0 일 때만 표시
- ⚠️ Redis cleanup API 호출 실패 (서버 미실행?)  ← 실패 시 표시

### 주의사항
- ⚠️ {N}개 프로젝트 스킵됨 (미커밋/비main 브랜치)
- 스킵된 프로젝트는 먼저 정리 후 다시 실행하세요
```

## 체크리스트

실행 전 확인:
- [ ] 로컬 변경사항이 있는 프로젝트는 먼저 커밋/스태시
- [ ] 모든 프로젝트가 main 브랜치에 있는지 확인

실행 후 확인:
- [ ] Git Pull 결과 테이블 확인
- [ ] Plan 변경 감지 테이블 확인
- [ ] wtools/TODO.md 동기화됨
- [ ] 스킵된 프로젝트 확인 및 정리

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **병렬 실행**: Task 도구 사용 (15개 프로젝트 동시 처리)

## 🚨 절대 금지 명령어

```bash
# ❌ FORBIDDEN
git commit
git commit -m "..."
"D:\work\project\tools\common\commit.sh" "message"  # cd 없이 실행 금지

# ✅ REQUIRED — 1순위
powershell.exe -Command "Set-Location '{레포경로}'; & 'D:\work\project\tools\common\commit.ps1' 'message'"

# ✅ REQUIRED — 2순위 (반드시 cd 먼저)
cd "/d/work/project/service/wtools/{project}" && bash "/d/work/project/tools/common/commit.sh" "message"
```
