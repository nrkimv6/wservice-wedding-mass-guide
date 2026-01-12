# wedding-mass-guide 배포 문서

> **공통 가이드**: [common/docs/guide/cloudflare-pages-deployment.md](../../common/docs/guide/cloudflare-pages-deployment.md) 참고

## 프로젝트 정보

- **프로젝트명**: wservice-wedding-mass-guide
- **리포지토리**: https://github.com/nrkimv6/wservice-wedding-mass-guide
- **프레임워크**: SvelteKit 2 + Svelte 5
- **배포 플랫폼**: Cloudflare Pages

## 배포 URL

### Pages 기본 도메인
- **프로덕션**: https://wservice-wedding-mass-guide.pages.dev
- **프리뷰 (PR)**: https://{branch}.wservice-wedding-mass-guide.pages.dev

### 커스텀 도메인 (예정)
- TBD (woory.day 서브도메인 예정)

> **⚠️ 주의**: Pages는 `*.workers.dev` 도메인을 사용하지 않습니다!
> Workers.dev 도메인 비활성화는 **정상**입니다.

## 빌드 설정 (Dashboard)

```
프로젝트 이름: wservice-wedding-mass-guide
프로덕션 브랜치: main
프레임워크 프리셋: SvelteKit
빌드 명령: npm run build
배포 명령: (비워두기)
빌드 출력: .svelte-kit/cloudflare
루트 디렉터리: /
```

### 환경 변수

| 이름 | 값 | 설명 |
|------|---|------|
| NODE_VERSION | 20 | Node.js 버전 고정 |

## wrangler.toml 설정

```toml
name = "wservice-wedding-mass-guide"
compatibility_date = "2026-01-12"
pages_build_output_dir = ".svelte-kit/cloudflare"
compatibility_flags = ["nodejs_compat"]
```

## 로컬 테스트 배포

```powershell
# Windows PowerShell
cd "D:\work\project\service\wtools\wedding-mass-guide"

# 빌드
npm run build

# 로컬 프리뷰
npm run preview

# Wrangler로 배포 (수동)
npx wrangler pages deploy
```

## 기능 테스트 체크리스트

배포 후 다음 기능들을 확인하세요:

- [ ] 인트로 화면 정상 표시
- [ ] 테마 4가지 전환 동작 (Ivory Gold, White Rose, Cathedral, Natural Sage)
- [ ] 텍스트 크기 조절 (1-5단계)
- [ ] 터치 스와이프 네비게이션 (모바일, 50px threshold)
- [ ] 키보드 화살표 네비게이션 (데스크탑, ← →)
- [ ] localStorage 상태 유지 (새로고침 후)
- [ ] 목차(ToC) 네비게이션 (32 steps, 6 sections)
- [ ] 각 미사 단계별 표시 (자세, 역할 뱃지)

## 특이사항

### 사용하는 기술

- **Svelte 5 Runes**: $state, $derived, $effect, $props
- **Svelte 5 Module Script**: ThemeSelector에서 타입 export
- **localStorage 영속성**: 커스텀 `localStorageStore.svelte.ts`
- **4가지 테마**: CSS custom properties 기반 테마 시스템
- **반응형 디자인**: 모바일 우선, max-width 600px

### 알려진 이슈

없음

## 문제 해결

### 배포 실패 시

1. **"Authentication error [code: 10000]"**
   - Dashboard에서 "배포 명령" 필드가 비어있는지 확인
   - [공통 가이드](../../common/docs/guide/cloudflare-pages-deployment.md#1-authentication-error-code-10000) 참고

2. **빌드 실패**
   - 로컬에서 `npm run build` 테스트
   - `npm run check`로 TypeScript 오류 확인

3. **URL 접속 불가**
   - `*.pages.dev` URL 사용 (workers.dev 아님!)
   - Dashboard에서 배포 상태가 "Success"인지 확인

## 참고 자료

- [공통 Cloudflare Pages 배포 가이드](../../common/docs/guide/cloudflare-pages-deployment.md)
- [SvelteKit Cloudflare 어댑터](https://kit.svelte.dev/docs/adapter-cloudflare)
- [Svelte 5 문서](https://svelte.dev/docs/svelte/overview)
