# 단계 이동 제스처 힌트

> 작성일: 2026-02-12
> 완료일: 2026-02-13
> 아카이브됨
> 진행률: 3/3 (100%)

---

## 개요

스와이프로 단계 이동이 가능하지만 안내가 없어 신규 사용자가 모르는 상태입니다.
첫 방문 시 좌우 스와이프 튜토리얼 오버레이를 표시합니다.

### 예상 UX

1. 첫 방문 감지 (localStorage)
2. 반투명 오버레이 + 손가락 스와이프 애니메이션
3. "좌우로 스와이프하여 이동하세요" 텍스트
4. 탭하면 닫히고, 다시 표시 안 함

## 기술적 고려사항

- `localStorageStore` 유틸 활용 (기존 패턴: `src/lib/stores/localStorageStore.svelte.ts`)
- CSS 애니메이션으로 손가락 아이콘 좌우 이동
- 대상 페이지: `src/routes/mass/[massId]/+page.svelte` (메인 미사 진행 페이지)
- `hasStartedStore.value`가 true가 된 직후 (미사 시작 후 첫 카드) 에 표시
- 별도 컴포넌트 `SwipeHint.svelte`로 분리

---

## TODO

### Phase 1: SwipeHint 컴포넌트 생성

1. [x] **`src/lib/components/SwipeHint.svelte` 신규 생성**
   - props: `show: boolean`, `onDismiss: () => void`
   - `{#if show}` 로 조건부 렌더링
   - 구조:
     - fixed 오버레이 (`class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"`)
     - 중앙 박스: 손가락 이모지(👆) + 좌우 화살표 + "좌우로 스와이프하여 단계를 이동하세요" 텍스트
     - CSS `@keyframes swipe-motion`: `translateX(-30px)` → `translateX(30px)` 반복, 2초 주기
     - 전체 영역 클릭/탭 시 `onDismiss()` 호출

### Phase 2: 페이지에 통합

2. [x] **`src/routes/mass/[massId]/+page.svelte` 수정**
   - import 추가: `import SwipeHint from '$lib/components/SwipeHint.svelte';`
   - 75행 부근, 기존 `localStorageStore` 선언 아래에 추가:
     ```
     const swipeHintShownStore = localStorageStore(`mass-${massId}-swipe-hint-shown`, false);
     ```
   - `showSwipeHint` 파생 상태 추가:
     ```
     const showSwipeHint = $derived(hasStartedStore.value && !swipeHintShownStore.value);
     ```
   - `dismissSwipeHint` 함수 추가:
     ```
     function dismissSwipeHint() { swipeHintShownStore.value = true; }
     ```
   - 373행 `</main>` 직후, `{#if showToc}` 직전에 삽입:
     ```
     <SwipeHint show={showSwipeHint} onDismiss={dismissSwipeHint} />
     ```

### Phase 3: 빌드 검증

3. [x] **`npm run build` 실행** — 빌드 오류 없음 확인

---

*상태: 완료 | 진행률: 3/3 (100%)*
