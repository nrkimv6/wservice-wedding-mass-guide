# wedding-mass-guide

> 가톨릭 혼배 미사 안내 앱

## 프로젝트 정보

| 항목 | 내용 |
|------|------|
| 프레임워크 | SvelteKit 2 + Svelte 5 |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS |
| 데이터베이스 | Supabase |
| 모바일 | - (모바일 최적화) |
| 배포 | Cloudflare Pages |
| URL | wservice-wedding-mass-guide (Pages) |
| 주요 라이브러리 | bits-ui, qrcode, Supabase |

## 프로젝트 특성

- 32단계 혼배 미사 순서 안내
- 기도문, 자세(기립/무릎/착석), 역할(사제/신자/독서자/부부) 표시
- 4가지 테마, 글자 크기 조절
- 스와이프 + 키보드 내비게이션
- QR 코드로 웨딩 패스 생성

## 🔴 .git 보호 규칙 (최우선)

**절대 금지:**
- `.git` 디렉토리 삭제/이동/수정
- `git clean -f`, `git reset --hard`
- `git checkout .`, `git restore .`
- `Remove-Item -Recurse -Force` (코드 대상)

git 문제 발생 시: 읽기 전용 명령으로 상태 확인 후 사용자에게 보고만 할 것.

## 커밋 규칙

```bash
# ❌ 금지: git commit 직접 사용
git commit -m "..."

# ✅ 필수: 전역 커밋 스크립트 사용
git add .
"D:\work\project\tools\common\commit.sh" "feat: 기능 추가"
```

**Conventional Commits**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## 스킬 안내

| 스킬 | 트리거 키워드 |
|------|-------------|
| `plan` | 계획해, plan, 아이디어 |
| `plan-list` | 계획 목록, plan list |
| `next` | 뭐 할까, 다음, next |
| `implement` | 구현해, 진행해 |
| `done` | 완료, 끝, 마무리 |
| `deploy` | 배포, deploy |
| `webapp-testing` | 테스트, build check |
| `db-migration` | 마이그레이션, migration |

**키워드 발견 시 즉시 스킬 호출. 수동 방법 제안 금지.**

## 문서 위치

| 문서 | 위치 |
|------|------|
| TODO | `TODO.md` |
| 완료 이력 | `docs/DONE.md` |
| 아카이브 | `docs/archive/` |
