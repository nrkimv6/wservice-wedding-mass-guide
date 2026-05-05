# 계획 문서 목록 조회 (Gemini)



공통 plan root는 `PLAN_ROOT -> .worktrees/plans/docs/plan -> docs/plan`
우선순위로 해석하고, 각 프로젝트의 `docs/plan/`과 함께 진행 현황을 보여줍니다.

## 제약사항 (Gemini 전용)

- PowerShell 명령어 사용 금지
- 표준 도구만 사용: Read, Glob, Grep
- `.claude/projects.json` 경로는 Read 도구로 직접 읽기

## 실행 단계

### 1단계: plan 문서 스캔

**스캔 대상:**

1. **공통 계획**: 아래 순서로 첫 번째로 존재하는 root만 스캔
   - `.worktrees/plans/docs/plan/*.md`
   - `docs/plan/*.md`
2. **프로젝트별 계획**: `.claude/projects.json` 읽기 → 각 `{proj.path}/docs/plan/*.md` 스캔

**projects.json 읽기 예시:**
```
Read(".claude/projects.json")  → JSON 파싱 → 각 프로젝트 경로 추출
```

모든 plan 문서에서 다음 헤더 정보를 추출 (Read 도구로 파일 읽기):
- 제목 (첫 번째 `#` 헤더)
- 대상 프로젝트 (`> 프로젝트:` 또는 `> project:`)
- 상태 (`> 상태:` 필드)
- 진행률 (`> 진행률:` 또는 `N/M` 패턴)
- 요약 (`> 요약:` 필드, 없으면 빈칸)

### 2단계: 요약 테이블 출력

```markdown
## 현재 계획 현황

| 문서 | 요약 | 프로젝트 | 상태 | 진행률 |
|------|------|----------|------|--------|
| dark-mode | 전체 앱에 다크모드 토글 추가 | 공통 | 구현중 | 2/5 (40%) |
| calendar-export | 활동 데이터를 ics 파일로 내보내기 | activity-hub | 초안 | 0/3 (0%) |

총 N개 계획 (초안: A, 검토대기: B, 검토완료: C, 구현중: D, 구현완료: E, 수정필요: F, 보류: G)
```

### 3단계: 프로젝트별 필터 (선택)

사용자가 특정 프로젝트를 지정하면 해당 프로젝트 plan만 필터링.

### 4단계: 빈 목록 처리

plan 문서가 없으면:
```
현재 진행 중인 계획이 없습니다.
```

## 도구 사용 방법

```
# projects.json 읽기
Read("D:/work/project/service/wtools/.claude/projects.json")

# 공통 plan 스캔 (우선순위 순서대로 첫 존재 root 사용)
Glob(".worktrees/plans/docs/plan/*.md")
Glob("docs/plan/*.md")

# 프로젝트별 plan 스캔 (각 프로젝트 경로마다)
Glob("{proj_path}/docs/plan/*.md")

# 각 파일의 헤더 정보 추출
Grep("> 상태:", path=".worktrees/plans/docs/plan/")
Grep("> 상태:", path="docs/plan/")
```

## 금지사항

- PowerShell, Bash 명령어 사용 금지
- 파일 수정 금지 (Read/Glob/Grep만 허용)
