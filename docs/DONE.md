# 완료된 작업 (최근 20개)

## 2026-02-13

### 단계 이동 제스처 힌트
- [x] **SwipeHint 컴포넌트 생성** — `src/lib/components/SwipeHint.svelte` 신규 생성
- [x] **페이지 통합** — `src/routes/mass/[massId]/+page.svelte` 수정
- [x] **빌드 검증** — `npm run build` 실행 성공
- [x] **완료** — [archive](archive/2026-02-12_swipe-hint.md)

## 2026-02-10

### Phase 4 추가 결함 수정 (WMG-11~18)
- [x] **WMG-11: massService announcements 필드 누락 수정** — createMass/updateMass/rowToMassConfig에 announcements 필드 추가
- [x] **WMG-14: database.ts 타입 최신화** — mass_configurations 테이블에 announcements 컬럼 추가
- [x] **WMG-12: IntroScreen 중복 onstart prop 제거** — onstart 제거, onStart만 사용
- [x] **WMG-13: SyncStatusBanner 이모지 수정** — 🔴→🟢 변경
- [x] **WMG-15: Admin View SyncControl 미사용 import 정리** — 사용하지 않는 import 제거
- [x] **WMG-16: Admin View wakeLock cleanup 추가** — visibilitychange 이벤트 리스너 및 cleanup 추가
- [x] **WMG-17: rowToMassConfig as any 캐스팅 개선** — 명시적 타입 캐스팅으로 변경
- [x] **WMG-18: .env.example 파일 생성** — 환경 변수 예시 파일 생성
- 빌드 확인 완료

## 2026-02-06

### 공통앱(홈) Service Worker + 버튼 결함 수정 (23/23)
- [x] **WMG-SW-1: Service Worker 통합** — static/sw.js 제거, SvelteKit 내장 SW 사용
- [x] **WMG-SW-2: CommonInfoPage 교체** — MassInfoPage → CommonInfoPage (massConfig 불필요)
- [x] **WMG-SW-3: 상단 버튼 동작 검증** — 수동 검증은 [MANUAL_TASKS.md](../MANUAL_TASKS.md) 참조
- [x] **완료** — [archive](archive/2026-02-05_fix-service-worker-and-home-buttons.md)

## 2026-02-04

### Admin View CRITICAL 결함 5건 수정 (WMG-1~5)
- [x] **WMG-1: Header prop 불일치 수정** — onTocToggle/onInfoToggle/onTextSizeChange → onMenuClick/onInfoClick/onDecreaseSize/onIncreaseSize + textSize
- [x] **WMG-2: StepCard prop 불일치 수정** — onPrev/massConfig/canGoPrev/canGoNext → onPrevious/totalSteps
- [x] **WMG-3: ThemeSelector prop 불일치 수정** — onSelect → onSelectTheme
- [x] **WMG-4: TableOfContents prop 불일치 수정** — steps/currentSections/currentStepId/onSelect → sections/currentStep/onSelectSection
- [x] **WMG-5: wakeLockStore 메서드 수정** — request() → enable()
- 빌드 확인 완료

### 관리자 동기화 컨트롤 통합 (P1)
- [x] **SyncControl 컴포넌트 admin 페이지 통합**
  - [admin/mass/[massId]/+page.svelte](../src/routes/admin/mass/[massId]/+page.svelte)에 통합 완료
  - [admin/mass/[massId]/view/+page.svelte](../src/routes/admin/mass/[massId]/view/+page.svelte)에도 통합

- [x] **동기화 ON/OFF 시 DB 업데이트**
  - `toggleSync()` 함수에서 `mass_configurations.sync_enabled` 업데이트
  - `updateMass()` 서비스 사용하여 DB 저장
  - 관리 페이지와 관리자 뷰 모두 적용
  - 로컬 상태와 DB 동기화 보장

- [x] **관리자 단계 이동 시 broadcast**
  - `$effect`로 `currentStepIdStore` 변경 감지
  - DB `current_step` 자동 업데이트 (관리자 뷰에서)
  - `syncEnabled`일 때만 `realtimeSyncStore.broadcastStep()` 호출
  - 초기 로드 시 DB의 `current_step` 복원
  - 빌드 확인 완료

## 2026-01-13

### Phase 4: Supabase Realtime 동기화
- [x] **Supabase Realtime 설정** (커밋: `8a46ea4`)
  - realtimeSync.svelte.ts 스토어 생성
  - Broadcast 채널로 단계 동기화
  - Presence tracking으로 연결된 사용자 수 추적
  - 연결 상태 관리 (connected/error)

- [x] **하객 동기화 클라이언트** (커밋: `8a46ea4`)
  - SyncStatusBanner 컴포넌트 구현
  - 관리자 단계 자동 따라가기
  - "자유 탐색 모드" 전환 기능
  - sync_enabled=true일 때 자동 연결

- [x] **연결 상태 처리** (커밋: `8a46ea4`)
  - 연결 끊김 감지 및 표시
  - 오류 메시지 표시
  - 재연결 준비 (자동 복구 메시지)

- [x] **관리자 동기화 컨트롤 컴포넌트** (커밋: `8a46ea4`)
  - SyncControl.svelte 생성 (미통합)
  - 동기화 ON/OFF 토글 UI
  - 연결된 하객 수 표시 UI

### Phase 2: Admin Backend 완료
- [x] **Custom Announcements** (커밋: `0bbd61e`)
  - Announcement 타입 정의 (id, message, order)
  - DB 마이그레이션: announcements JSONB 컬럼 추가
  - AnnouncementManager 컴포넌트 (CRUD)
    - 공지사항 추가/삭제
    - 순서 변경 (move up/down)
  - Admin 폼에 통합
  - 첫 번째 공지사항을 하객 화면 배너에 표시

### Phase 3: Preview Mode
- [x] **미리보기 기능** (커밋: `3ec8cbc`)
  - `/mass/[massId]` 라우트 생성
  - 미사 설정 DB에서 로드 및 표시
  - IntroScreen에 massInfo 전달 (신랑/신부/날짜/시간/장소)
  - 설정된 theme/viewMode 자동 적용
  - localStorage를 massId별로 격리
  - 로딩/에러 상태 처리

---

## 2026-01-12

### Phase 2: Admin Backend
- [x] **Mass CRUD API** (커밋: `3ffe675`)
  - massService.ts 생성 (createMass, getMass, updateMass, deleteMass, getUserMasses)
  - Supabase 연동
  - /admin/mass/new 페이지 실제 저장 기능
  - /admin/mass/[massId] 페이지 데이터 로드
  - /admin/dashboard 미사 목록 표시

- [x] **Admin Authentication** (커밋: `b02926a`)
  - auth_worker 통합 (Google/Kakao OAuth)
  - authStore.svelte.ts 생성
  - GoogleLoginButton / KakaoLoginButton 컴포넌트
  - /auth/callback 핸들러 구현
  - /admin/+layout.svelte 인증 guard 활성화

- [x] **Supabase 설정** (커밋: `b02926a`)
  - mass_configurations 테이블 마이그레이션
  - RLS 정책 설정
  - wservice Supabase 프로젝트 사용

### Phase 2: Admin UI
- [x] **Admin 라우팅** (커밋: `2c2e876`)
  - /admin (로그인)
  - /admin/dashboard (대시보드)
  - /admin/mass/new (미사 생성)
  - /admin/mass/[massId] (미사 관리 및 QR)

- [x] **Mass Setup 폼** (커밋: `2c2e876`)
  - 상세정보 입력 (장소, 날짜, 시간, 신랑/신부, 주례)
  - 성가 설정 (5종: 입당, 화답송, 봉헌, 영성체, 파견, 축가)
  - 전례시기 프리셋 (연중/대림/사순/부활)
  - 테마 선택 (4종)
  - 보기 모드 선택 (32단계/18단계)

- [x] **QR Code 생성** (커밋: `2c2e876`)
  - qrcode 라이브러리 사용
  - PNG 다운로드 기능
  - URL 복사 기능
  - 미리보기 버튼

### Phase 1: 잔여 기능
- [x] **Wake Lock API** (커밋: `c22cb6e`)
  - 미사 시작 시 화면 꺼짐 방지
  - Page visibility 변경 시 재획득
  - 페이지 이탈 시 자동 해제

- [x] **Direct Step URL** (커밋: `73635a5`)
  - `/step/5` → `/?step=5` 리다이렉트
  - URL 파라미터로 직접 단계 접근
  - 필터링된 단계만 허용

- [x] **Optional Prayer 토글** (커밋: `febdea8`)
  - massSteps에 isOptional, optionalKey 추가
  - 대영광송/알렐루야 조건부 표시
  - Navigation 로직도 필터링 반영

- [x] **Announcement Banner** (커밋: `cf91bd8`)
  - 상단 배너 컴포넌트
  - localStorage로 dismiss 상태 저장

- [x] **Mass Info Page** (커밋: `00d70c0`)
  - 장소, 날짜, 시간, 신랑/신부, 주례 표시
  - 성가 목록 (5종)
  - 전례시기 안내
  - 헤더 ℹ️ 버튼으로 접근

- [x] **Progress Bar & Info Button** (커밋: `e0d373a`)
  - 기존 `4/32` 형식 제거
  - 가로 progress bar 추가
  - 정보 아이콘(ℹ️) 버튼 추가

---

## 기술 스택

- **Frontend**: SvelteKit 2, Svelte 5 (runes: $state, $derived, $effect)
- **Backend**: Supabase (PostgreSQL, Realtime, Auth)
- **Auth**: auth_worker (centralized OAuth service)
- **Database**: wservice Supabase 프로젝트
- **Realtime**: Supabase Broadcast + Presence
- **Deployment**: Cloudflare Pages (GitHub Actions)

## 파일 구조

```
wedding-mass-guide/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── AnnouncementBanner.svelte
│   │   │   ├── AnnouncementManager.svelte    ← NEW
│   │   │   ├── IntroScreen.svelte            ← UPDATED (massInfo)
│   │   │   ├── SyncStatusBanner.svelte       ← NEW
│   │   │   └── SyncControl.svelte            ← NEW (미통합)
│   │   ├── services/
│   │   │   ├── massService.ts                ← NEW
│   │   │   └── supabase.ts
│   │   ├── stores/
│   │   │   ├── auth.svelte.ts                ← NEW
│   │   │   └── realtimeSync.svelte.ts        ← NEW
│   │   └── types/
│   │       └── mass.ts                       ← UPDATED (Announcement)
│   └── routes/
│       ├── admin/
│       │   ├── +layout.svelte                ← Auth guard
│       │   ├── +page.svelte                  ← Login
│       │   ├── dashboard/+page.svelte
│       │   └── mass/
│       │       ├── new/+page.svelte
│       │       └── [massId]/+page.svelte
│       ├── auth/
│       │   └── callback/+page.svelte         ← NEW
│       └── mass/
│           └── [massId]/+page.svelte         ← NEW (attendee view)
├── supabase/
│   └── migrations/
│       ├── 20260113_001_mass_configurations.sql
│       └── 20260113_002_add_announcements.sql  ← NEW
└── docs/
    └── DONE.md                               ← THIS FILE
```

## 커밋 히스토리 (최신순)

| 커밋 | 날짜 | 설명 |
|------|------|------|
| `fd8a1c3` | 2026-01-13 | docs: mark Realtime sync features as complete in plan |
| `8a46ea4` | 2026-01-13 | feat: implement Supabase Realtime sync for attendees |
| `0bbd61e` | 2026-01-13 | feat: implement custom announcements management |
| `46e3990` | 2026-01-13 | docs: mark Custom Announcements as complete in plan |
| `3ec8cbc` | 2026-01-13 | feat: implement preview mode for attendee view |
| `ef3f772` | 2026-01-13 | docs: mark Phase 3 Preview Mode as complete in plan |
| `3ffe675` | 2026-01-13 | feat: implement Mass CRUD API with Supabase |
| `b02926a` | 2026-01-13 | feat: implement admin authentication with auth_worker |
| `482b950` | 2026-01-13 | feat: add wedding-mass app configuration (auth-worker) |
| `2c2e876` | 2026-01-12 | feat: add admin pages UI (no backend yet) |

## 다음 작업 (우선순위 순)

### P1 (High Priority)
1. **관리자 동기화 컨트롤 통합**
   - SyncControl 컴포넌트를 admin 페이지에 통합
   - 동기화 ON/OFF 시 DB 업데이트
   - 관리자가 단계 이동 시 broadcast

2. **관리자 실시간 수정**
   - 진행 중 빠른 수정 버튼
   - 성가 번호/제목 즉시 수정
   - 공지사항 추가/수정
   - 저장 시 연결된 하객에게 즉시 반영

### P2 (Medium Priority)
1. **Mass History**
   - 생성된 미사 목록
   - 날짜순 정렬
   - 삭제 기능

2. **Dashboard 개선**
   - 현재/예정 미사 요약
   - 빠른 편집 접근

3. **Dark Mode**
   - 다크 모드 토글
   - 시스템 설정 따라가기

### P3 (Low Priority)
1. **PWA Offline Support**
2. **Analytics**

## 참고 문서

- Plan: `common/docs/plan/2026-01-12_wedding-mass-remaining-features.md`
- Auth Worker Guide: `common/docs/guide/auth-worker-integration-guide.md`
- Supabase Project: wservice (line-minder와 공유)
