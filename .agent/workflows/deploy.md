---
description: "Cloudflare Workers 배포. Use when: 배포, deploy, 릴리즈, 운영 반영, release"
---

# 배포

Cloudflare Workers/Pages 수동 배포 및 자동 배포 체계 가이드

## 배포 방법

- **자동 배포**: GitHub의 `main` 브랜치에 코드가 push되면 Cloudflare Pages 통합에 의해 자동으로 빌드 및 배포가 실행된다.
- **배포 절차**: `commit.ps1` 스크립트를 통해 변경사항을 커밋한 뒤, `git push origin main` 명령어를 실행하여 배포한다.

## 프로젝트별 빌드

| 프로젝트 | 프레임워크 | 빌드 디렉토리 |
|----------|------------|---------------|
| `activity-hub` | SvelteKit | `build/` |
| `tool-view` | SvelteKit | `build/` |
| `gentle-words` | Astro | `dist/` |
| `screenshot-generator` | SvelteKit | `build/` |
| `sacred-hours` | SvelteKit | `build/` |
| `memo-alarm` | SvelteKit | `build/` |
| `line-minder` | SvelteKit | `build/` |

## 배포 체크리스트

### 배포 전 체크리스트
- [ ] **Uncommitted Changes**: 커밋하지 않은 변경사항이 있는지 확인한다 (`git status --short`).
- [ ] **빌드 확인**: 프로젝트 디렉토리에서 `npm run build`를 실행하여 빌드 에러가 없는지 확인한다.
- [ ] **브랜치 확인**: 현재 브랜치가 `main`인지 확인한다 (그렇지 않다면 main으로 병합 후 배포).

### 배포 후 체크리스트
- [ ] **Workers URL 점검**: 할당된 Cloudflare Workers 페이지 URL(예: `wservice-*.workers.dev`)에 접속하여 정상 동작 확인.
- [ ] **커스텀 도메인 점검**: 연결된 커스텀 도메인(예: `*.woory.day`)에 접속하여 캐시 갱신 및 정상 동작 확인.

## 프로젝트별 URL

| 서비스 | URL | Pages URL |
|--------|-----|-----------|
| activity-hub | `activity.woory.day` | `activity-hub.orangepie2236.workers.dev` |
| tool-view | `woory.day` | `wservice-tools.orangepie2236.workers.dev` |
| gentle-words | `gentle-words.woory.day` | `wservice-gentle-words.orangepie2236.workers.dev` |
| screenshot-generator | `screenshot.woory.day` | `wservice-mobile-screenshot-generator.orangepie2236.workers.dev` |
| sacred-hours | `sacred-hours.woory.day` | `wservice-sacred-hours.orangepie2236.workers.dev` |
| memo-alarm | `memo.woory.day` | `wservice-memo-alarm.orangepie2236.workers.dev` |
| line-minder | `line-minder.woory.day` |  `wservice-line-minder.orangepie2236.workers.dev` |

## 롤백

배포에 치명적인 문제가 발생했을 경우:
1. 로컬 환경에서 `git revert HEAD` 명령어를 통해 문제가 된 커밋을 되돌리는 새로운 커밋을 생성한다.
2. 커밋 후 `git push origin main`으로 복구된 버전을 배포한다.
3. 배포 시간 지연 시, Cloudflare Dashboard(Pages 항목)에 접속하여 이전 배포 버전의 "Rollback(또는 Retry deployment)" 버튼을 통해 즉시 롤백한다.
