---
name: deploy
description: "Cloudflare Workers 배포. Use when: 배포, deploy, 릴리즈, 운영 반영, release"
---

# Cloudflare Workers 배포

service 프로젝트의 웹앱들을 Cloudflare Workers에 배포합니다.

## 사용 시점

- 코드 변경 완료 후 운영 반영
- 긴급 수정 배포

## 배포 방법

### 자동 배포 (권장)

GitHub push 시 Cloudflare가 자동으로 빌드/배포합니다.

```powershell
# 변경사항 커밋 후 push
cd 프로젝트폴더
D:\work\project\tools\common\commit.ps1 "feat: 기능 설명"
git push origin main
```

또는 D:\work\project\tools\common\commit.sh 사용 가능


## 프로젝트별 빌드 디렉토리

| 프로젝트 | 빌드 명령 | 출력 디렉토리 |
|---------|----------|--------------|
| SvelteKit 앱 | `npm run build` | `build/` |
| Astro 앱 (gentle-words) | `npm run build` | `dist/` |

## 배포 체크리스트

### 1. 배포 전 확인
- [ ] uncommitted changes 없음 (`git status`)
- [ ] 로컬 빌드 성공 (`npm run build`)
- [ ] 올바른 브랜치 (보통 `main`)

### 2. 배포 후 확인
- [ ] Workers URL에서 동작 확인
- [ ] 커스텀 도메인에서 동작 확인

## 프로젝트별 URL

| 프로젝트 | Workers URL | 커스텀 도메인 |
|---------|-----------|--------------|
| activity-hub | activity-hub.orangepie2236.workers.dev | activity.woory.day |
| easy-view-tools | wservice-tools.orangepie2236.workers.dev | woory.day |
| gentle-words | wservice-gentle-words.orangepie2236.workers.dev | gentle-words.woory.day |
| mobile-screenshot | wservice-mobile-screenshot-generator.orangepie2236.workers.dev | screenshot.woory.day |
| sacred-hours | wservice-sacred-hours.orangepie2236.workers.dev | sacred-hours.woory.day |

## 롤백

문제 발생 시:

```powershell
# 이전 커밋으로 되돌리기
git revert HEAD
D:\work\project\tools\common\commit.ps1 "revert: 롤백 사유"
git push origin main
```

또는 Cloudflare Dashboard에서 이전 배포로 롤백 가능.

## D1 데이터베이스 (easy-view-tools만 해당)

```powershell
# 마이그레이션 적용
cd D:\work\project\service\easy-view-tools-svelte
npx wrangler d1 migrations apply <DB_NAME>
```

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
