# Cloudflare Pages 배포 가이드

## 프로젝트 정보

- **프로젝트명**: wservice-wedding-mass-guide
- **리포지토리**: https://github.com/nrkimv6/wservice-wedding-mass-guide
- **프레임워크**: SvelteKit 2 + Svelte 5
- **배포 플랫폼**: Cloudflare Pages

## 배포 방법

### 1. Cloudflare Dashboard에서 GitHub 연동 (권장)

이 방법이 가장 안전하고 권장되는 방식입니다.

#### 단계별 설정

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com 로그인
   - 왼쪽 메뉴에서 "Workers & Pages" 클릭

2. **새 프로젝트 생성**
   - "Create application" 버튼 클릭
   - "Pages" 탭 선택
   - "Connect to Git" 선택

3. **GitHub 리포지토리 연결**
   - GitHub 계정 연동 (처음이라면)
   - 리포지토리 선택: `nrkimv6/wservice-wedding-mass-guide`
   - "Begin setup" 클릭

4. **빌드 설정**
   ```
   프로젝트 이름: wservice-wedding-mass-guide
   프로덕션 브랜치: main
   프레임워크 프리셋: SvelteKit
   빌드 명령: npm run build
   빌드 출력 디렉터리: .svelte-kit/cloudflare
   ```

   > **중요**: 빌드 출력 디렉터리는 `wrangler.toml`의 `pages_build_output_dir` 설정과 일치해야 합니다.

5. **환경 변수 설정** (필요시)
   - "Environment variables" 섹션에서 추가
   - 현재 프로젝트는 환경 변수 불필요

6. **배포 시작**
   - "Save and Deploy" 클릭
   - 첫 배포가 자동으로 시작됩니다

#### 자동 배포 동작

- `main` 브랜치에 push할 때마다 자동 배포
- Pull Request 생성 시 프리뷰 배포 자동 생성
- 배포 상태는 Dashboard에서 확인 가능

### 2. CLI 수동 배포 (로컬에서만)

```powershell
# 빌드
npm run build

# Wrangler로 배포
npx wrangler pages deploy
```

> **주의**: CLI로 먼저 프로젝트를 생성하면 Dashboard에서 GitHub 연동이 불가능합니다.
> 반드시 **Dashboard에서 먼저 GitHub 연동**을 설정하세요.

## 설정 파일 설명

### wrangler.toml

```toml
name = "wservice-wedding-mass-guide"
compatibility_date = "2026-01-12"
pages_build_output_dir = ".svelte-kit/cloudflare"
compatibility_flags = ["nodejs_compat"]
```

#### 각 설정 설명

- **name**: Cloudflare Pages 프로젝트 이름
- **compatibility_date**: Cloudflare Workers API 버전 날짜
- **pages_build_output_dir**: SvelteKit 빌드 결과물 경로
  - SvelteKit의 `adapter-cloudflare`가 생성하는 출력 디렉터리
  - `.svelte-kit/cloudflare/` 안에는 정적 파일과 Functions가 포함됨
- **compatibility_flags**: Node.js 호환성 플래그
  - `nodejs_compat`: Node.js 빌트인 모듈 사용 가능 (crypto, async_hooks 등)

### svelte.config.js

```javascript
import adapter from '@sveltejs/adapter-cloudflare';

const config = {
  kit: {
    adapter: adapter()
  }
};
```

- `adapter-cloudflare`: SvelteKit → Cloudflare Pages 변환
- 빌드 시 `.svelte-kit/cloudflare/` 에 배포용 파일 생성

## 현재 발생한 오류 해결

### 오류 내용

```
✘ [ERROR] A request to the Cloudflare API failed.
Authentication error [code: 10000]
```

### 원인

GitHub Actions에서 사용하는 `CLOUDFLARE_API_TOKEN`의 권한 문제입니다.
Cloudflare가 자동으로 생성한 API Token은 Pages 프로젝트 생성 권한이 없을 수 있습니다.

### 해결 방법

**옵션 1: Dashboard에서 처음부터 설정 (권장)**

1. 현재 프로젝트가 CLI로 생성되었다면 삭제:
   ```powershell
   npx wrangler pages project delete wservice-wedding-mass-guide
   ```

2. Cloudflare Dashboard에서 "Connect to Git" 방식으로 새로 생성
   - 위의 "1. Cloudflare Dashboard에서 GitHub 연동" 가이드 참고
   - 이 방법은 API Token 권한 문제가 없습니다

**옵션 2: API Token 권한 수정**

1. https://dash.cloudflare.com/profile/api-tokens 접속
2. GitHub Actions에서 사용 중인 Token 찾기
3. "Edit" 클릭하여 다음 권한 추가:
   - Account - Cloudflare Pages - Edit
4. Token 저장 후 GitHub Actions 재실행

## Cloudflare Pages vs Workers

### Pages를 선택한 이유

| 구분 | Workers | Pages |
|------|---------|-------|
| 용도 | Edge Function (단일 JS 파일) | 정적 사이트 + SSR/API |
| SvelteKit 호환 | 제한적 | 완벽 지원 |
| 정적 파일 | 직접 처리 필요 | 자동 호스팅 |
| SSR | 가능하나 복잡 | 기본 지원 |
| GitHub 자동 배포 | 수동 설정 | 기본 제공 |
| 프리뷰 배포 | 없음 | PR마다 자동 |

**결론**: SvelteKit은 정적 HTML/CSS/JS + SSR 코드를 모두 생성하므로 Pages가 적합합니다.

## 배포 후 확인 사항

### 1. 배포 URL 확인

- **프로덕션**: `https://wservice-wedding-mass-guide.pages.dev`
- **커스텀 도메인**: Cloudflare Dashboard에서 설정 가능

### 2. 기능 테스트

- [ ] 인트로 화면 정상 표시
- [ ] 테마 4가지 전환 동작
- [ ] 텍스트 크기 조절
- [ ] 터치 스와이프 네비게이션 (모바일)
- [ ] 키보드 화살표 네비게이션 (데스크탑)
- [ ] localStorage 상태 유지 (새로고침 후)
- [ ] 목차(ToC) 네비게이션

### 3. 성능 확인

- Lighthouse 점수 확인
- Cloudflare Analytics에서 트래픽 모니터링

## 문제 해결

### 빌드 실패 시

1. 로컬에서 빌드 테스트:
   ```powershell
   npm run build
   ```

2. TypeScript 오류 확인:
   ```powershell
   npm run check
   ```

3. wrangler.toml 설정 재확인

### 배포 실패 시

1. Cloudflare Dashboard의 "Deployments" 탭에서 로그 확인
2. GitHub Actions 로그 확인 (Repository → Actions)
3. API Token 권한 확인

## 참고 자료

- [SvelteKit Cloudflare Pages 어댑터](https://kit.svelte.dev/docs/adapter-cloudflare)
- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages/)
- [Wrangler 설정 가이드](https://developers.cloudflare.com/workers/wrangler/configuration/)
