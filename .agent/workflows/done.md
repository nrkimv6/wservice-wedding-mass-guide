---
description: "구현 완료 후처리 (plan 체크, archive, TODO→DONE, commit). Use when: 완료, 끝, done, 마무리"
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

### 2단계: plan 문서 완료 체크

**구현 순서 섹션의 항목 체크:**
```markdown
## 구현 순서

1. [x] P0: 완료된 항목   ← [ ] → [x] 변경
2. [ ] P1: 미완료 항목
```

**모든 항목 완료 시 상태 변경:**
```markdown
*상태: 완료*
```

### 3단계: plan 문서 아카이브 (모든 항목 완료 시)

plan 문서의 모든 체크박스가 `[x]`이면:

1. `common/docs/plan/{파일}.md` → `common/docs/archive/{파일}.md` 이동
2. 아카이브 헤더 추가:

```markdown
# {제목}

> 완료일: YYYY-MM-DD
> 아카이브됨
```

### 4단계: MANUAL_TASKS 분리

수동 작업 요소가 포함된 경우:
- **수동 작업 키워드 목록:** 브라우저, UI, 디자인, 테스트, 로컬 확인, 기기 확인, QA 등 16개 한국어 + manual, test, ui, browser 등 8개 영어 키워드 감지
- 해당 작업은 `MANUAL_TASKS.md` 파일을 생성 또는 갱신하여 기록하고, 기존 plan에는 `(→ MANUAL_TASKS)` 태그를 표기합니다.

### 5단계: DONE.md 아카이브

**대상 프로젝트의 TODO.md 확인 및 완료 항목 이동:**
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

**DONE 문서 아카이브 처리:**
DONE 문서 내 완료 항목이 10개를 초과할 경우 `docs/archive/DONE-YYYY-MM.md`로 이동하고, 최근 내용은 5개만 남기도록 유지합니다.

### 6단계: wtools/TODO.md 동기화

작업 대상이 `common/` 폴더 등 공통 영역인 경우 wtools 감지 조건에 따라 적용됩니다:
1. 루트 경로의 `wtools/TODO.md` 해당 프로젝트 섹션을 갱신합니다.
2. 전체 진행률(%) 또는 진척도를 업데이트합니다.

### 7단계: 완료 검증

작업 후 다음 4곳의 파일에서 정확히 반영되었는지 누락 검증을 진행합니다:
1. plan 위치 (완료 시 아카이브 여부)
2. TODO.md (완료 항목 제거 여부)
3. DONE.md (완료 항목 등록 여부)
4. wtools/TODO.md (전체 진척도 갱신 확인)

누락 시 되돌아가서 처리합니다.

### 7.5단계: version-bump 판단

코드 병합 특성에 따라 버전을 결정합니다.
- `feat:` -> minor
- `fix:` -> patch
- `feat!:` -> major
필요 시 `version-bump.ps1`을 실행하고 `CHANGELOG.md` 추가 후 `git tag`로 버전을 명시합니다.

### 8단계: 커밋

변경된 파일들을 커밋:
```powershell
commit "docs: update plan and done"
```

또는 구현 코드와 함께:
```powershell
commit "feat: {기능명}"
```

## 대안: auto-done.ps1

plan-runner 스크립트를 주기적으로 실행하는 환경에서는 `auto-done.ps1`을 활용하여 이러한 문서 정리 작업을 자동으로 대행할 수 있습니다.

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
| 아카이브 | `common/docs/archive/*.md` |
| 프로젝트 TODO | `{project}/TODO.md` |
| 프로젝트 DONE | `{project}/docs/DONE.md` |

## 주의사항

- 구현 완료 후에만 실행
- `commit "message"` 사용 (git commit 직접 사용 금지)
