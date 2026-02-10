# wedding-mass-guide 결함 수정 계획서

> 완료일: 2026-02-10
> 아카이브됨
> 상태: 완료

## 개요

| 항목 | 내용 |
|------|------|
| 프로젝트 | wedding-mass-guide |
| 감사일 | 2026-02-04 |
| 감사 범위 | Admin View 페이지, 컴포넌트 인터페이스 정합성, 타입 안전성 |
| 1차 결함 총계 | **CRITICAL: 5건**, **MEDIUM: 3건**, **LOW: 2건** (2026-02-04 감사, 전체 완료) |
| 2차 결함 총계 | **HIGH: 1건**, **MEDIUM: 3건**, **LOW: 4건** (2026-02-09 재감사, 2026-02-10 전체 완료) |

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

### Phase 1: CRITICAL (즉시 수정) - ✅ 완료 (2026-02-04)

| 순서 | ID | 작업 | 상태 |
|------|----|------|------|
| 1 | WMG-5 | `wakeLockStore.request()` -> `enable()` | ✅ 완료 |
| 2 | WMG-1 | Header prop 이름 수정 | ✅ 완료 |
| 3 | WMG-2 | StepCard prop 이름 수정 + totalSteps 추가 | ✅ 완료 |
| 4 | WMG-3 | ThemeSelector prop 이름 수정 | ✅ 완료 |
| 5 | WMG-4 | TableOfContents prop 이름 수정 | ✅ 완료 |

### Phase 2: MEDIUM (조기 수정) - ✅ 완료 (2026-02-05)

| 순서 | ID | 작업 | 상태 |
|------|----|------|------|
| 6 | WMG-8 | mass.ts에 'dark' 테마 추가 | ✅ 완료 |
| 7 | WMG-6 | MassInfoPage에 massConfig 연동 | ✅ 완료 |
| 8 | WMG-7 | 편집 버튼 구현 (QuickEditModal 활용) | ✅ 완료 |

### Phase 3: LOW (다음 릴리즈) - ✅ 완료 (2026-02-05)

| 순서 | ID | 작업 | 상태 |
|------|----|------|------|
| 9 | WMG-9 | 관리자 이메일 환경 변수 이전 | ✅ 완료 |
| 10 | WMG-10 | console.log 정리 (debugLog 유틸리티) | ✅ 완료 |

---

## 비고

- **WMG-1~4 공통 원인**: Admin View 페이지가 하객용 페이지(`mass/[massId]/+page.svelte`)를 참고하여 만들어졌으나, 컴포넌트 인터페이스를 확인하지 않고 임의의 prop 이름을 사용한 것으로 추정. 하객용 페이지에서는 모든 prop이 올바르게 전달되고 있으므로, 이를 참조하여 수정하면 됨.
- **Svelte 5 `$props()` 특성**: 잘못된 prop 이름이 전달되면 무시되고 에러 없이 `undefined`가 됨. TypeScript strict 모드에서도 컴포넌트 호출 시 타입 체크가 완전하지 않을 수 있으므로, 빌드 타임에 감지되지 않았을 가능성 있음.
- **테스트 방법**: `npm run build` 후 `npm run preview`로 프로덕션 빌드 확인, 또는 `npm run dev`로 개발 서버에서 직접 Admin View 기능 테스트.

---

## 추가 발견 결함 (2026-02-09 코드베이스 재감사)

> 감사일: 2026-02-09
> 감사 범위: 전체 코드베이스 (서비스, 스토어, 컴포넌트, 타입, 빌드 설정)
> 추가 결함: **HIGH: 1건**, **MEDIUM: 3건**, **LOW: 4건**

---

## WMG-11: massService에서 announcements 필드 누락 (HIGH)

### 현상

`MassConfiguration` 타입에 `announcements: Announcement[]` 필드가 정의되어 있고, 하객용 페이지에서 `AnnouncementBanner`로 표시하고 있지만, `massService.ts`의 CRUD 함수들이 이 필드를 **완전히 무시**함. DB에서 읽기/쓰기/매핑 어디에서도 `announcements`를 처리하지 않아 **공지사항 데이터가 항상 누락됨**.

### 파일 위치

- **서비스**: `src\lib\services\massService.ts` (25~41행 createMass, 118~133행 updateMass, 179~200행 rowToMassConfig)
- **타입**: `src\lib\types\mass.ts` (`announcements: Announcement[]`)
- **DB 타입**: `src\lib\types\database.ts` (Row/Insert/Update에 `announcements` 컬럼 미정의)

### 문제 분석

| 함수 | 문제 |
|------|------|
| `createMass()` | `insertData`에 `announcements` 미포함 -- 생성 시 공지사항 저장 안됨 |
| `updateMass()` | `data.announcements` 체크 없음 -- 공지사항 업데이트 불가 |
| `rowToMassConfig()` | `row.announcements` 매핑 없음 -- DB에서 읽어도 누락 |

### 수정 방안

**1단계: DB 타입 확인 (선행 조건)**

먼저 Supabase DB에 `announcements` 컬럼이 존재하는지 확인 필요:

```powershell
# Supabase CLI로 최신 DB 타입 생성
npx supabase gen types typescript --project-id qxiuqztinabmdhclxsuz > src\lib\types\database.ts
```

**2단계-A: DB에 announcements 컬럼이 있는 경우**

`database.ts` Row/Insert/Update에 `announcements` 추가 후:

```typescript
// massService.ts - createMass() insertData에 추가
announcements: data.announcements ? JSON.stringify(data.announcements) : '[]',

// massService.ts - updateMass() 조건 추가
if (data.announcements !== undefined) updateData.announcements = data.announcements;

// massService.ts - rowToMassConfig() 매핑 추가
announcements: Array.isArray(row.announcements)
    ? (row.announcements as unknown as Announcement[])
    : JSON.parse((row.announcements as string) || '[]'),
```

**2단계-B: DB에 announcements 컬럼이 없는 경우**

`hymns` 컬럼처럼 JSON 필드로 추가하는 마이그레이션 필요:

```sql
ALTER TABLE mass_configurations
ADD COLUMN announcements jsonb DEFAULT '[]'::jsonb;
```

### 테스트 기준

- [ ] 미사 생성 시 공지사항이 DB에 저장되는지 확인
- [ ] 미사 조회 시 `massConfig.announcements`에 데이터가 있는지 확인
- [ ] 하객용 페이지에서 `AnnouncementBanner`에 실제 공지사항 표시 확인
- [ ] 공지사항 업데이트 후 변경사항 유지 확인

---

## WMG-12: IntroScreen 중복 onStart/onstart Prop (MEDIUM)

### 현상

`IntroScreen` 컴포넌트에 동일한 기능의 prop이 두 가지 이름으로 존재: `onStart`(camelCase)와 `onstart`(lowercase). 우선순위가 `onstart || onStart`로 되어 있어 lowercase가 우선됨. Svelte 5에서는 prop 이름이 대소문자 구분되므로 혼란을 야기함.

### 파일 위치

- **컴포넌트**: `src\lib\components\IntroScreen.svelte` (15~17행, 23행, 26행)

### 현재 코드 (혼란)

```typescript
interface Props {
    onStart?: () => void;
    onstart?: () => void;  // lowercase variant for compatibility
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
    massInfo?: MassInfo;
}

let { onStart, onstart, viewMode, onViewModeChange, massInfo }: Props = $props();

const startHandler = onstart || onStart || (() => {});
```

### 수정 코드

```typescript
interface Props {
    onStart?: () => void;
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
    massInfo?: MassInfo;
}

let { onStart, viewMode, onViewModeChange, massInfo }: Props = $props();

const startHandler = onStart || (() => {});
```

### 호출부 확인

| 호출 위치 | 전달 prop | 상태 |
|-----------|-----------|------|
| `src\routes\+page.svelte` | `onStart={handleStart}` | OK (camelCase 사용) |
| `src\routes\mass\[massId]\+page.svelte` | `onStart={handleStart}` | OK (camelCase 사용) |

모든 호출부가 `onStart`(camelCase)를 사용하므로 `onstart` 삭제 시 영향 없음.

### 테스트 기준

- [ ] 하객용 페이지에서 "미사 시작하기" 버튼 정상 동작 확인
- [ ] 루트 페이지에서 "미사 시작하기" 버튼 정상 동작 확인
- [ ] TypeScript 빌드 에러 없음 확인

---

## WMG-13: SyncStatusBanner 이모지 혼동 (MEDIUM)

### 현상

`SyncStatusBanner`에서 동기화 연결 성공 상태(`connected=true`)일 때 빨간 원 이모지(`🔴`)를 사용함. 배경색은 녹색(`bg-green-100`)이고 아이콘도 녹색 `animate-pulse`인데, 텍스트에 빨간 원이 있어 시각적 혼동 발생. 사용자가 에러 상태로 오인할 수 있음.

### 파일 위치

- **컴포넌트**: `src\lib\components\SyncStatusBanner.svelte` (21행)

### 현재 코드 (혼동)

```svelte
<span class="text-sm text-green-900 font-medium">
    🔴 관리자와 동기화 중
</span>
```

### 수정 코드

```svelte
<span class="text-sm text-green-900 font-medium">
    🟢 관리자와 동기화 중
</span>
```

### 테스트 기준

- [ ] 동기화 연결 성공 시 녹색 원 이모지 표시 확인
- [ ] 에러 상태와 시각적으로 명확히 구분되는지 확인

---

## WMG-14: database.ts 수동 타입 - announcements 컬럼 누락 (MEDIUM)

### 현상

`database.ts`가 수동으로 작성된 간소화 버전으로, Supabase CLI로 자동 생성되지 않음. `mass_configurations` 테이블의 Row/Insert/Update 타입에 `announcements` 컬럼이 누락되어 있어 `massService.ts`에서 해당 필드에 접근할 때 타입 에러 발생.

### 파일 위치

- **파일**: `src\lib\types\database.ts`

### 현재 코드

파일 상단 주석에 이미 자동 생성 명령어가 안내되어 있음:

```typescript
// This is a simplified version - you can generate full types using Supabase CLI:
// npx supabase gen types typescript --project-id qxiuqztinabmdhclxsuz > src/lib/types/database.ts
```

### 수정 방안

Supabase CLI를 사용하여 최신 DB 스키마를 반영한 타입을 자동 생성:

```powershell
npx supabase gen types typescript --project-id qxiuqztinabmdhclxsuz > src\lib\types\database.ts
```

또는 수동으로 `announcements` 컬럼 추가:

```typescript
// Row에 추가
announcements: Json

// Insert에 추가
announcements?: Json

// Update에 추가
announcements?: Json
```

### 테스트 기준

- [ ] TypeScript 빌드 시 `row.announcements` 접근에 타입 에러 없음
- [ ] `MassConfigInsert`에 `announcements` 필드가 허용되는지 확인

---

## WMG-15: Admin View에서 SyncControl import 미사용 (LOW)

### 현상

Admin View 페이지(`view/+page.svelte`)에서 `SyncControl` 컴포넌트를 import하지만 템플릿에서 사용하지 않음. 동기화 토글 UI를 인라인으로 직접 구현하고 있어 dead import 상태.

### 파일 위치

- **파일**: `src\routes\admin\mass\[massId]\view\+page.svelte` (20행)

### 현재 코드

```typescript
import SyncControl from '$lib/components/SyncControl.svelte';  // 미사용
```

### 수정 방안

**방안 A: import 제거 (최소 수정)**

```typescript
// 20행의 import 삭제
```

**방안 B: 인라인 UI를 SyncControl 컴포넌트로 교체 (코드 통일)**

Admin Detail 페이지(`[massId]/+page.svelte` 237~242행)에서는 `SyncControl`을 사용하고 있으므로, Admin View에서도 동일하게 사용하면 코드 일관성이 향상됨.

### 테스트 기준

- [ ] import 제거 후 빌드 에러 없음 확인
- [ ] 또는 SyncControl로 교체 시 동기화 토글 기능 정상 동작 확인

---

## WMG-16: Admin View wakeLock cleanup 미구현 (LOW)

### 현상

Admin View에서 `wakeLockStore.enable()`을 `$effect`에서 호출하지만, 페이지 이탈 시 `wakeLockStore.disable()`을 호출하지 않음. 하객용 페이지에서는 `visibilitychange` 이벤트 리스너와 함께 cleanup 로직이 구현되어 있음.

### 파일 위치

- **Admin View**: `src\routes\admin\mass\[massId]\view\+page.svelte` (108~112행) - cleanup 없음
- **하객용 참고**: `src\routes\mass\[massId]\+page.svelte` (141~157행) - cleanup 있음

### 현재 코드 (Admin View)

```typescript
$effect(() => {
    if (browser && hasStartedStore.value) {
        wakeLockStore.enable();
    }
});
```

### 수정 코드

```typescript
$effect(() => {
    if (browser && hasStartedStore.value) {
        wakeLockStore.enable();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                wakeLockStore.reacquire();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            wakeLockStore.disable();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }
});
```

### 테스트 기준

- [ ] Admin View에서 다른 탭으로 전환 후 복귀 시 wake lock 재획득 확인
- [ ] Admin View 페이지 이탈 시 wake lock 해제 확인

---

## WMG-17: massService.ts rowToMassConfig `as any` 캐스팅 (LOW)

### 현상

`rowToMassConfig` 함수에서 `hymns`, `liturgical_season`, `theme`, `view_mode` 필드에 `as any` 타입 캐스팅을 사용. 타입 안전성을 우회하여 런타임 타입 불일치를 감지하지 못함.

### 파일 위치

- **파일**: `src\lib\services\massService.ts` (189~194행)

### 현재 코드

```typescript
hymns: (row.hymns as any) || {},
liturgical_season: (row.liturgical_season as any) || 'ordinary',
theme: (row.theme as any) || 'ivory-gold',
view_mode: (row.view_mode as any) || 'detailed',
```

### 수정 코드

```typescript
hymns: (row.hymns as unknown as MassConfiguration['hymns']) || {},
liturgical_season: (row.liturgical_season as MassConfiguration['liturgical_season']) || 'ordinary',
theme: (row.theme as MassConfiguration['theme']) || 'ivory-gold',
view_mode: (row.view_mode as MassConfiguration['view_mode']) || 'detailed',
```

### 테스트 기준

- [ ] TypeScript 빌드 에러 없음 확인
- [ ] 미사 조회 시 각 필드의 타입이 올바른지 확인

---

## WMG-18: .env.example 파일 미생성 (LOW)

### 현상

`.gitignore`에서 `!.env.example`로 `.env.example` 파일을 추적 허용하고 있지만, 실제 파일이 존재하지 않음. 새 개발자나 fresh clone 시 어떤 환경 변수가 필요한지 참조할 수 없음.

### 파일 위치

- **필요 위치**: 프로젝트 루트 `.env.example`

### 수정 코드

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Auth Worker
VITE_AUTH_WORKER_URL=https://your-auth-worker.example.com

# App ID
VITE_APP_ID=wedding-mass

# Admin Configuration
PUBLIC_ADMIN_EMAIL=admin@example.com
```

### 테스트 기준

- [ ] `.env.example` 파일이 git에 추적되는지 확인
- [ ] 모든 필수 환경 변수가 포함되어 있는지 확인

---

## 추가 결함 수정 우선순위

### Phase 4: 추가 결함 (2026-02-09 발견) - ✅ 완료 (2026-02-10)

| 순서 | ID | 심각도 | 작업 | 상태 |
|------|----|--------|------|------|
| 11 | WMG-11 | HIGH | massService announcements 필드 누락 수정 | ✅ 완료 |
| 12 | WMG-14 | MEDIUM | database.ts 타입 최신화 (WMG-11 선행 조건) | ✅ 완료 |
| 13 | WMG-12 | MEDIUM | IntroScreen 중복 onstart prop 제거 | ✅ 완료 |
| 14 | WMG-13 | MEDIUM | SyncStatusBanner 이모지 수정 (🔴→🟢) | ✅ 완료 |
| 15 | WMG-15 | LOW | Admin View SyncControl 미사용 import 정리 | ✅ 완료 |
| 16 | WMG-16 | LOW | Admin View wakeLock cleanup 추가 | ✅ 완료 |
| 17 | WMG-17 | LOW | rowToMassConfig as any 캐스팅 개선 | ✅ 완료 |
| 18 | WMG-18 | LOW | .env.example 파일 생성 | ✅ 완료 |

### 추가 관찰 사항 (결함은 아니나 참고)

| 항목 | 설명 | 분류 |
|------|------|------|
| 테스트 프레임워크 미설정 | `vitest`/`playwright` 미설치, `test` 스크립트 없음. 자동화 회귀 테스트 불가 | 개선 권고 |
| `@sveltejs/adapter-auto` 미사용 | devDependencies에 존재하나 `adapter-cloudflare` 사용 중. 패키지 정리 권고 | 개선 권고 |
| `Section` 타입 미export | `massSteps.ts`에서 `sections` 배열을 export하지만 타입은 미export. `TableOfContents`에서 중복 정의 | 개선 권고 |
| `Admin Detail` toggleSync 변수 섀도잉 | `const { error }` 로컬 변수가 컴포넌트 레벨 `error` state를 섀도잉 (128행). 현재 동작에는 영향 없음 | 코드 품질 |
| `Admin View` $effect 초기 로드 시 DB 업데이트 | `currentStepIdStore.value` 변경 감지 $effect가 초기 로드에도 실행되어 불필요한 DB write 발생 (115~130행) | 성능 |
