# 사용자 피드백 가이드 (Toast)

> 작성일: 2026-02-25
> 유틸리티 위치: `frontend/src/lib/stores/toast.ts`

모든 사용자 피드백은 **글로벌 toast store**를 통해 표시한다.
`alert()` / `confirm()` / 자체 toast 구현은 전면 금지.

---

## 빠른 참조

```typescript
import { toast } from '$lib/stores/toast';

toast.success('저장 완료');           // 초록, 3초
toast.error('저장 실패');             // 빨강, 5초
toast.warning('입력값을 확인하세요'); // 주황, 4초
toast.info('클립보드에 복사됨');      // 파랑, 3초
```

---

## 적용 기준

| 상황 | 메서드 | 예시 |
|------|--------|------|
| CRUD 성공 | `toast.success()` | `'카테고리 삭제 완료'`, `'설정 저장됨'` |
| API 에러 / 예외 | `toast.error()` | `` `삭제 실패: ${err.message}` `` |
| 입력 검증 실패 | `toast.warning()` | `'폴더를 선택해주세요'` |
| 상태 안내 | `toast.warning()` | `'이미 카테고리가 설정되어 있습니다'` |
| 정보성 알림 | `toast.info()` | `'클립보드에 복사됨'` |

### 성공/에러 판단 기준

```typescript
// ✅ 성공 → toast.success
toast.success(`${count}개 항목 승인 완료`);
toast.success('설정이 저장되었습니다.');

// ✅ 에러(catch 블록) → toast.error
} catch (err) {
  toast.error(`삭제 실패: ${(err as Error).message}`);
}

// ✅ 입력 검증 → toast.warning (return 후 즉시 반환)
if (!pattern) {
  toast.warning('패턴을 입력하세요.');
  return;
}
```

---

## 금지 패턴

```typescript
// ❌ 절대 금지
alert('저장 완료');
alert(`에러: ${err.message}`);
confirm('삭제하시겠습니까?');   // → ConfirmDialog 컴포넌트 사용

// ❌ 자체 toast 구현 금지
let toastMessage = $state<string | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(msg: string) { ... }   // 이미 글로벌 store가 있음
```

---

## toast API 전체

```typescript
// 기본 (type + duration 직접 지정)
toast.show(message, 'success' | 'error' | 'info' | 'warning', durationMs);

// 단축 메서드 (권장)
toast.success(message, duration?)   // 기본 3000ms
toast.error(message, duration?)     // 기본 5000ms
toast.info(message, duration?)      // 기본 3000ms
toast.warning(message, duration?)   // 기본 4000ms

// 제어
const id = toast.success('처리 중...');
toast.dismiss(id);    // 특정 toast 닫기
toast.clear();        // 전체 닫기
```

---

## confirm 대안 — ConfirmDialog 컴포넌트

`confirm()`은 블로킹 모달이므로 사용 금지. 삭제 확인 등은 `ConfirmDialog` 컴포넌트 사용.

```svelte
<ConfirmDialog
  open={showConfirm}
  message="정말 삭제하시겠습니까?"
  onConfirm={handleDelete}
  onCancel={() => showConfirm = false}
/>
```

---

## 자체 구현이 있을 때 마이그레이션

```typescript
// ❌ 기존 자체 구현
let toastMessage = $state<string | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(msg: string) {
  toastMessage = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMessage = null; }, 3000);
}
showToast('카테고리 지정 완료');

// ✅ 교체 후
import { toast } from '$lib/stores/toast';
toast.success('카테고리 지정 완료');
```

템플릿의 자체 toast UI(`{#if toastMessage}...{/if}`) 블록도 함께 삭제.
