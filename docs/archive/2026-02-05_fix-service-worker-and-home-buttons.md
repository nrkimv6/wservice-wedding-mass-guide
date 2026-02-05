# 공통앱(홈) Service Worker + 버튼 결함 수정 계획서

> 상태: 완료 ✅
> 완료일: 2026-02-06
> 진행률: 23/23 (100%)
> 아카이브됨
> 수동 검증: [MANUAL_TASKS.md](../../MANUAL_TASKS.md#wmg-sw-3-service-worker--버튼-동작-검증-배포-후) 참조

## 개요

| 항목 | 내용 |
|------|------|
| 프로젝트 | wedding-mass-guide |
| 발견일 | 2026-02-05 |
| 발견 위치 | 공통앱 홈페이지 (`https://wedding-mass-guide.woory.day/`) |
| 결함 총계 | **CRITICAL: 2건** ✅, **MEDIUM: 1건** (배포 후 검증) |

### 심각도 기준

| 심각도 | 설명 |
|--------|------|
| CRITICAL | 런타임 에러 또는 기능 완전 불능. 즉시 수정 필요 |
| MEDIUM | 기능 일부 미작동 또는 데이터 불일치. 조기 수정 권장 |

### 재현 콘솔 로그

```
Navigated to https://wedding-mass-guide.woory.day/
sw.js:12 [SW] Installing service worker...
sw.js:15 [SW] Caching app shell
sw.js:1 Uncaught (in promise) TypeError: Failed to execute 'addAll' on 'Cache': Request failed
BfLkFSt9.js:1 Uncaught TypeError: Cannot read properties of undefined (reading 'church_name')
    at DbC6DHIL.js:124:5400
```

---

## WMG-SW-1: Service Worker Cache 실패 (CRITICAL)

### 현상

Service Worker 설치 시 `cache.addAll()` 호출이 실패하여 오프라인 캐싱이 전혀 작동하지 않음.
이전 SW가 계속 활성화되어 **구버전 JS를 서빙**하고, 이로 인해 전체 페이지 인터랙션이 깨질 수 있음.

### 근본 원인

`static/sw.js`에 하드코딩된 경로가 실제 빌드 출력과 불일치:

**현재 코드** (`static/sw.js:3-8`):

```javascript
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/_app/immutable/entry/start.js',   // ❌ 실제: start.BfLkFSt9.js (해시 포함)
    '/_app/immutable/entry/app.js'       // ❌ 실제: app.DbC6DHIL.js (해시 포함)
];
```

SvelteKit은 빌드 시 `/_app/immutable/entry/start.[hash].js` 형태로 파일명을 생성함.
`cache.addAll()`은 **하나라도 404이면 전체 실패**하므로, SW 설치 자체가 실패함.

### 추가 문제: 이중 Service Worker 충돌

- `static/sw.js` → 수동 등록 (`serviceWorker.ts:14`)
- `src/service-worker.ts` → SvelteKit 내장 SW (`$service-worker` import 사용)

두 개의 SW가 공존하지만 실제로 등록되는 것은 `static/sw.js`뿐임.
`src/service-worker.ts`가 올바른 방식(빌드 해시 자동 반영)인데 사용되지 않고 있음.

### 수정 방안

**`static/sw.js`를 제거하고 SvelteKit 내장 Service Worker로 통합**

| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | `static/sw.js` 삭제 | `static/sw.js` |
| 2 | `registerServiceWorker()` 경로를 `/service-worker.js`로 변경 | `src/lib/utils/serviceWorker.ts:14` |
| 3 | `src/service-worker.ts`에 `CACHE_MASS_DATA` 메시지 핸들러 추가 (기존 `static/sw.js`의 92-104행 기능 이전) | `src/service-worker.ts` |

**변경 후 `src/lib/utils/serviceWorker.ts`**:

```typescript
// Before
const registration = await navigator.serviceWorker.register('/sw.js');

// After
const registration = await navigator.serviceWorker.register('/service-worker.js');
```

**변경 후 `src/service-worker.ts`** (메시지 핸들러 보강):

```typescript
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    // static/sw.js에서 이전
    if (event.data && event.data.type === 'CACHE_MASS_DATA') {
        const { massId, massData } = event.data;
        caches.open(CACHE).then((cache) => {
            const response = new Response(JSON.stringify(massData), {
                headers: { 'Content-Type': 'application/json' }
            });
            cache.put(`/api/mass/${massId}`, response);
        });
    }
});
```

---

## WMG-SW-2: MassInfoPage church_name undefined 에러 (CRITICAL)

### 현상

공통앱 홈페이지(`/`)에서 Info(ℹ) 버튼 클릭 시 런타임 에러 발생:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'church_name')
```

### 근본 원인

**`src/routes/+page.svelte:281-283`**:

```svelte
{#if showInfo}
    <MassInfoPage onClose={() => (showInfo = false)} />
    <!-- ❌ 필수 prop 'massConfig' 미전달 -->
{/if}
```

`MassInfoPage` 컴포넌트는 `massConfig: MassConfiguration` prop이 필수:

```typescript
// src/lib/components/MassInfoPage.svelte:5-8
interface Props {
    massConfig: MassConfiguration;  // 필수!
    onClose: () => void;
}
```

컴포넌트 내부에서 `massConfig.church_name`, `massConfig.groom_name` 등을 바로 접근하므로 `massConfig`이 `undefined`이면 즉시 crash.

**비교 - 미사 전용 페이지(`mass/[massId]`)의 올바른 사용**:

```svelte
<!-- src/routes/mass/[massId]/+page.svelte:395-396 -->
{#if showInfo && massConfig}
    <MassInfoPage {massConfig} onClose={() => (showInfo = false)} />
{/if}
```

### 수정 방안

공통앱 홈에는 미사 정보가 없으므로, **일반 안내 페이지를 별도로 표시**하거나 **info 버튼을 비활성화**한다.

| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | 공통앱용 간단한 안내 컴포넌트 생성 (`CommonInfoPage.svelte`) | `src/lib/components/CommonInfoPage.svelte` |
| 2 | 홈페이지에서 `MassInfoPage` 대신 `CommonInfoPage` 사용 | `src/routes/+page.svelte:281-283` |

**`CommonInfoPage.svelte` 내용**:

```svelte
<script lang="ts">
    import { X } from 'lucide-svelte';

    interface Props {
        onClose: () => void;
    }

    let { onClose }: Props = $props();
</script>

<div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    onclick={onClose} role="dialog" aria-modal="true">
    <div class="bg-background rounded-lg shadow-xl max-w-[500px] w-full"
        onclick={(e) => e.stopPropagation()}>
        <div class="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between">
            <h2 class="text-lg font-bold">혼배미사 안내</h2>
            <button onclick={onClose} class="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="닫기">
                <X class="w-5 h-5" />
            </button>
        </div>
        <div class="p-6 space-y-4">
            <p class="text-foreground/80">
                이 앱은 가톨릭 혼배미사 순서를 안내합니다.
            </p>
            <p class="text-foreground/80">
                개별 미사 정보는 전용 링크(QR코드)를 통해 접속하면 확인할 수 있습니다.
            </p>
            <div class="bg-muted/30 rounded-lg p-4 text-sm space-y-2">
                <p class="font-semibold">사용 방법</p>
                <ul class="list-disc list-inside space-y-1 text-foreground/70">
                    <li>좌우 스와이프 또는 화살표 버튼으로 단계 이동</li>
                    <li>상단 +/- 버튼으로 글자 크기 조절</li>
                    <li>좌측 ☰ 버튼으로 목차 열기</li>
                    <li>우측 하단 ⚙ 버튼으로 테마 변경</li>
                </ul>
            </div>
        </div>
    </div>
</div>
```

**`+page.svelte` 수정**:

```svelte
<!-- Before -->
{#if showInfo}
    <MassInfoPage onClose={() => (showInfo = false)} />
{/if}

<!-- After -->
{#if showInfo}
    <CommonInfoPage onClose={() => (showInfo = false)} />
{/if}
```

---

## WMG-SW-3: 상단 버튼 4개 동작 불능 (MEDIUM)

### 현상

공통앱 홈페이지에서 Header의 모든 버튼(목차, 정보, 글자축소, 글자확대)이 동작하지 않음.

### 근본 원인 (추정)

**직접적 코드 버그가 아닌 Service Worker 캐시 문제로 인한 2차 장애.**

| 원인 | 설명 |
|------|------|
| 1차 | `static/sw.js`의 `cache.addAll()` 실패로 SW 설치가 반복 실패 |
| 2차 | 이전에 설치된 구버전 SW가 계속 활성화되어 **구버전 JS 파일을 서빙** |
| 결과 | 구버전 JS와 현재 HTML 사이의 hydration 불일치로 이벤트 핸들러 미작동 |

**근거**: Header 컴포넌트 코드 자체는 정상 (`src/lib/components/Header.svelte`):
- `onclick={onMenuClick}` (30-38행) → `() => (showToc = true)`
- `onclick={onInfoClick}` (42-48행) → `() => (showInfo = true)`
- `onclick={onDecreaseSize}` (59-66행) → `decreaseTextSize()`
- `onclick={onIncreaseSize}` (67-74행) → `increaseTextSize()`

핸들러 바인딩에 문제 없음. **WMG-SW-1 수정으로 자연 해결될 가능성이 높음.**

### 수정 방안

| 단계 | 작업 |
|------|------|
| 1 | WMG-SW-1 (Service Worker 통합) 수정 먼저 적용 |
| 2 | 배포 후 브라우저 캐시 완전 초기화하여 재검증 |
| 3 | 여전히 미작동 시 → hydration 로그 분석 후 별도 대응 |

**사용자 즉시 우회**: 브라우저 DevTools → Application → Service Workers → Unregister all → 새로고침

---

## 수정 순서 및 영향도

```
WMG-SW-1 (Service Worker 통합)
    └── 의존: WMG-SW-3 (버튼 미작동) → 자연 해결 예상
WMG-SW-2 (MassInfoPage → CommonInfoPage)
    └── 독립: 별도 수정
```

### 작업 순서

| 순번 | 결함 ID | 작업 | 예상 수정 파일 |
|------|---------|------|---------------|
| 1 | WMG-SW-1 | `static/sw.js` 삭제 + SW 등록 경로 변경 + `src/service-worker.ts` 보강 | `static/sw.js`, `src/lib/utils/serviceWorker.ts`, `src/service-worker.ts` |
| 2 | WMG-SW-2 | `CommonInfoPage.svelte` 생성 + 홈페이지에서 사용 | `src/lib/components/CommonInfoPage.svelte`, `src/routes/+page.svelte` |
| 3 | WMG-SW-3 | WMG-SW-1 배포 후 검증 | — |

---

## 세부 체크리스트 (원자 단위)

### WMG-SW-1: Service Worker 통합 (3개 파일)

#### 1-1. `static/sw.js` 삭제

- [x] `static/sw.js` 파일 삭제 (105행 전체)
- [x] 삭제 확인: `static/` 폴더에 `sw.js`가 없는 것을 확인

#### 1-2. `src/lib/utils/serviceWorker.ts` 등록 경로 변경

- [x] 14행: `'/sw.js'` → `'/service-worker.js'`로 변경
  - 변경 전: `navigator.serviceWorker.register('/sw.js')`
  - 변경 후: `navigator.serviceWorker.register('/service-worker.js')`
- [x] 다른 부분은 수정하지 않음 (나머지 코드는 `CACHE_MASS_DATA` 메시지 전송 로직이며 SW 경로와 무관)

#### 1-3. `src/service-worker.ts`에 `CACHE_MASS_DATA` 핸들러 추가

- [x] 65~68행의 기존 `message` 이벤트 리스너 찾기 (`SKIP_WAITING`만 처리 중)
- [x] `SKIP_WAITING` 분기 아래에 `CACHE_MASS_DATA` 분기 추가 (계획서 상단 코드 블록 참고)
  - `event.data.type === 'CACHE_MASS_DATA'` 조건 추가
  - `event.data`에서 `massId`, `massData` 구조분해
  - `caches.open(CACHE)` 호출 (4행에 정의된 `CACHE` 상수 사용)
  - `new Response(JSON.stringify(massData))` 생성 후 `cache.put()` 호출
  - 캐시 키: `/api/mass/${massId}`
- [x] `CACHE` 변수가 이미 4행에 `const CACHE = 'cache-${version}'`으로 선언되어 있는지 확인 (새로 만들지 않기)

---

### WMG-SW-2: 공통앱 Info 페이지 교체 (2개 파일)

#### 2-1. `CommonInfoPage.svelte` 신규 생성

- [x] `src/lib/components/CommonInfoPage.svelte` 파일 생성 (계획서 상단 코드 블록 참고)
- [x] Props 인터페이스: `onClose: () => void` 만 필요 (`massConfig` 불필요)
- [x] `$props()`로 `onClose` 받기
- [x] 최외곽: `fixed inset-0 z-50` 오버레이 (`MassInfoPage.svelte`와 동일한 레이아웃 구조)
- [x] 배경 클릭 시 `onClose` 호출 (최외곽 `div`에 `onclick={onClose}`)
- [x] 내부 모달: `bg-background rounded-lg shadow-xl max-w-[500px]` (기존 `MassInfoPage`와 동일한 스타일)
- [x] 내부 모달 클릭 시 이벤트 전파 차단: `onclick={(e) => e.stopPropagation()}`
- [x] 상단 헤더: 제목 "혼배미사 안내" + X 닫기 버튼 (`lucide-svelte`의 `X` 아이콘 import)
- [x] 본문: 앱 설명 텍스트 + 사용 방법 안내 (`ul` 리스트)
  - 스와이프/화살표로 단계 이동
  - +/- 버튼으로 글자 크기 조절
  - ☰ 버튼으로 목차 열기
  - ⚙ 버튼으로 테마 변경
- [x] 접근성 속성: `role="dialog"`, `aria-modal="true"`, 닫기 버튼에 `aria-label="닫기"`

#### 2-2. `src/routes/+page.svelte` import 교체

- [x] 14행의 `MassInfoPage` import 문 찾기:
  `import MassInfoPage from '$lib/components/MassInfoPage.svelte';`
- [x] `CommonInfoPage` import로 **교체** (MassInfoPage import은 삭제):
  `import CommonInfoPage from '$lib/components/CommonInfoPage.svelte';`

#### 2-3. `src/routes/+page.svelte` 컴포넌트 사용부 교체

- [x] 281~283행의 기존 코드 찾기:
  `{#if showInfo}` → `<MassInfoPage onClose=...` → `{/if}`
- [x] `MassInfoPage` → `CommonInfoPage`로 변경
- [x] `massConfig` prop 전달하지 않음 (이미 안 하고 있었음, 그대로 유지)
- [x] `onClose={() => (showInfo = false)}` 핸들러는 그대로 유지

---

### WMG-SW-3: 배포 후 검증 (코드 수정 없음)

#### 3-1. 빌드 확인

- [x] `npm run build` 실행하여 빌드 오류 없는지 확인
- [x] 빌드 출력에서 `service-worker.js` 파일이 생성되는지 확인

#### 3-2. 배포 후 브라우저 검증

- [ ] `https://wedding-mass-guide.woory.day/` 접속
- [ ] DevTools → Application → Service Workers 에서 기존 SW 모두 Unregister
- [ ] 새로고침 후 콘솔에서 SW 설치 성공 확인 (에러 없어야 함)
- [ ] Info(ℹ) 버튼 클릭 → `CommonInfoPage` 표시, `church_name` 에러 없음 확인
- [ ] 목차(☰) 버튼 클릭 → 목차 오버레이 열림 확인
- [ ] 글자 축소(-) 버튼 클릭 → 글자 크기 줄어듦 확인
- [ ] 글자 확대(+) 버튼 클릭 → 글자 크기 커짐 확인
- [ ] 콘솔에 `TypeError` 또는 `Uncaught` 에러가 없는지 확인
