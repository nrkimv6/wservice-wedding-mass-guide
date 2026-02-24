---
name: webapp-testing
description: "SvelteKit/Astro 테스트. Use when: 테스트, test, 빌드 확인, build check"
---

# Web Application Testing

service 프로젝트의 SvelteKit/Astro 웹앱 테스트 스킬입니다.

## 사용 시점

- 코드 변경 후 동작 확인
- 배포 전 검증
- 버그 수정 후 확인

## 테스트 방법

### 1. 타입 체크

```powershell
cd D:\work\project\service\<프로젝트명>
npm run check
```

### 2. 빌드 테스트

```powershell
npm run build
```

### 3. 로컬 개발 서버

```powershell
npm run dev
# 브라우저에서 http://localhost:5173 (또는 4321 for Astro) 확인
```

### 4. 빌드 결과 프리뷰

```powershell
npm run preview
# 정적 빌드 결과물 확인
```

## 프로젝트별 테스트 명령

| 프로젝트 | 타입체크 | 빌드 | 개발서버 |
|---------|---------|------|----------|
| SvelteKit 앱 | `npm run check` | `npm run build` | `npm run dev` |
| Astro 앱 | `npm run check` (있는 경우) | `npm run build` | `npm run dev` |

## 테스트 체크리스트

### 기본 확인
- [ ] `npm run check` 타입 에러 없음
- [ ] `npm run build` 빌드 성공
- [ ] 개발 서버에서 UI 정상 동작

### UI 확인
- [ ] 반응형 레이아웃 (모바일/데스크톱)
- [ ] 다크모드 동작 (해당 시)
- [ ] 버튼/링크 클릭 동작
- [ ] 폼 입력/제출 동작

### 정적 빌드 확인
- [ ] `npm run preview`로 빌드 결과 확인
- [ ] 모든 페이지 라우팅 정상
- [ ] 정적 자산 로드 정상

## SvelteKit Cloudflare 빌드 주의사항

```typescript
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    })
  }
};
```

- `adapter-cloudflare` 사용
- Cloudflare Workers 환경에서 실행
- Edge 런타임 제약 고려

## Astro Cloudflare 빌드 주의사항

```javascript
// astro.config.mjs
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare()
});
```

## UI 기능 완성도 확인 (목록형 컴포넌트 수정 시)

빌드 성공 후, 이번에 수정/생성한 목록형 컴포넌트에 대해 확인:

- [ ] 페이지네이션 또는 무한스크롤이 있는가? (limit만 있고 skip 없으면 NG)
- [ ] 중첩 클릭 영역에 e.stopPropagation()이 있는가?
- [ ] FK ID가 숫자로 표시되는 곳이 없는가?
- [ ] 동일 모듈의 다른 탭과 기능 수준이 동등한가?

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
