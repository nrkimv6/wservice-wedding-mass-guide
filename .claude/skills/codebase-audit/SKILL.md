---
name: codebase-audit
description: "코드베이스 정기 점검 (결함, 미사용 코드, UX, 미구현 UI, cross-project 영향 분석). Use when: 점검, audit, 검사, 코드 점검, 정기 점검, 코드 감사"
---

# 코드베이스 정기 점검

wtools 전체 프로젝트를 대상으로 코드 품질, 결함, UX, 미구현 요소 등을 점검합니다.

## 트리거

- "점검", "audit", "검사", "코드 점검", "정기 점검", "코드 감사"
- 정기적으로 코드 품질을 확인하고 싶을 때

## 점검 대상 프로젝트

활성 프로젝트만 대상으로 합니다 (archive, node_modules, _sample 제외):

- activity-hub, admin-tools, auth-worker, gentle-words
- line-minder, memo-alarm, mini-toolbox, sacred-hours
- screenshot-generator, story-weaver, tb-wish, tool-view
- wedding-mass-guide

## 실행 단계

### Phase 0: 점검 범위 선택

사용자에게 질문:
- **전체 점검** (모든 카테고리, 모든 프로젝트) — 시간 많이 소요
- **특정 프로젝트만** — 1~2개 프로젝트 집중 점검
- **특정 카테고리만** — 아래 카테고리 중 선택

기본값: 전체 점검

---

### Phase 1: 결함 파악 (Defect Detection)

각 프로젝트에서 **Task(Explore)** 병렬로 실행:

**1-1. 타입 에러 & 빌드 오류**
```powershell
cd "D:\work\project\service\wtools\{project}"
npx tsc --noEmit 2>&1
```

**1-2. 런타임 위험 패턴 탐지**
코드에서 아래 패턴 검색 (Grep 사용):
- `any` 타입 남용 (`as any`, `: any`)
- 에러 무시 (`catch {}`, `catch (_)`)
- 널 위험 (`!.`, 연쇄 옵셔널 체이닝 `?.?.?.`)
- 하드코딩된 비밀값 (`password`, `secret`, `api_key` 등 리터럴)
- `console.log` 잔류 (디버깅용 로그)

**1-3. 미완료 코드**
- `TODO`, `FIXME`, `HACK`, `XXX`, `TEMP`, `WORKAROUND` 주석 수집
- 각각 위치와 내용 기록

---

### Phase 2: 미사용 코드 탐지 (Dead Code)

> **핵심: 미사용 원인을 반드시 분류한다**

미사용 코드를 발견하면 아래 3가지 유형으로 분류:

| 유형 | 설명 | 판단 기준 | 권장 조치 |
|------|------|----------|----------|
| **A. 미사용 (구현만 됨)** | 만들어놓고 한번도 사용하지 않음 | git log에 해당 함수 호출 이력 없음, 연관 import 0건 | 삭제 또는 TODO에 활용 계획 등록 |
| **B. 퇴역 (과거 사용됨)** | 개선/리팩토링으로 더이상 사용되지 않음 | git log에 과거 import/호출 이력 존재, 최근 커밋에서 제거됨 | 안전하게 삭제 |
| **C. 간접 사용** | 직접 import 없지만 동적으로 사용됨 | dynamic import, 라우팅, 이벤트 핸들러 등 | 삭제 금지, 주석으로 사용처 명시 권장 |

**분류 방법:**

```powershell
# 1. import 0건인 대상 식별 후
# 2. git log로 해당 파일/함수의 호출 이력 확인
cd "D:\work\project\service\wtools\{project}"
git log --all -p -S "함수명" -- "*.ts" "*.svelte"
```

- **호출 이력 0건** → 유형 A (구현만 됨)
- **과거 호출 이력 있고, 최근 제거됨** → 유형 B (퇴역)
- **import 없지만 동적 참조 존재** → 유형 C (간접 사용)

**2-1. 미사용 export 함수/컴포넌트**
각 프로젝트의 `src/lib/` 하위 export된 함수/컴포넌트가 실제로 import 되는지 확인:
- `export function` / `export const` 선언 목록 수집
- 해당 이름이 다른 파일에서 import 되는지 검색
- 0회 import → git log로 유형 A/B/C 분류

**2-2. 미사용 Svelte 컴포넌트**
- `src/lib/components/` 내 `.svelte` 파일 목록
- 다른 파일에서 해당 컴포넌트 import 여부 확인
- 미사용 시 git log로 유형 분류

**2-3. 미사용 npm 패키지**
```powershell
# package.json의 dependencies vs 실제 import 비교
# 미사용 패키지도 유형 분류:
# A: 설치만 하고 사용 안 함
# B: 과거 사용했지만 다른 패키지로 대체됨
```

---

### Phase 2.5: 반복 패턴 위반 탐지 (Pattern Compliance)

> 상세: @recurring-patterns 스킬 참조

확립된 코드 패턴을 위반하는 코드를 탐지합니다.

**2.5-1. 프론트엔드 패턴 위반** (Grep 사용)
- `alert(` 또는 `confirm(` 호출 — toast/ConfirmDialog로 교체 필요
- `window.location.reload()` — 401 처리에서 사용 금지
- `await load` + 전체 목록 재호출 패턴 (POST/DELETE 직후) — 로컬 상태 갱신 권장
- Array 기반 선택 코드 (`selectedXxx.includes(`, `selectedXxx.filter(`) — `createSelection()` 유틸 사용 권장

**2.5-2. 백엔드 패턴 위반** (monitor-page만 해당)
- 라우터에서 `subprocess.Popen` 직접 호출 — Redis 큐 위임 필요
- `time.sleep()` 또는 동기 블로킹 호출 — async 전환 필요
- 워커 `_main_loop_iteration` 내 `_safe_execute` 미사용 — 예외 격리 필요

---

### Phase 3: 개선점 탐지 (Improvement Opportunities)

**3-1. 성능**
- 큰 번들 임포트 (`import * from`, 전체 라이브러리 임포트)
- 불필요한 리렌더링 유발 패턴 (Svelte 5 rune 미사용)
- N+1 쿼리 패턴 (Supabase 호출 반복)

**3-2. 코드 품질**
- 500줄 초과 파일
- 깊은 중첩 (4레벨 이상 if/for)
- 중복 코드 (프로젝트 간 copy-paste 패턴) → 발견 시 `_sample` 프로젝트에 해당 코드 추가 제안. 공통 패키지 분리 제안 금지 (별도 레포 간 file: 의존성은 배포 불가)

**3-3. 프로젝트 간 일관성**
- 인증 처리 방식 불일치 (auth-worker 연동)
- 에러 처리 패턴 불일치
- 레이아웃 구조 불일치

---

### Phase 4: UX 문제 탐지 (Usability Issues)

**4-1. 접근성(a11y)**
- `<button>`, `<a>` 에 aria-label 누락
- `<img>` 에 alt 속성 누락
- 키보드 탐색 불가 요소 (`tabindex` 없는 interactive 요소)
- `role` 속성 누락된 커스텀 interactive 요소

**4-2. 사용성 문제**
- 로딩 상태 미표시 (fetch 호출 후 spinner/skeleton 없음)
- 에러 상태 미표시 (catch 후 사용자 피드백 없음)
- 빈 상태 미처리 (데이터 0건일 때 안내 메시지 없음)
- 확인 없는 삭제 (delete 동작에 confirm 없음)

---

### Phase 5: 미구현 UI 탐지 (Unimplemented Interactive Elements)

**5-1. 비활성 버튼/링크**
- `disabled` 상태 고정된 버튼
- `href="#"` 또는 `href=""` 링크
- `onclick` 핸들러가 빈 함수 (`() => {}`, `noop`)
- `TODO` 주석이 달린 이벤트 핸들러

**5-2. 미연결 라우트**
- `+page.svelte` 존재하지만 메뉴/네비게이션에서 링크 없는 페이지
- 네비게이션에 있지만 `+page.svelte` 없는 경로

**5-3. 미구현 모달/다이얼로그**
- import 되었지만 실제 표시 로직 없는 모달 컴포넌트
- `showModal`, `isOpen` 등 상태값이 있지만 토글 로직 없음

---

### Phase 6: Cross-Project 영향 분석 (Impact Analysis)

**6-1. 최근 archive 기반 분석**
```powershell
# 최근 7일 archive 파일 확인
Get-ChildItem "D:\work\project\service\wtools\common\docs\archive" |
  Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) } |
  Sort-Object LastWriteTime -Descending
```

각 archive 문서를 읽고:
- 변경된 공유 코드 (auth-worker, common/) 식별
- 해당 코드를 사용하는 다른 프로젝트 목록 도출
- 영향받는 프로젝트에서 해당 코드 호출부 확인
- 수정/테스트 필요 여부 판단

**6-2. 공유 의존성 변경 영향**
- `auth-worker` API 변경 → 모든 클라이언트 프로젝트 확인
- `common/` 공유 유틸 변경 → 사용처 확인
- Supabase 스키마 변경 → 관련 프로젝트 쿼리 확인

---

### Phase 7: 환경 설정 점검

- `wrangler.toml` 환경 변수 vs 코드 내 `env.` 참조 비교
- `.dev.vars.example` 존재 여부
- 배포 환경별 설정 누락 확인

---

## 출력 형식

```markdown
# 코드베이스 점검 보고서 — {날짜}

## 요약
| 카테고리 | 발견 건수 | 심각도 높음 | 중간 | 낮음 |
|---------|---------|-----------|------|------|
| 결함 | N | N | N | N |
| 미사용 코드 | N | - | N | N |
| 개선점 | N | N | N | N |
| UX 문제 | N | N | N | N |
| 미구현 UI | N | N | N | N |
| Cross-Project | N | N | N | N |
| 환경 설정 | N | N | N | N |

## Phase 1: 결함
### 심각도 높음 🔴
- [{project}] {파일}:{줄} — {설명}

### 심각도 중간 🟡
- ...

### 심각도 낮음 🟢
- ...

## Phase 2: 미사용 코드
### 유형 A — 구현만 됨 (한번도 사용 안 함)
- [{project}] {파일}:{줄} `{함수명}` — git 이력에 호출 기록 없음

### 유형 B — 퇴역 (과거 사용, 현재 미사용)
- [{project}] {파일}:{줄} `{함수명}` — {대체된 이유/커밋 해시}

### 유형 C — 간접 사용 (동적 참조)
- [{project}] {파일}:{줄} `{함수명}` — {사용처 설명}

(각 Phase별 상세 내용)

## 권장 조치
1. [즉시] {설명} — {프로젝트}
2. [계획] {설명} — {프로젝트}
3. [참고] {설명} — {프로젝트}
```

## 보고서 저장

점검 결과를 파일로 저장:
```
common/docs/audit/{날짜}_codebase-audit.md
```

## 후속 조치

1. **즉시 수정 가능한 항목**: 사용자 확인 후 바로 수정
2. **계획 필요 항목**: `common/docs/plan/` 에 계획서 생성
3. **TODO 등록**: 각 프로젝트 TODO.md에 발견 사항 등록

---

## 체크리스트

실행 전:
- [ ] 점검 범위 확인 (전체/특정 프로젝트/특정 카테고리)
- [ ] 각 프로젝트 빌드 가능 상태인지 확인

실행 후:
- [ ] 보고서 `common/docs/audit/` 에 저장됨
- [ ] 심각도 높음 항목 사용자에게 보고됨
- [ ] 후속 조치 계획 수립됨

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **커밋**: 점검 결과로 코드 수정 시 `powershell.exe -Command "Set-Location '...'; & 'D:\work\project\tools\common\commit.ps1' '...'"` 필수

## 절대 금지

```bash
# ❌ FORBIDDEN
git commit
git reset --hard
Remove-Item -Recurse -Force
"D:\work\project\tools\common\commit.sh" "message"  # cd 없이 실행 금지

# ✅ REQUIRED — 1순위
powershell.exe -Command "Set-Location '{레포경로}'; & 'D:\work\project\tools\common\commit.ps1' 'message'"

# ✅ REQUIRED — 2순위 (반드시 cd 먼저)
cd "/d/work/project/service/wtools/{project}" && bash "/d/work/project/tools/common/commit.sh" "message"
```
