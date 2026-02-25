# 패턴 #4 — 페이지네이션 유틸리티

목록에 페이지네이션을 추가할 때 `offset`, `hasMore`, `currentPage`, `totalPages` 등을 직접 선언하지 않는다.

```ts
// ❌ 직접 선언 금지
const PAGE_SIZE = 24;
let currentOffset = $state(0);
let hasMore = $state(false);
let currentPage = $state(1);
let totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));

// ✅ 유틸리티 사용
import { createOffsetPagination, createPagePagination } from '$lib/utils/pagination.svelte';

const pager = createOffsetPagination(24);   // 더 보기 / 무한스크롤
const pager = createPagePagination(20);     // 페이지 번호 네비게이션
```

## Offset 기반 API (더 보기 / 무한스크롤)

`pager.offset`, `pager.hasMore`, `pager.total`, `pager.reset()`, `pager.advance(loaded, total)`, `pager.toParams()`

```ts
async function loadItems(reset = false) {
    if (reset) { pager.reset(); items = []; }
    const params = new URLSearchParams(pager.toParams());
    const data = await fetchWithTimeout(`/api/items?${params}`).then(r => r.json());
    items = reset ? data.items : [...items, ...data.items];
    pager.advance(data.items.length, data.total);
}

function handleFilter() { pager.reset(); loadItems(); }
```

```svelte
{#if pager.hasMore}
  <button onclick={() => loadItems(false)}>더 보기</button>
{/if}
```

## Page 번호 기반 API

`pager.page`, `pager.pageSize`, `pager.total`, `pager.totalPages`, `pager.reset()`, `pager.goTo(n)`, `pager.prev()`, `pager.next()`, `pager.toParams()`

```ts
async function fetchItems() {
    const params = new URLSearchParams(pager.toParams());  // { skip, limit }
    const data = await fetchWithTimeout(`/api/items?${params}`).then(r => r.json());
    items = data.items;
    pager.total = data.total;
}

function handleFilter() { pager.reset(); fetchItems(); }
```

```svelte
<button onclick={() => { pager.prev(); fetchItems(); }} disabled={pager.page <= 1}>이전</button>
<span>{pager.page} / {pager.totalPages}</span>
<button onclick={() => { pager.next(); fetchItems(); }} disabled={pager.page >= pager.totalPages}>다음</button>
```

## 하나의 탭에 여러 목록

인스턴스를 각각 생성한다.

```ts
const writingPager = createPagePagination(20);
const elementPager = createPagePagination(50);
const keywordPager = createOffsetPagination(100);
```

> 상세 가이드: monitor-page `docs/dev-guide/pagination.md`
