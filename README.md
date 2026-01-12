# 혼배미사 가이드 (Wedding Mass Guide)

가톨릭 혼배미사 순서를 안내하는 모바일 웨딩 미사 가이드 웹 앱입니다.

## 설명

미사 참례자들이 혼배미사의 각 순서와 기도문을 쉽게 따라할 수 있도록 돕는 가이드 애플리케이션입니다.

## 주요 기능

- 32단계 혼배미사 순서 안내
- 기도문 전문 제공
- 자세(기립/착석/무릎) 안내
- 역할(사제/회중/독서자/신랑신부) 표시
- 4가지 테마 (Ivory Gold, White Rose, Cathedral, Sage)
- 텍스트 크기 조절
- 모바일 최적화 (스와이프, 키보드 네비게이션)

## 기술 스택

- SvelteKit 2
- Svelte 5
- TypeScript 5
- Tailwind CSS 3
- bits-ui
- lucide-svelte
- Cloudflare Workers

## 개발

```bash
npm install
npm run dev
```

## 배포

자동 배포: GitHub push 시 자동 배포
수동 배포: `npx wrangler deploy`

## 접속

- 프로덕션: https://wedding-mass-guide.woory.day (예정)
- Workers: https://wservice-wedding-mass-guide.orangepie2236.workers.dev (예정)
