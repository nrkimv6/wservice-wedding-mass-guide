# wedding-mass-guide - 수동 작업 목록

> 자동화 불가능한 브라우저 검증, 배포 후 확인 등 수동 작업

---

## WMG-SW-3: Service Worker + 버튼 동작 검증 (배포 후)

> 관련 계획서: [docs/archive/2026-02-05_fix-service-worker-and-home-buttons.md](docs/archive/2026-02-05_fix-service-worker-and-home-buttons.md)

### 검증 대상
- Service Worker 정상 설치 확인
- 상단 버튼 4개 동작 확인 (목차, 정보, 글자 축소/확대)
- CommonInfoPage 표시 확인

### 체크리스트

- [ ] `https://wedding-mass-guide.woory.day/` 접속
- [ ] DevTools → Application → Service Workers 에서 기존 SW 모두 Unregister
- [ ] 새로고침 후 콘솔에서 SW 설치 성공 확인 (에러 없어야 함)
- [ ] Info(ℹ) 버튼 클릭 → `CommonInfoPage` 표시, `church_name` 에러 없음 확인
- [ ] 목차(☰) 버튼 클릭 → 목차 오버레이 열림 확인
- [ ] 글자 축소(-) 버튼 클릭 → 글자 크기 줄어듦 확인
- [ ] 글자 확대(+) 버튼 클릭 → 글자 크기 커짐 확인
- [ ] 콘솔에 `TypeError` 또는 `Uncaught` 에러가 없는지 확인

---

*마지막 업데이트: 2026-02-06*
