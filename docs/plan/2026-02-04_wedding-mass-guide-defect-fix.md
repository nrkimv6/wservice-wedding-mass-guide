# wedding-mass-guide 결함 수정 계획서

## 개요

| 항목 | 내용 |
|------|------|
| 프로젝트 | wedding-mass-guide |
| 감사일 | 2026-02-04 |
| 감사 범위 | Admin View 페이지, 컴포넌트 인터페이스 정합성, 타입 안전성 |
| 결함 총계 | **CRITICAL: 5건**, **MEDIUM: 3건**, **LOW: 2건** |

### 심각도 기준

| 심각도 | 설명 |
|--------|------|
| CRITICAL | 런타임 에러 또는 기능 완전 불능. 즉시 수정 필요 |
| MEDIUM | 기능 일부 미작동 또는 데이터 불일치. 조기 수정 권장 |
| LOW | 코드 품질, 보안 위생. 다음 릴리즈에 수정 |

---

## WMG-1: Header 컴포넌트 Prop 불일치 (CRITICAL)

### 현상

Admin View 페이지에서 `Header` 컴포넌트에 전달하는 prop 이름이 `Header.svelte`의 `Props` 인터페이스와 완전히 다름. Svelte 5에서 `$props()` 바인딩 실패로 **목차 버튼, 정보 버튼, 텍스트 크기 조절이 모두 작동하지 않음**.

### 파일 위치

- **호출부**: `src\routes\admin\mass\[massId]\view\+page.svelte` (327~334행)
- **컴포넌트**: `src\lib\components\Header.svelte` (6~14행)

### 현재 코드 (잘못됨)

**Header.svelte Props 인터페이스** (6~14행):

```typescript
interface Props {
    currentStep: MassStep;
    totalSteps: number;
    textSize: number;
    onMenuClick: () => void;
    onInfoClick: () => void;
    onDecreaseSize: () => void;
    onIncreaseSize: () => void;
}
```

**Admin View에서의 호출** (327~334행):

```svelte
<Header
    {currentStep}
    {totalSteps}
    onTocToggle={() => (showToc = !showToc)}
    onInfoToggle={() => (showInfo = !showInfo)}
    onTextSizeChange={handleTextSizeChange}
    showInfoButton={true}
/>
```

### 문제 분석

| 전달된 prop | 기대하는 prop | 상태 |
|-------------|-------------|------|
| `currentStep` | `currentStep` | OK |
| `totalSteps` | `totalSteps` | OK |
| (미전달) | `textSize` | **MISSING** - 텍스트 크기 버튼 disabled 상태 판단 불가 |
| `onTocToggle` | `onMenuClick` | **WRONG** - 목차 버튼 클릭 시 아무 반응 없음 |
| `onInfoToggle` | `onInfoClick` | **WRONG** - 정보 버튼 클릭 시 아무 반응 없음 |
| `onTextSizeChange` | `onDecreaseSize` / `onIncreaseSize` | **WRONG** - 하나의 콜백을 두 개로 분리해야 함 |
| `showInfoButton` | (존재하지 않음) | **EXTRA** - 사용되지 않는 prop |

### 수정 코드

```svelte
<Header
    {currentStep}
    {totalSteps}
    textSize={textSizeStore.value}
    onMenuClick={() => (showToc = !showToc)}
    onInfoClick={() => (showInfo = !showInfo)}
    onDecreaseSize={() => handleTextSizeChange(-1)}
    onIncreaseSize={() => handleTextSizeChange(1)}
/>
```

### 테스트 기준

- [ ] 목차(Menu) 버튼 클릭 시 `showToc` 토글 확인
- [ ] 정보(Info) 버튼 클릭 시 `showInfo` 토글 확인
- [ ] 텍스트 축소(-) 버튼 클릭 시 `textSizeStore.value` 감소 확인
- [ ] 텍스트 확대(+) 버튼 클릭 시 `textSizeStore.value` 증가 확인
- [ ] `textSize`가 1일 때 축소 버튼 disabled 확인
- [ ] `textSize`가 5일 때 확대 버튼 disabled 확인
- [ ] 참고: 하객용 페이지(`mass/[massId]/+page.svelte` 321~329행)에서는 올바르게 전달하고 있으므로 비교 참조

---

## WMG-2: StepCard 컴포넌트 Prop 불일치 (CRITICAL)

### 현상

Admin View에서 `StepCard`에 전달하는 prop이 인터페이스와 불일치. `onPrev` 대신 `onPrevious`를 기대하고, `totalSteps`가 누락되어 **단계 표시(N/M)가 깨지고 이전/다음 버튼의 disabled 로직이 작동하지 않음**.

### 파일 위치

- **호출부**: `src\routes\admin\mass\[massId]\view\+page.svelte` (342~350행)
- **컴포넌트**: `src\lib\components\StepCard.svelte` (9~14행)

### 현재 코드 (잘못됨)

**StepCard.svelte Props 인터페이스** (9~14행):

```typescript
interface Props {
    step: MassStep;
    totalSteps: number;
    onPrevious: () => void;
    onNext: () => void;
}
```

**Admin View에서의 호출** (342~350행):

```svelte
<StepCard
    step={currentStep}
    {massConfig}
    onPrev={handlePrev}
    onNext={handleNext}
    canGoPrev={filteredMassSteps.findIndex((s) => s.id === currentStepIdStore.value) > 0}
    canGoNext={filteredMassSteps.findIndex((s) => s.id === currentStepIdStore.value) <
        filteredMassSteps.length - 1}
/>
```

### 문제 분석

| 전달된 prop | 기대하는 prop | 상태 |
|-------------|-------------|------|
| `step` | `step` | OK |
| (미전달) | `totalSteps` | **MISSING** - `{step.id}/{totalSteps}` 표시 불가, `canGoNext` 내부 계산 실패 |
| `onPrev` | `onPrevious` | **WRONG** - 이전 버튼 클릭 시 아무 반응 없음 |
| `onNext` | `onNext` | OK |
| `massConfig` | (존재하지 않음) | **EXTRA** - 사용되지 않는 prop |
| `canGoPrev` | (존재하지 않음) | **EXTRA** - StepCard가 내부적으로 `step.id > 1`로 계산 |
| `canGoNext` | (존재하지 않음) | **EXTRA** - StepCard가 내부적으로 `step.id < totalSteps`로 계산 |

### 수정 코드

```svelte
<StepCard
    step={currentStep}
    {totalSteps}
    onPrevious={handlePrev}
    onNext={handleNext}
/>
```

### 테스트 기준

- [ ] 단계 표시에 `{step.id}/{totalSteps}` 정상 출력 확인
- [ ] 이전 버튼 클릭 시 이전 단계로 이동 확인
- [ ] 다음 버튼 클릭 시 다음 단계로 이동 확인
- [ ] 첫 번째 단계에서 이전 버튼 disabled 확인
- [ ] 마지막 단계에서 다음 버튼 disabled 확인
- [ ] 참고: 하객용 페이지(`mass/[massId]/+page.svelte` 356~361행)에서 올바른 호출 확인

---

## WMG-3: ThemeSelector 컴포넌트 Prop 불일치 (CRITICAL)

### 현상

Admin View에서 `ThemeSelector`에 `onSelect`를 전달하지만, 컴포넌트는 `onSelectTheme`을 기대. **테마 변경이 완전히 작동하지 않음**.

### 파일 위치

- **호출부**: `src\routes\admin\mass\[massId]\view\+page.svelte` (375~379행)
- **컴포넌트**: `src\lib\components\ThemeSelector.svelte` (10~14행)

### 현재 코드 (잘못됨)

**ThemeSelector.svelte Props 인터페이스** (10~14행):

```typescript
interface Props {
    currentTheme: ThemeOption;
    onSelectTheme: (theme: ThemeOption) => void;
    onClose: () => void;
}
```

**Admin View에서의 호출** (375~379행):

```svelte
<ThemeSelector
    currentTheme={themeStore.value}
    onSelect={handleThemeChange}
    onClose={() => (showTheme = false)}
/>
```

### 문제 분석

| 전달된 prop | 기대하는 prop | 상태 |
|-------------|-------------|------|
| `currentTheme` | `currentTheme` | OK |
| `onSelect` | `onSelectTheme` | **WRONG** - 테마 클릭 시 콜백 미실행 |
| `onClose` | `onClose` | OK |

### 수정 코드

```svelte
<ThemeSelector
    currentTheme={themeStore.value}
    onSelectTheme={handleThemeChange}
    onClose={() => (showTheme = false)}
/>
```

### 테스트 기준

- [ ] ThemeSelector에서 테마 클릭 시 `themeStore.value` 변경 확인
- [ ] 테마 변경 후 UI에 새 테마 반영 확인
- [ ] 참고: 하객용 페이지(`mass/[massId]/+page.svelte` 387~391행)에서 올바른 호출 확인

---

## WMG-4: TableOfContents 컴포넌트 Prop 불일치 (CRITICAL)

### 현상

Admin View에서 `TableOfContents`에 전달하는 prop 이름 4개 중 3개가 인터페이스와 불일치. **목차가 열려도 섹션 데이터가 전달되지 않고, 섹션 클릭 시 이동하지 않음**.

### 파일 위치

- **호출부**: `src\routes\admin\mass\[massId]\view\+page.svelte` (364~371행)
- **컴포넌트**: `src\lib\components\TableOfContents.svelte` (4~15행)

### 현재 코드 (잘못됨)

**TableOfContents.svelte Props 인터페이스** (4~15행):

```typescript
interface Props {
    currentStep: number;
    onSelectSection: (stepId: number) => void;
    onClose: () => void;
    sections: Section[];
}
```

**Admin View에서의 호출** (364~371행):

```svelte
<TableOfContents
    steps={filteredMassSteps}
    {currentSections}
    currentStepId={currentStepIdStore.value}
    onClose={() => (showToc = false)}
    onSelect={handleTocSelect}
/>
```

### 문제 분석

| 전달된 prop | 기대하는 prop | 상태 |
|-------------|-------------|------|
| `steps` | (존재하지 않음) | **EXTRA** - 사용되지 않는 prop |
| `currentSections` | `sections` | **WRONG** - 변수 이름이 아닌 prop 이름으로 전달해야 함 |
| `currentStepId` | `currentStep` | **WRONG** - 현재 위치 하이라이트 미작동 |
| `onClose` | `onClose` | OK |
| `onSelect` | `onSelectSection` | **WRONG** - 섹션 클릭 시 이동 미작동 |

### 수정 코드

```svelte
<TableOfContents
    currentStep={currentStepIdStore.value}
    onSelectSection={handleTocSelect}
    onClose={() => (showToc = false)}
    sections={currentSections}
/>
```

### 테스트 기준

- [ ] 목차에 모든 섹션 정상 표시 확인
- [ ] 현재 단계에 해당하는 섹션 하이라이트 확인
- [ ] 섹션 클릭 시 해당 단계로 이동 확인
- [ ] 닫기 버튼 클릭 시 목차 닫힘 확인
- [ ] 참고: 하객용 페이지(`mass/[massId]/+page.svelte` 377~382행)에서 올바른 호출 확인

---

## WMG-5: wakeLockStore.request() 미존재 메서드 호출 (CRITICAL)

### 현상

Admin View에서 `wakeLockStore.request()`를 호출하지만, `WakeLockStore` 클래스에는 `request()` 메서드가 존재하지 않음. **런타임 TypeError 발생**으로 화면 꺼짐 방지 기능 미작동.

### 파일 위치

- **호출부**: `src\routes\admin\mass\[massId]\view\+page.svelte` (109행)
- **스토어**: `src\lib\stores\wakeLock.svelte.ts` (17~37행)

### 현재 코드 (잘못됨)

**wakeLock.svelte.ts에 존재하는 메서드** (17행, 39행):

```typescript
async enable() { ... }   // 17행
async disable() { ... }  // 39행
async reacquire() { ... } // 49행
// request() 메서드 없음!
```

**Admin View에서의 호출** (107~111행):

```typescript
$effect(() => {
    if (browser && hasStartedStore.value) {
        wakeLockStore.request();  // TypeError: wakeLockStore.request is not a function
    }
});
```

### 수정 코드

```typescript
$effect(() => {
    if (browser && hasStartedStore.value) {
        wakeLockStore.enable();
    }
});
```

### 참고

하객용 페이지(`mass/[massId]/+page.svelte` 141~144행)에서는 올바르게 `wakeLockStore.enable()`을 사용하고 있음:

```typescript
$effect(() => {
    if (browser && hasStartedStore.value) {
        wakeLockStore.enable();
        // ... visibilitychange 리스너 등
    }
});
```

### 테스트 기준

- [ ] Admin View 페이지 로드 시 콘솔에 TypeError 없음 확인
- [ ] "Wake Lock is active" 로그 출력 확인
- [ ] 미사 진행 중 화면 자동 꺼짐 방지 작동 확인

---

## WMG-6: MassInfoPage 하드코딩 mock 데이터 (MEDIUM)

### 현상

`MassInfoPage` 컴포넌트의 Props 인터페이스가 `onClose`만 받고 `massConfig`를 받지 않음. 내부에 하드코딩된 mock 데이터("명동대성당", "홍길동", "김영희")를 사용하여 **실제 미사 정보와 무관한 데이터가 표시됨**.

Admin View에서는 `massConfig`를 전달하지만(`384행`), 컴포넌트에서 무시함. 하객용 페이지(`396행`)에서는 `massConfig` 없이 호출하므로 항상 mock 데이터만 표시.

### 파일 위치

- **컴포넌트**: `src\lib\components\MassInfoPage.svelte` (4~30행)
- **Admin 호출부**: `src\routes\admin\mass\[massId]\view\+page.svelte` (384행)
- **하객 호출부**: `src\routes\mass\[massId]\+page.svelte` (396행)

### 현재 코드 (잘못됨)

**MassInfoPage.svelte** (4~30행):

```typescript
interface Props {
    onClose: () => void;
}

let { onClose }: Props = $props();

// Mock data - 추후 실제 데이터로 교체 예정
const massInfo = {
    churchName: '명동대성당',
    date: '2026년 2월 14일 (토)',
    time: '14:00',
    groomName: '홍길동',
    brideName: '김영희',
    celebrantName: '김바오로 신부',
    liturgicalSeason: 'lent',
    hymns: {
        entrance: { number: '152', title: '다함께 노래해', page: '87' },
        responsorial: '주보 참조',
        offertory: { number: '234', title: '주님께 드리는', page: '142' },
        communion: [
            { number: '312', title: '생명의 빵', page: '189' },
            { number: '415', title: '주님의 사랑', page: '245' }
        ],
        recessional: { number: '401', title: '기쁜 소식', page: '231' },
        wedding: null
    }
};
```

### 수정 방안

1. `Props` 인터페이스에 `massConfig: MassConfiguration` 추가
2. mock 데이터 삭제, `massConfig`에서 실제 데이터 매핑
3. 하객용 페이지에서도 `massConfig`를 전달하도록 수정

**MassInfoPage.svelte 수정안**:

```typescript
import type { MassConfiguration } from '$lib/types/mass';

interface Props {
    massConfig: MassConfiguration;
    onClose: () => void;
}

let { massConfig, onClose }: Props = $props();

const massInfo = $derived({
    churchName: massConfig.church_name,
    date: new Date(massConfig.date).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    }),
    time: massConfig.time,
    groomName: massConfig.groom_name,
    brideName: massConfig.bride_name,
    celebrantName: massConfig.celebrant_name || '',
    liturgicalSeason: massConfig.liturgical_season,
    hymns: massConfig.hymns
});
```

**하객용 페이지 수정** (`mass/[massId]/+page.svelte` 395~397행):

```svelte
<!-- 기존 -->
{#if showInfo}
    <MassInfoPage onClose={() => (showInfo = false)} />
{/if}

<!-- 수정 -->
{#if showInfo && massConfig}
    <MassInfoPage {massConfig} onClose={() => (showInfo = false)} />
{/if}
```

### 테스트 기준

- [ ] Admin View에서 미사 정보 페이지에 실제 DB 데이터 표시 확인
- [ ] 하객용 페이지에서 미사 정보 페이지에 실제 DB 데이터 표시 확인
- [ ] 성가 정보가 실제 설정값으로 표시되는지 확인
- [ ] 전례시기 안내 메시지가 올바르게 표시되는지 확인
- [ ] `massConfig`가 null인 경우 정보 버튼 미표시 확인 (guard 조건)

---

## WMG-7: 편집 버튼 미구현 (MEDIUM)

### 현상

Admin Mass Detail 페이지의 편집 버튼이 `alert('편집 기능은 곧 추가됩니다')`만 표시. 사용자가 미사 정보를 수정하려면 새로 생성해야 하는 상황.

### 파일 위치

- **파일**: `src\routes\admin\mass\[massId]\+page.svelte` (93~96행)

### 현재 코드

```typescript
function editMass() {
    // TODO: Implement edit mode
    alert('편집 기능은 곧 추가됩니다');
}
```

### 수정 방안 (2가지 선택)

**방안 A: 편집 페이지로 리다이렉트 (권장)**

새로운 편집 페이지 `admin/mass/[massId]/edit/+page.svelte`를 생성하거나, 기존 `admin/mass/new/+page.svelte`를 편집 겸용으로 재활용:

```typescript
function editMass() {
    goto(`/admin/mass/${massId}/edit`);
}
```

**방안 B: 기존 QuickEditModal 활용 (최소 수정)**

Admin View에 이미 QuickEditModal이 있으므로, Detail 페이지에서도 동일한 모달 사용:

```typescript
let showQuickEdit = $state(false);

function editMass() {
    showQuickEdit = true;
}
```

**방안 C: 버튼 비활성화 (임시 조치)**

```svelte
<button
    disabled
    class="... opacity-50 cursor-not-allowed"
    title="준비 중"
>
    <Edit class="w-4 h-4" />
    편집 (준비 중)
</button>
```

### 테스트 기준

- [ ] 편집 버튼 클릭 시 기대 동작 수행 확인 (alert 아님)
- [ ] 편집 기능으로 변경한 데이터가 DB에 저장되는지 확인
- [ ] 편집 후 페이지 새로고침 시 변경사항 유지 확인

---

## WMG-8: Theme 타입 불일치 - 'dark' 누락 (MEDIUM)

### 현상

`ThemeSelector`는 5개 테마(`'ivory-gold' | 'white-rose' | 'cathedral' | 'sage' | 'dark'`)를 제공하지만, `MassConfiguration` 타입의 `theme` 필드에는 `'dark'`가 포함되지 않음. 사용자가 Dark 테마를 선택하면 **TypeScript 타입 에러 발생** 및 DB 저장 시 불일치 가능.

### 파일 위치

- **ThemeSelector 타입**: `src\lib\components\ThemeSelector.svelte` (2행)
- **MassConfiguration 타입**: `src\lib\types\mass.ts` (46행)

### 현재 코드 (불일치)

**ThemeSelector.svelte** (2행):

```typescript
export type ThemeOption = 'ivory-gold' | 'white-rose' | 'cathedral' | 'sage' | 'dark';
```

**mass.ts** (46행):

```typescript
theme: 'ivory-gold' | 'white-rose' | 'cathedral' | 'sage';  // 'dark' 없음!
```

### 수정 코드

**mass.ts 46행 수정**:

```typescript
theme: 'ivory-gold' | 'white-rose' | 'cathedral' | 'sage' | 'dark';
```

### 추가 확인 사항

- DB 테이블의 `theme` 컬럼에 `'dark'` 값이 허용되는지 확인 필요
- Supabase DB에 CHECK 제약조건이 있다면 마이그레이션 필요:

```sql
-- 필요 시 마이그레이션
ALTER TABLE mass_configurations
DROP CONSTRAINT IF EXISTS mass_configurations_theme_check;

ALTER TABLE mass_configurations
ADD CONSTRAINT mass_configurations_theme_check
CHECK (theme IN ('ivory-gold', 'white-rose', 'cathedral', 'sage', 'dark'));
```

### 테스트 기준

- [ ] TypeScript 빌드 시 theme 관련 타입 에러 없음 확인
- [ ] Dark 테마 선택 후 DB 저장 정상 확인
- [ ] Dark 테마가 적용된 미사를 새로고침해도 유지되는지 확인
- [ ] `massConfig.theme as ThemeOption` 캐스팅 안전성 확인

---

## WMG-9: 관리자 이메일 하드코딩 (LOW)

### 현상

`isSuperAdmin()` 함수에 관리자 이메일이 소스코드에 직접 하드코딩되어 있음. 보안 위생 문제 및 관리자 변경 시 코드 수정+배포 필요.

### 파일 위치

- **파일**: `src\lib\services\analyticsService.ts` (125~129행)

### 현재 코드

```typescript
// Check if user email matches the fixed admin account
// TODO: Replace with actual admin email from environment variable
const ADMIN_EMAIL = 'orangepie2236@gmail.com'; // Replace with actual admin email

return user.email === ADMIN_EMAIL;
```

### 수정 코드

**1. 환경 변수 추가** (`.env` 및 Cloudflare Workers 환경 변수):

```
PUBLIC_ADMIN_EMAIL=orangepie2236@gmail.com
```

**2. analyticsService.ts 수정**:

```typescript
import { env } from '$env/dynamic/public';

// ...

export async function isSuperAdmin(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return false;
        }

        const adminEmail = env.PUBLIC_ADMIN_EMAIL;
        if (!adminEmail) {
            console.warn('[Analytics] ADMIN_EMAIL not configured');
            return false;
        }

        return user.email === adminEmail;
    } catch (error) {
        console.error('[Analytics] Failed to check admin status:', error);
        return false;
    }
}
```

### 테스트 기준

- [ ] 환경 변수 설정 후 관리자 로그인 시 `isSuperAdmin()` = `true` 확인
- [ ] 환경 변수 미설정 시 graceful fallback (false 반환) 확인
- [ ] 일반 사용자 로그인 시 `isSuperAdmin()` = `false` 확인
- [ ] Cloudflare Workers 배포 환경에서 환경 변수 정상 작동 확인

---

## WMG-10: console.log 정리 (LOW)

### 현상

프로덕션 코드에 `console.log` 18건 이상 존재. 사용자에게 불필요한 디버그 정보 노출 및 성능 미세 영향.

### 파일별 현황

| 파일 | 위치 | 내용 | 분류 |
|------|------|------|------|
| `routes\admin\mass\[massId]\view\+page.svelte` | 125행 | `[Admin] Broadcasting step:` | 디버그 |
| `routes\admin\mass\[massId]\view\+page.svelte` | 215행 | `[Admin View] Sync enabled changed to:` | 디버그 |
| `routes\admin\mass\[massId]\+page.svelte` | 123행 | `[Admin] Sync enabled changed to:` | 디버그 |
| `routes\auth\callback\+page.svelte` | 28행 | `[Auth Callback] Using Supabase tokens (Kakao)` | 디버그 |
| `routes\auth\callback\+page.svelte` | 38행 | `[Auth Callback] Using signInWithIdToken (Google)` | 디버그 |
| `lib\utils\serviceWorker.ts` | 7, 13, 23, 44, 67, 82행 | `[SW] ...` | 디버그 |
| `lib\stores\wakeLock.svelte.ts` | 32, 44행 | Wake Lock 상태 | 디버그 |
| `lib\stores\realtimeSync.svelte.ts` | 48, 51, 54, 76, 107행 | `[Realtime] ...` | 디버그 |

### 수정 방안

**방안 A: 디버그 플래그 도입 (권장)**

```typescript
// src/lib/utils/debug.ts
import { dev } from '$app/environment';

export function debugLog(tag: string, ...args: unknown[]) {
    if (dev) {
        console.log(`[${tag}]`, ...args);
    }
}
```

사용:

```typescript
import { debugLog } from '$lib/utils/debug';

// 기존: console.log('[Admin] Broadcasting step:', stepId);
// 수정:
debugLog('Admin', 'Broadcasting step:', stepId);
```

**방안 B: 단순 삭제**

프로덕션에 불필요한 `console.log`를 모두 삭제. `console.error`와 `console.warn`은 유지.

### 테스트 기준

- [ ] 프로덕션 빌드(`dev=false`)에서 콘솔에 디버그 로그 미출력 확인
- [ ] 개발 환경(`dev=true`)에서 디버그 로그 정상 출력 확인
- [ ] `console.error`, `console.warn`은 유지되어 에러 추적 가능 확인

---

## 수정 우선순위 및 작업 순서

### Phase 1: CRITICAL (즉시 수정)

| 순서 | ID | 작업 | 예상 소요 |
|------|----|------|----------|
| 1 | WMG-5 | `wakeLockStore.request()` -> `enable()` | 1분 |
| 2 | WMG-1 | Header prop 이름 수정 | 3분 |
| 3 | WMG-2 | StepCard prop 이름 수정 + totalSteps 추가 | 3분 |
| 4 | WMG-3 | ThemeSelector prop 이름 수정 | 1분 |
| 5 | WMG-4 | TableOfContents prop 이름 수정 | 3분 |

### Phase 2: MEDIUM (조기 수정)

| 순서 | ID | 작업 | 예상 소요 |
|------|----|------|----------|
| 6 | WMG-8 | mass.ts에 'dark' 테마 추가 | 5분 (DB 확인 포함) |
| 7 | WMG-6 | MassInfoPage에 massConfig 연동 | 15분 |
| 8 | WMG-7 | 편집 버튼 구현 또는 비활성화 | 5~30분 (방안에 따라) |

### Phase 3: LOW (다음 릴리즈)

| 순서 | ID | 작업 | 예상 소요 |
|------|----|------|----------|
| 9 | WMG-9 | 관리자 이메일 환경 변수 이전 | 10분 |
| 10 | WMG-10 | console.log 정리 | 15분 |

---

## 비고

- **WMG-1~4 공통 원인**: Admin View 페이지가 하객용 페이지(`mass/[massId]/+page.svelte`)를 참고하여 만들어졌으나, 컴포넌트 인터페이스를 확인하지 않고 임의의 prop 이름을 사용한 것으로 추정. 하객용 페이지에서는 모든 prop이 올바르게 전달되고 있으므로, 이를 참조하여 수정하면 됨.
- **Svelte 5 `$props()` 특성**: 잘못된 prop 이름이 전달되면 무시되고 에러 없이 `undefined`가 됨. TypeScript strict 모드에서도 컴포넌트 호출 시 타입 체크가 완전하지 않을 수 있으므로, 빌드 타임에 감지되지 않았을 가능성 있음.
- **테스트 방법**: `npm run build` 후 `npm run preview`로 프로덕션 빌드 확인, 또는 `npm run dev`로 개발 서버에서 직접 Admin View 기능 테스트.
