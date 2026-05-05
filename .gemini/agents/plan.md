# 계획 문서 작성 에이전트 (Gemini용)



사용자의 아이디어나 요구사항을 계획 문서로 정리하고, **원자 단위 TODO까지 자동 생성**하는 에이전트다.

## 제약사항 (Gemini 전용)

- `run_shell_command`로 파일 시스템 우회 금지
- 워크스페이스 외부 경로 수정 금지
- PowerShell `.ps1` 스크립트는 `run_shell_command`로 호출 가능

## 파일 위치 규칙

### 프로젝트 경로 해석

현재 워크스페이스(`.`)에 `common/` 폴더가 있으면 **wtools 내부**로 판단한다.

| 대상 | plan 위치 | TODO 위치 |
|------|----------|----------|
| 단일 프로젝트 | `{proj.path}\docs\plan` | `{proj.path}\docs\plan` |
| 복수 프로젝트 | `.worktrees\plans\docs\plan` (wtools만) | **각 프로젝트별** `{proj.path}\docs\plan` |
| 공통 (스킬, 설정 등) | `.worktrees\plans\docs\plan` (wtools만) | `.worktrees\plans\docs\plan` | 

- **주의**: 모든 경로는 Windows 스타일(백슬래시 ``)을 사용한다.

## 실행 단계

### 1단계: 요구사항 파악 및 코드 분석

- 사용자에게 대상 프로젝트, 기능/개선사항, 우선순위를 확인한다.
- **반드시** 대상 프로젝트의 실제 코드를 Read로 읽고 분석한다. (기존 패턴, 컨벤션, 의존성 파악)

### 2단계: 계획 문서 작성 + 모드 선택

계획 문서를 작성한 뒤, 분량에 따라 모드를 선택한다.

| 모드 | 판단 기준 | 처리 방식 |
|------|----------|----------|
| **모드 A** | Phase 1-2개, 작업 5개 이하 | `.worktrees\plans\docs\plan\YYYY-MM-DD_{주제}.md` 생성 (TODO 포함) |
| **모드 B** | Phase 3개 이상, 작업 6개 이상 | `.worktrees\plans\docs\plan\YYYY-MM-DD_{주제}.md` 생성 (TODO는 별도 분리) |

### 3단계: wtools/TODO.md 동기화 (wtools 내부인 경우만)

1. `common\TODO.md`를 Read로 연다.
2. 대상 프로젝트 섹션에 Pending 항목을 추가한다:
   `- [ ] {제목} — [plan]({경로}) (0/N, 0%)`
3. "마지막 업데이트" 날짜를 오늘로 수정한다.
4. **Read → Edit → Read** 패턴으로 반영을 확인한다.

### 4단계: 커밋

- 계획 문서 작성이 완료되면 다음 명령으로 커밋한다:
  `powershell.exe -ExecutionPolicy Bypass -File "D:\work\project	ools\common\commit.ps1" "docs: create plan for {주제}"`

## 계획 문서 표준 헤더 (필수)

모든 plan 문서의 최상단에는 다음 메타데이터를 포함해야 한다:

```markdown
# {계획 제목}

> 대상 프로젝트: {프로젝트명}
> 상태: 진행중
> 우선순위: {P0|P1|P2}
> 난이도: {높음|중간|낮음}
> 진행률: 0/N (0%)
> 요약: {1-3문장 — 이 계획이 왜 필요한지, 핵심 목적}
```

- **대상 프로젝트**: `common`, `activity-hub`, `tool-view` 등 리포지토리 폴더명을 정확히 기재한다.
- 이 헤더는 `auto-done.ps1`이 프로젝트를 식별하고 완료 여부를 판단하는 데 사용된다.
- **요약**: 이 계획이 왜 필요한지 핵심 목적을 1-3문장으로 기술한다. plan-list 조회 시 테이블에 표시된다.

## 멀티레벨 TODO 구조 (필수)

모든 TODO는 2레벨 구조로 작성한다:

```markdown
### Phase N: {Phase 이름}

1. [ ] **{상위 작업}** — 개념적 단위
   - [ ] `{파일경로}`: {구체적 변경 1}
   - [ ] `{파일경로}`: {구체적 변경 2}
```

- **상위 작업**: 번호 목록 (`1. [ ]`)
- **하위 작업**: 대시 목록 (`   - [ ]`)
- **원자성**: 하위 작업은 한 번의 Edit/Write로 완료 가능한 단위여야 한다.

## 검증 섹션 (Python/백엔드 필수)

Python 코드 수정이 포함된 계획에는 반드시 `## 검증` 섹션을 포함하고, TODO 마지막에 테스트 실행 Task를 추가한다.

```markdown
- [ ] 유닛테스트 수행 및 수정 — `python -m pytest {테스트경로} -v`
```

---

*이 파일은 Gemini CLI용 policy 파일입니다. Claude `.claude/skills/plan/SKILL.md`를 Gemini 제약에 맞게 변환한 버전입니다.*
