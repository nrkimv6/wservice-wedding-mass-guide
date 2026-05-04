# TODO 확장 에이전트 (Gemini용)

<!-- script-contract-invariant -->
## Script Contract Invariant

For deterministic status, grep, candidate, preflight, or cleanup steps, call the shared helper CLI and consume its JSON evidence instead of restating a long procedure inline. Relevant helpers are `common\tools\auto-done.ps1 -Json`, `common\tools\archive-sweep.ps1 -CandidatesOnly -Json`, `common\tools\plan-advisory-detect.ps1 -Json`, `common\tools\audit-patterns.ps1 -Json`, `common\tools\merge-test-preflight.ps1 -Json`, and `common\tools\merge-test-cleanup.ps1 -Json`. The agent still owns interpretation, final action choice, and any mutation approval.

계획 문서의 빈약한 체크리스트를 **2레벨 원자 작업**으로 구체화하는 에이전트다.

## 제약사항 (Gemini 전용)

- `run_shell_command`로 파일 시스템 우회 금지
- 워크스페이스 외부 경로 수정 금지
- Task(Explore) 등 병렬 도구가 없으므로 **순차적으로** 파일을 읽어 조사한다.
- **실행 환경: Windows + PowerShell**. bash 전용 명령(`xargs`, `find`, `grep -r`) 사용 금지. 파일 탐색은 `read_file`, `list_directory`, `search_files` 내장 도구 우선 사용

## 확장 규칙

### 1. 2레벨 구조 (필수)

모든 TODO는 반드시 아래 2레벨 구조로 변환한다. **마크다운 체크박스(`- [ ]`)**를 사용하며, 유니코드(`☐`)는 코드블럭 내 예시에서만 사용한다.

```markdown
### Phase N: {Phase 이름}

1. [ ] **{상위 작업}** — 개념적 단위
   - [ ] `{파일경로}`: {구체적 변경 1}
   - [ ] `{파일경로}`: {구체적 변경 2}
```

- **상위 작업**: 번호 목록 (`1. [ ]`)
- **하위 작업**: 대시 목록 (`   - [ ]`)

### 2. 하위 작업(원자 작업) 작성 원칙

1. **파일 경로 필수**: 수정할 파일의 경로를 반드시 포함한다.
2. **구체적 명세**:
   - 새 함수 작성 시: `함수명(파라미터) → 반환값` + 핵심 로직 요약
   - 기존 함수 수정 시: 함수명 + 변경할 부분 + before/after 요약
3. **한 줄 한 동작**: 하나의 하위 작업은 하나의 Edit 또는 Write로 완료 가능한 단위여야 한다.

### 3. 코드베이스 분석 지침

- **추측 금지**: 반드시 Read 도구로 대상 파일의 실제 코드를 읽고 분석한다.
- **의존성 파악**: 수정 대상과 연결된 다른 파일들도 순차적으로 읽어 영향 범위를 파악한다.

## 체크박스 유니코드 사용 규칙 (중요)

- **작업 항목**: 반드시 `- [ ]` 또는 `- [x]`를 사용한다. (파싱 호환성)
- **코드블럭 내 예시**: 코드블럭(` ``` `)이나 인라인 코드(`` ` ``) 내에서 체크박스 패턴을 보여줄 때는 **유니코드**를 사용하여 파싱 오류를 방지한다.
  - 미완료 예시: `- ☐` (U+2610)
  - 완료 예시: `- ☑` (U+2611)

## 실행 단계

1. **계획 문서 로드**: 대상 plan 파일을 Read로 읽는다.
2. **main 드리프트 게이트 점검**:
   - `기준커밋`이 있으면 `git diff --name-only {기준커밋}..main`으로 변경 파일을 수집한다.
   - `기준커밋`이 없으면 `작성일시` 기반 `git log --since`를 fallback으로 사용한다.
   - 둘 다 없으면 최근 main 변경을 탐색하고 `영향 없음` 근거를 남긴다.
   - archive/history 문서는 의도 해석에만 사용하고, 최종 판정은 git 결과로 확정한다.
   - 교집합이 없어도 수정 대상 파일별 `git diff`를 확인한다.
3. **순차 코드 분석**: 체크리스트의 각 항목과 관련된 파일들을 순차적으로 Read 하여 구체적인 변경 지점을 찾는다.
4. **strict 조건 판정**:
   - `fix`, 공통 모듈/API/DB, 대규모 변경이면 strict 모드로 승격한다.
   - strict 모드에서는 `전수 검색(rg) -> 선별 Read`를 강제한다.
5. **2레벨 확장**: 분석 내용을 바탕으로 기존 체크리스트를 2레벨 구조로 변환한다.
6. **문서 업데이트**: Edit 도구를 사용하여 plan 문서의 체크리스트 섹션을 교체한다.
7. **결과 요약**:
   - 드리프트 결과는 `추가 TODO` 또는 `기술적 고려사항`으로만 반영한다.
   - `archive-only`/`git-only` 분기 결과와 근거를 함께 기록한다.

---

*이 파일은 Gemini CLI용 policy 파일입니다. Claude `.claude/skills/expand-todo/SKILL.md`를 Gemini 제약에 맞게 변환한 버전입니다.*
