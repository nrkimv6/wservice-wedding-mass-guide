# wedding-mass-guide: SIGNED_OUT 핸들러 + Realtime 정리 추가 계획

- **날짜**: 2026-02-04
- **원본 계획**: `common/docs/archive/2026-02-04_fix-logout-and-sw-bugs-all-projects.md`
- **가이드**: `common/docs/guide/logout-cleanup-guide.md`
- **진행률**: 0/7

---

## 현재 상태

- `auth.svelte.ts`(클래스 기반, 16줄)에 **SIGNED_OUT 이벤트 분기가 없음**
- realtimeSyncStore에 `disconnect()` 메서드가 있지만 SIGNED_OUT에서 호출 안 됨
- wakeLockStore에 `disable()` 메서드가 있지만 SIGNED_OUT에서 호출 안 됨
- Supabase Realtime 채널(presence + broadcast)이 로그아웃 후에도 활성 상태로 남을 수 있음

---

## 작업 항목

### A. auth.svelte.ts에 SIGNED_OUT 핸들러 추가

**파일**: `src/lib/stores/auth.svelte.ts` (클래스 기반, onAuthStateChange 16줄)

- [ ] 현재 콜백이 이벤트 타입을 무시하고 있는지 확인
- [ ] 콜백의 첫 번째 파라미터로 `event`를 받도록 수정
- [ ] `event === 'SIGNED_OUT'` 분기 추가
- [ ] SIGNED_OUT 분기 안에서 `realtimeSyncStore.disconnect()` 호출 추가
- [ ] SIGNED_OUT 분기 안에서 `wakeLockStore.disable()` 호출 추가
- [ ] SIGNED_OUT 분기 안에서 user를 null로 설정

### B. 검증

- [ ] `npm run build` 실행하여 빌드 에러 없는지 확인
- [ ] 로그인 → 미사 세션 참여 → 로그아웃 → Realtime 연결이 끊어지는지 확인 (브라우저 개발자도구 Network 탭)
