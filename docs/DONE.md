# DONE

## 완료된 작업

### 2026-01-12
- [x] SvelteKit 프로젝트 생성 및 초기 설정
- [x] 필수 패키지 설치 (lucide-svelte, clsx, tailwind-merge, bits-ui 등)
- [x] Cloudflare Workers adapter 설정
- [x] Tailwind CSS 3 설정
- [x] 프로젝트 구조 생성 (TODO.md, docs/DONE.md)
- [x] 시작 화면에서 테마 선택 버튼 제거 (설정에서만 테마 변경 가능)
- [x] 글자 크기 조정 기능 구현 (CSS 변수로 본문/기도문 텍스트 크기 조절)
- [x] 캐시 초기화 기능 추가 (설정 메뉴에 구현)
  - ThemeSelector 컴포넌트에 캐시 클리어 버튼 추가
  - Service Worker 캐시만 삭제 (IndexedDB/localStorage는 유지)
  - 커스텀 service-worker.ts 생성 및 SKIP_WAITING 핸들러 구현
  - 로딩 상태 표시 (회전 아이콘 애니메이션)
  - 캐시 초기화 시 앱 진행 상태도 초기화 (처음 화면부터 시작)

## 해결된 이슈

### 2026-01-12
- [x] 캐시 초기화 후에도 마지막 본 페이지부터 시작되는 문제
  - localStorage의 `mass-started`, `mass-current-step` 삭제 추가
  - 캐시 클리어 후 IntroScreen부터 시작하도록 개선
