---
name: done
description: "구현 완료 후처리 (plan 체크, archive, TODO→DONE, commit). Use when: 완료, 끝, done, 마무리, 완료처리"
---

# 구현 완료 후처리

구현 완료 후 문서 정리와 커밋을 자동으로 처리합니다.

## 트리거

- "완료", "끝", "done", "마무리"
- 구현이 끝났을 때

## 실행 단계

### 1단계: 관련 plan 문서 찾기

`common/docs/plan/`에서 현재 작업과 관련된 계획 문서를 찾습니다.

```
common/docs/plan/*.md
```

### 2단계: plan 문서 완료 체크 & 진행률 업데이트

**구현 순서 섹션의 항목 체크:**
```markdown
## 구현 순서

1. [x] P0: 완료된 항목   ← [ ] → [x] 변경
2. [ ] P1: 미완료 항목
```

**진행률 계산 후 헤더·푸터 업데이트:**
```markdown
> 상태: 진행 중
> 진행률: 1/2 (50%)       ← [x] 개수 / 전체 개수
...
*상태: 진행 중 | 진행률: 1/2 (50%)*
```

**모든 항목 완료 시 상태 변경:**
```markdown
> 상태: 완료
> 진행률: 2/2 (100%)
...
*상태: 완료 | 진행률: 2/2 (100%)*
```

### 3단계: plan 문서 아카이브 (모든 항목 완료 시)

plan 문서의 모든 체크박스가 `[x]`이면:

1. **프로젝트 특정 plan**: `common/docs/plan/{파일}.md` → `{project}/docs/archive/{파일}.md`
2. **공통/복수 프로젝트 plan**: `common/docs/plan/{파일}.md` → `common/docs/archive/{파일}.md`
3. 아카이브 헤더 추가:

```markdown
# {제목}

> 완료일: YYYY-MM-DD
> 아카이브됨
> 진행률: N/N (100%)
```

### 4단계: TODO → DONE 이동

**대상 프로젝트의 TODO.md 확인:**
```
{project}/TODO.md
```

**완료된 항목을 docs/DONE.md로 이동:**

TODO.md에서:
```markdown
## In Progress
- [ ] 캘린더 내보내기   ← 제거
```

docs/DONE.md 상단에 추가:
```markdown
# DONE

- [x] 2026-01-08: 캘린더 내보내기
```

### 5단계: 커밋

**🚨 CRITICAL: 반드시 PowerShell commit 함수 사용**

변경된 파일들을 커밋:
```powershell
# ✅ CORRECT
commit "docs: update plan and done"
commit "feat: {기능명}"

# ❌ WRONG - 절대 사용 금지!
git commit -m "..."
```

**강제 체크:**
- [ ] `git commit` 명령어를 사용하려고 하는가? → 즉시 중단
- [ ] `commit "message"` 사용했는가? → 진행

## 체크리스트

실행 전 확인사항:

- [ ] 구현 코드가 완료되었는가?
- [ ] 테스트가 통과했는가?
- [ ] 빌드가 성공했는가?

실행 후 확인사항:

- [ ] plan 문서 항목 체크됨
- [ ] 완료된 plan은 archive로 이동됨
- [ ] TODO.md에서 항목 제거됨
- [ ] DONE.md에 항목 추가됨
- [ ] 커밋 완료

## 파일 경로 규칙

| 문서 | 경로 |
|------|------|
| 계획 문서 | `common/docs/plan/*.md` |
| 아카이브 (프로젝트별) | `{project}/docs/archive/*.md` |
| 아카이브 (공통) | `common/docs/archive/*.md` |
| 프로젝트 TODO | `{project}/TODO.md` |
| 프로젝트 DONE | `{project}/docs/DONE.md` |

## 환경

- **Windows**: 백슬래시(`\`), 절대경로, PowerShell 전용
- **커밋**: `commit "message"` **필수** (git commit 명령어 절대 사용 금지)

## 🚨 절대 금지 명령어

```bash
# ❌ FORBIDDEN
git commit
git commit -m "..."
git commit -am "..."
git commit --amend

# ✅ REQUIRED
commit "message"
```
