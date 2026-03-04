---
name: merge-test
description: "워크트리 브랜치를 main에 머지하고 T3/T4 통합테스트를 실행한다. /implement 완료 후, /done 전에 호출."
triggers: ["머지 테스트", "merge-test", "머지후테스트", "통합테스트", "merge test"]
---

# 머지 후 통합테스트 게이트

`/implement`로 worktree에서 구현 완료 후, main에 머지하고 T3/T4 통합테스트를 실행합니다.
완료 후 `/done`을 호출하여 archive 처리합니다.

## 워크플로우 위치

```
/implement (worktree 구현 + T1/T2 단위테스트)
  → /merge-test  ← 지금 여기
  → /done (archive + 문서정리 + 커밋)
```

## 전제 조건 확인

실행 전 다음 조건을 모두 확인한다:

1. **plan 헤더에 `> branch:` 필드 존재** — 없으면 워크트리 미사용 구현이므로 이 스킬 불필요. `/done` 직접 호출.
2. **plan 상태가 `구현중`** — 다른 상태면 경고 후 중단
3. **모든 구현 체크박스 `[x]` 완료** — 미완료 `[ ]` 항목이 있으면 경고 (T3/T4 체크박스는 제외하고 판단)

```
전제 조건 실패 시:
- branch 없음 → "워크트리 미사용 구현입니다. /done을 직접 호출하세요."
- 상태 불일치 → "plan 상태가 {현재상태}입니다. 구현중 상태에서만 실행 가능합니다."
- 미완료 체크박스 → "미완료 항목이 있습니다: {목록}. 계속하시겠습니까?"
```

## 실행 단계

### 1단계: plan 정보 추출

plan 헤더에서 다음을 읽는다:
```
> branch: impl/{slug}
> worktree: .worktrees/impl-{slug}
```

slug, branch명, worktree 경로를 변수로 저장.

### 2단계: 머지 실행

**cwd를 원본 프로젝트 디렉토리로 전환** (워크트리 밖):
- wtools 내부 작업 시: wtools 루트
- monitor-page 등 외부 프로젝트: 해당 프로젝트 루트

```bash
# 원본 프로젝트 루트에서 실행
git merge impl/{slug} --no-ff -m "merge: impl/{slug}"
```

머지 성공 즉시 커밋 해시를 추출하여 plan 헤더에 기록한다:

```bash
MERGE_HASH=$(git rev-parse --short HEAD)
MERGE_DATE=$(date +%Y-%m-%d\ %H:%M)
```

plan 헤더에 다음 두 줄을 `> 상태:` 줄 바로 아래에 Edit으로 삽입:

```markdown
> 반영일: {MERGE_DATE}
> 머지커밋: {MERGE_HASH}
```

예시:
```markdown
> 상태: 구현완료
> 반영일: 2026-03-04 14:32
> 머지커밋: a1b2c3d
```

**머지 충돌 시:**
1. `git merge --abort` 실행
2. 충돌 파일 목록 사용자에게 보고
3. 워크트리+브랜치 보존 (사용자가 수동 해결 후 재시도 가능)
4. **이후 단계 전체 중단** — 상태 변경 없음

### 3단계: 상태 전이 #1 (T3/T4 있는 경우)

plan에 T3/T4 체크박스가 있으면:

```markdown
> 상태: 통합테스트중
```

plan 헤더 + 푸터(`*상태: ...*`) 모두 Edit으로 업데이트.

T3/T4가 없으면 → 5단계(정리)로 바로 이동.

### 4단계: T3/T4 탐지 및 실행

**T3/T4 탐지**: plan 문서에서 아래 패턴 확인:
- `### Phase T3` 또는 `T3:` 체크박스
- `### Phase T4` 또는 `T4:` 체크박스

**T3/T4가 있으면:**

1. **서비스 재시작** (monitor-page 한정):
   ```bash
   python "D:/work/project/tools/monitor-page/scripts/browser_workers.py" restart-api
   ```
   wtools 내부 작업이면 해당 프로젝트의 서버 재시작 방식 사용.

2. **T3 실행** (E2E 존재 시):
   ```bash
   pytest -m e2e  # 또는 해당 프로젝트 E2E 명령
   ```

3. **T4 실행** (HTTP 통합):
   ```bash
   pytest -m http  # 또는 curl 기반 테스트
   ```

4. 각 T3/T4 체크박스 `[ ]` → `[x]` 업데이트, Read로 반영 확인

**테스트 실패 시:**
```bash
# 머지 커밋만 되돌리기 (HEAD~1이 머지 커밋)
git reset --merge HEAD~1
```
- plan 상태 롤백: `통합테스트중` → `구현중`
- 워크트리+브랜치 보존 (수정 후 재시도 가능)
- 실패 로그 사용자에게 보고
- **이후 단계 중단**

### 5단계: worktree 정리

모든 테스트 통과 (또는 T3/T4 없이 머지만 완료) 후:

```bash
# 원본 프로젝트 루트에서 실행
git worktree remove .worktrees/impl-{slug} --force
git branch -D impl/{slug}
```

plan 헤더에서 아래 두 줄 Edit으로 제거:
```
> branch: impl/{slug}
> worktree: .worktrees/impl-{slug}
```

### 6단계: 상태 전이 #2

plan 헤더 + 푸터를 `구현완료`로 업데이트:

```markdown
> 상태: 구현완료
> 반영일: {MERGE_DATE}   ← 2단계에서 이미 기록됨, 여기서 재확인만
> 머지커밋: {MERGE_HASH} ← 2단계에서 이미 기록됨, 여기서 재확인만
> 진행률: N/N (100%)
...
*상태: 구현완료 | 진행률: N/N (100%)*
```

`반영일`과 `머지커밋`은 2단계에서 이미 삽입되어 있으므로 중복 추가하지 않는다.

### 7단계: 완료 안내

```
머지 및 통합테스트 완료

plan: {plan_file}
머지: impl/{slug} → main ✅
반영일: {MERGE_DATE} ({MERGE_HASH}) ({MERGE_HASH})
T3/T4: {통과/해당없음} ✅
상태: 구현완료

이제 /done을 호출하여 archive 처리를 완료하세요.
```

## T3/T4 스킵 규칙

포함 조건 미충족 시 Phase 자체를 plan에서 생략 가능 (체크박스 없이).

조건 충족인데 스킵하려면 → 체크박스에 스킵 사유 명시 필수:
```
- [x] T3 E2E — 스킵: {구체적 사유}
- [x] T4 HTTP — 스킵: {구체적 사유}
```

**금지**: "단위 테스트로 커버됨" 같은 자의적 판단으로 체크.
T3/T4는 단위 테스트와 검증 범위가 다르므로 대체 불가.

## worktree 미사용 시

plan에 `> branch:` 필드가 없으면 (main에서 직접 작업):
- 이 스킬을 건너뛰고 바로 `/done` 호출

## 환경

- **cwd**: 반드시 원본 프로젝트 루트 (워크트리 내에서 git merge 금지)
- **Windows**: 절대경로, PowerShell 전용
