---
name: recurring-patterns
description: "코드베이스 반복 패턴 가이드 (구현 시 참조용). 다른 스킬에서 @recurring-patterns로 참조. 직접 호출 불필요."
---

# 반복 패턴 가이드

> 코드베이스에서 확립된 패턴. 구현 시 이 패턴을 따를 것.
> 프론트엔드 패턴(1~4)은 전체 프로젝트 공통, 백엔드 패턴(5~7)은 monitor-page 전용.

---

## 프론트엔드 패턴 (전체 프로젝트)

### 0. Svelte 5 문법 강제

Svelte 5 프로젝트에서 Svelte 4 문법 사용 금지. 코드 생성/수정 시 반드시 확인.

| ❌ Svelte 4 (금지) | ✅ Svelte 5 (필수) |
|---|---|
| `on:click={handler}` | `onclick={handler}` |
| `on:change={handler}` | `onchange={handler}` |
| `on:input={handler}` | `oninput={handler}` |
| `on:submit\|preventDefault={handler}` | `onsubmit={(e) => { e.preventDefault(); handler(e); }}` |
| `on:keydown\|stopPropagation` | `onkeydown={(e) => { e.stopPropagation(); ... }}` |
| `$: derived = expr` | `const derived = $derived(expr)` |
| `$: { sideEffect() }` | `$effect(() => { sideEffect() })` |
| `export let prop` | `let { prop } = $props()` |
| `<slot />` | `{@render children()}` |
| `<slot name="header" />` | `{@render header()}` (snippet prop) |
| `createEventDispatcher()` | 콜백 prop (`onchange`, `onselect` 등) |

**규칙**:
- `on:` 디렉티브 전면 금지 — 네이티브 이벤트 속성만 사용
- 이벤트 수식어(`|preventDefault`, `|stopPropagation`)는 핸들러 내부에서 직접 호출
- `$$props`, `$$restProps` → `$props()`의 스프레드 패턴 사용

### 1. 선택/벌크 액션 — createSelection()

체크박스로 항목을 선택하고 벌크 액션을 수행할 때.

```ts
// ❌ Array 기반 — O(n) 탐색, 탭마다 ~50줄 반복
let selected = $state<number[]>([]);
function toggle(id: number) {
  if (selected.includes(id)) selected = selected.filter(x => x !== id);
  else selected = [...selected, id];
}

// ✅ Set 기반 유틸 — O(1), 3줄
import { createSelection } from '$lib/utils/selection.svelte';
const selection = createSelection();
```

**API**: `toggle(id)`, `has(id)`, `count`, `toArray()`, `selectAll(ids)`, `isAllSelected(ids)`, `clear()`

**템플릿**:
```svelte
<!-- 전체 선택 -->
<input type="checkbox"
  checked={selection.isAllSelected(items.map(i => i.id))}
  onchange={() => selection.selectAll(items.map(i => i.id))} />

<!-- 개별 선택 (이벤트 버블링 차단 필수) -->
<input type="checkbox"
  checked={selection.has(item.id)}
  onclick={(e) => { e.stopPropagation(); selection.toggle(item.id); }} />

<!-- 벌크 액션 바 -->
{#if selection.count > 0}
  <span>{selection.count}개 선택</span>
  <button onclick={() => bulkAction(selection.toArray())}>일괄 처리</button>
{/if}
```

### 2. 알림 — toast

> 상세 가이드: [user-feedback.md](user-feedback.md)

```ts
// ❌ 금지
alert('실패');
confirm('삭제?');
let toastMessage = $state<string | null>(null);   // 자체 구현 금지

// ✅ 필수
import { toast } from '$lib/stores/toast';
toast.success(`${count}개 항목 삭제 완료`);       // 성공, 3초
toast.error(`삭제 실패: ${err.message}`);         // 에러(catch), 5초
toast.warning('입력값을 확인하세요.');             // 입력 검증, 4초
toast.info('클립보드에 복사했습니다.');            // 정보, 3초
```

**규칙**:
- `alert()`, `window.alert()`, `window.confirm()` 사용 금지
- `confirm()` 대신 `ConfirmDialog` 컴포넌트 사용
- 자체 toast 구현(`toastMessage` state + `showToast()`) 금지 — 글로벌 store 사용
- 액션 성공 시에도 반드시 `toast.success()` 호출 (사용자 피드백)
- 성공 → `success`, catch 블록 에러 → `error`, 입력 검증 실패 → `warning`

### 3. 로컬 상태 업데이트

POST/PUT/DELETE 성공 후 전체 목록을 재요청하지 않고, 로컬 상태를 직접 갱신.

```ts
// ❌ 전체 재요청 — 네트워크 낭비, 깜빡임
await fetchWithTimeout(`/api/items/${id}`, { method: 'DELETE' });
await loadItems();

// ✅ 로컬 상태 직접 갱신
const res = await fetchWithTimeout(`/api/items/${id}`, { method: 'DELETE' });
if (!res.ok) { toast.error('삭제 실패'); return; }
items = items.filter(item => item.id !== id);
totalCount = Math.max(0, totalCount - 1);
selection.clear();
toast.success('삭제 완료');
```

**패턴별**:
```ts
// 단일 삭제
items = items.filter(i => i.id !== id);
// 벌크 삭제
items = items.filter(i => !deletedIds.has(i.id));
totalCount = Math.max(0, totalCount - deletedIds.size);
// 상태 변경
items = items.map(i => ids.includes(i.id) ? { ...i, status: 'approved' } : i);
```

**전체 재요청 허용**: 서버 정렬/필터가 달라지는 경우, 관계 데이터가 복잡한 경우, 페이지네이션 경계를 넘는 삭제.

### 5. 401 처리 — reload 금지

인증 만료 시 페이지 새로고침은 폼 데이터를 유실시킨다.

```ts
// ❌ 절대 금지
if (response.status === 401) window.location.reload();

// ✅ 토스트 + 쿨다운 가드
let isHandling401 = false;
if (response.status === 401 && !isHandling401) {
  isHandling401 = true;
  setTimeout(() => { isHandling401 = false; }, 3000);  // 3초 쿨다운
  toast.warning('인증이 만료되었습니다.');
  onUnauthorized?.();  // 인증 스토어 리셋만
}
```

---

## 백엔드 패턴 (monitor-page 전용)

> 상세 내용: [backend-patterns.md](backend-patterns.md)

### 6. 비동기 API — 202 + 폴링

5초+ 작업은 `POST → 202 + search_id` 즉시 반환 후, 클라이언트가 `GET /{id}` 폴링으로 결과 수신.

### 7. Session 0 제약 — Redis 큐 위임

NSSM 서비스(Session 0)에서 subprocess/GUI/GPU 직접 호출 금지. Redis 큐로 유저 세션 워커에 위임 + fallback.

### 8. 워커 에러 격리 — _safe_execute

워커 작업별 `_safe_execute` 래핑 필수. 개별 실패가 전체 워커를 중단시키면 안 됨. 연속 10회 초과 시 `WorkerCriticalError`.

---

## 빠른 참조 테이블

| # | 패턴 | 위치 | 핵심 규칙 |
|---|------|------|----------|
| 0 | Svelte 5 문법 강제 | 프론트 | `on:click` 금지, `onclick` 필수. Svelte 4 문법 전면 금지 |
| 1 | `createSelection()` | 프론트 | 체크박스 목록 = Set 기반 유틸 필수 |
| 2 | `toast` | 프론트 | `alert()` / 자체 구현 금지, toast만 사용 → [user-feedback.md](user-feedback.md) |
| 3 | 로컬 상태 업데이트 | 프론트 | 액션 후 전체 reload 대신 로컬 갱신 |
| 4 | 페이지네이션 유틸 | 프론트 | offset/page 상태 직접 선언 금지 → [pagination.md](pagination.md) |
| 5 | 401 콜백 | 프론트 | `location.reload()` 금지, 쿨다운 가드 |
| 6 | 202 + 폴링 | 백엔드 | 5초+ 작업은 비동기 큐 패턴 |
| 7 | Redis 큐 위임 | 백엔드 | Session 0에서 subprocess 금지 |
| 8 | `_safe_execute` | 백엔드 | 워커 작업별 예외 격리 필수 |
