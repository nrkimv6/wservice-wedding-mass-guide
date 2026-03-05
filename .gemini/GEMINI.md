# Gemini Agent Instructions

## 프로젝트 개요

Cloudflare Pages에 배포되는 웹 서비스 모음 (각각 별도 Git 리포지토리)

### 주요 프로젝트

| 프로젝트 | 프레임워크 | URL |
|----------|------------|-----|
| activity-hub | SvelteKit | activity.woory.day |
| tool-view | SvelteKit + D1 | woory.day |
| gentle-words | Astro + Svelte | gentle-words.woory.day |
| screenshot-generator | SvelteKit | screenshot.woory.day |
| sacred-hours | SvelteKit + D1 + Capacitor | sacred-hours.woory.day |
| memo-alarm | SvelteKit + Capacitor | memo.woory.day |
| line-minder | SvelteKit + Supabase + Capacitor | line-minder.woory.day |

### 기술 스택

| 카테고리 | 기술 |
|---------|------|
| 프레임워크 | SvelteKit 2, Svelte 5, Astro 5 |
| 언어 | TypeScript 5 |
| 스타일링 | Tailwind CSS 3/4 |
| 모바일 | Capacitor 8 |
| 배포 | Cloudflare Pages (정적 빌드) |
| 데이터베이스 | Cloudflare D1, Supabase |

## 커밋 규칙

**git commit 직접 사용 절대 금지.** 반드시 커밋 스크립트 사용:

```powershell
# 1순위: PowerShell
& "D:\work\project\tools\common\commit.ps1" "커밋 메시지"
# 2순위: bash
bash "/d/work/project/tools/common/commit.sh" "커밋 메시지"
```

Conventional Commits 형식: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**feat/fix 커밋 시 version-bump 필수:**
- `feat:` → minor bump
- `fix:` → patch bump
- `feat!:` → major bump

## 코드 규칙

- 500줄 초과 시 리팩토링 고려
- 파일 인코딩: 반드시 **UTF-8 (BOM 없음)**
- DB 마이그레이션 SQL 생성 시 즉시 실행 필수 (커밋 전)
- 배포: Cloudflare Workers (GitHub push 자동 배포)
- **레포 간 file: 의존성 절대 금지** (배포 환경에서 broken)

## 문서 위치 규칙

| 문서 유형 | 위치 |
|----------|------|
| 계획 | `common/docs/plan/` |
| 아카이브 | `common/docs/archive/` |
| 가이드 | `common/docs/guide/` |
| 프로젝트 TODO | `{project}/TODO.md` |
| 프로젝트 완료 | `{project}/docs/DONE.md` |

## Slash Commands (`.gemini/commands/`)

아래 명령어를 Gemini CLI에서 `/` 접두사로 사용할 수 있습니다:

| 커맨드 | 트리거 키워드 | 설명 |
|--------|-------------|------|
| `/archive-sweep` | 아카이브 정리, archive sweep | 완료된 plan 자동 아카이브 |
| `/check-repos` | 미커밋 확인, repo 상태 | 하위 repo 미커밋 사항 확인 |
| `/codebase-audit` | ⚠️ 명시적 호출 전용 | 전체 코드베이스 점검 |
| `/commit` | 커밋, commit | 안전한 git commit 실행 |
| `/db-migration` | 마이그레이션 실행, SQL 실행 | Supabase SQL 마이그레이션 |
| `/deploy` | 배포, deploy, 릴리즈 | Cloudflare Workers 배포 |
| `/done` | 완료, 끝, done, 마무리 | 구현 완료 후처리 |
| `/expand-todo` | 확장, 구체화 | TODO 체크리스트 2단계 확장 |
| `/ideation` | ⚠️ 명시적 호출 전용 | 신규 아이디어 발굴 |
| `/implement` | 구현해, 진행해, 시작해 | 구현 워크플로우 |
| `/next` | 뭐 할까, 다음, 시작 | 다음 작업 자동 선택 및 구현 |
| `/plan-list` | 계획 목록, 진행 현황 | 계획 문서 목록 조회 |
| `/plan` | 계획해, plan, 기획 | 계획 문서 작성 |
| `/pull-sync` | 풀 동기화, pull sync | git pull 후 동기화 |
| `/webapp-testing` | 테스트, 빌드 확인 | SvelteKit/Astro 테스트 |

---

## Agent 시스템

### v1 파이프라인 (기본, `--pipeline v1`)

| 에이전트 | 모델 | 역할 |
|----------|------|------|
| `auto-plan` | opus | plan 보완 + 구체화 (코드 수정 금지) |
| `auto-impl` | sonnet | 구현 + 빌드 확인 + 완료 처리 |

```
plan 파일 → [auto-plan] → [auto-impl] → 커밋 → 반복
```

### v2 파이프라인 (`--pipeline v2`)

| 에이전트 | 모델 | 역할 |
|----------|------|------|
| `auto-simple-plan` | opus | 상태 없는 plan에 what/why 보완 + 상태 부여 |
| `auto-expand-plan` | opus | 원자 분해 + TC 명세 (코드 수정 금지) |
| `auto-impl` | sonnet | 구현 체크박스만 처리 (테스트 금지) |
| `auto-test-unit` | sonnet | 워크트리 내 단위 테스트 전담 |
| `auto-test-e2e` | sonnet | 메인 브랜치에서 서버 기동 + HTTP/E2E 통합 테스트 |

```
plan 파일 → [simple-plan] → [expand-plan] → [impl (worktree)]
         → merge → [test-unit (worktree)] → merge → [test-e2e (main)]
         → 커밋 → 반복
```

### v2 상태 전이

```
초안 → (simple-plan) → 검토대기 → (expand-plan) → 검토완료
     → (impl) → 구현중 → (test) → 구현완료 → 아카이브
```

### 실행 방법

```powershell
# v1 (기본)
python -m plan_runner run --plan-file "common/docs/plan/{파일}.md"

# v2
python -m plan_runner run --plan-file "common/docs/plan/{파일}.md" --pipeline v2

# 옵션
python -m plan_runner run --plan-file "..." --max-cycles 5 --until 18:00
```

## 보안 설정

`settings.json`에서 에이전트별 도구 접근을 제한합니다:
- plan 에이전트: Read, Glob, Grep, Edit, Write만 허용 (Bash 금지)
- impl 에이전트: 모든 도구 허용
- test 에이전트: Read, Glob, Grep, Edit, Write, Bash 허용

## 일반 지침

- 사용 가능한 도구(`read_file`, `write_file`, `run_terminal_cmd` 등)로 코드베이스를 탐색하고 수정
- 빌드/테스트로 반드시 검증
- 간결하게, 기술적 구현에 집중
- 모든 응답은 한국어로 작성
