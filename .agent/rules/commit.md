# 커밋 규칙

## 금지

- `git commit -m "..."` 등 **git commit 명령어 직접 사용 절대 금지**

## 허용 방법

커밋 시에는 다음 우선순위에 따라 스크립트를 사용하여 커밋해야 합니다:
1. `commit.ps1`: `& "D:\work\project\tools\common\commit.ps1" "커밋 메시지"`
2. `bash commit.sh`: `bash "D:\work\project\tools\common\commit.sh" "커밋 메시지"`
3. 자체 내장 `commit.sh` 활용 (`.claude/skills/commit/commit.sh` 등)
4. 모든 스크립트 실행이 불가능하거나 실패할 경우 **직접 커밋하지 말고 사용자에게 상황 보고** 후 대기합니다.

## 메시지 규칙 (Conventional Commits)

| Prefix | 대상 | 버전 Bump 등 |
|--------|------|--------------|
| `feat:` | 새로운 기능 추가 | minor bump |
| `fix:` | 버그 수정 | patch bump |
| `feat!:` 또는 BREAKING | 호환성 파괴 | major bump |
| `docs:` | 문서 내용 수정 | 연동 없음 |
| `refactor:` | 성능 개선/코드 리팩토링 | 연동 없음 |
| `chore:` | 도구 설정, 패키지 환경 | 연동 없음 |
| `test:` | 테스트 코드 | 연동 없음 |
