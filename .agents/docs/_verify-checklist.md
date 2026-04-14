# Plan 정합성 검증 체크리스트

> 이 문서는 auto-verify 에이전트와 /plan·/expand-todo 스킬이 공통으로 참조하는 검증 항목이다.

---

## V1. 경로 존재 검증

plan에 명시된 **모든 파일 경로**에 대해 실제 존재를 확인한다.

**절차:**
1. plan에서 백틱(`` ` ``)으로 감싸진 파일 경로를 모두 추출
2. `디렉터리 경로 + 생성 파일명` 표기(`common\docs\history\`: `foo.md` 형태)는 신규 생성 예정 경로로 인식한다.
3. 기존 파일 경로는 Glob 또는 Read로 존재 확인
4. 신규 생성 예정 경로는 상위 디렉터리 존재 확인 + 파일명 명시 여부를 확인
5. 존재하지 않는 기존 경로 또는 파일명 누락된 생성 표기 → 🔴 RED

**예시:**
- plan에 `` `app/modules/foo/service.py` ``가 있는데 실제 경로가 `app/modules/foo/services.py` → RED

---

## V2. 참조 전수 조사

plan이 변경하려는 **함수/변수/Redis키/상수**를 Grep으로 검색하여, plan이 모든 참조 파일을 커버하는지 확인한다.

**절차:**
1. plan의 변경 대상 식별자 목록 추출 (함수명, 변수명, Redis 키 패턴 등)
2. 각 식별자에 대해 Grep으로 프로젝트 전체 검색
3. Grep 결과 중 plan이 언급하지 않은 파일 → 🔴 RED (누락된 참조)

**예시:**
- plan이 `acquire_merge_lock()` 함수를 변경하는데, `_dr_process_utils.py`에서도 호출하지만 plan에 누락 → RED

---

## V3. 시그니처 정합성

plan이 서술한 **함수 파라미터, 반환값, 클래스 필드**가 실제 코드와 일치하는지 확인한다.

**절차:**
1. plan에서 함수 시그니처/파라미터 서술을 추출
2. 실제 코드를 Read로 읽어 비교
3. 불일치 → 🔴 RED

**예시:**
- plan이 `def foo(a, b)` 라 했는데 실제는 `def foo(a, b, timeout=30)` → RED
- plan이 "반환값: bool" 이라 했는데 실제는 `Optional[str]` → RED

---

## V4. 설계 결함 탐색

plan의 변경이 도입할 수 있는 **구조적 결함**을 검토한다.

**검토 항목:**
- **동시성**: lock/race condition — 여러 프로세스가 동시에 접근하는 자원에 방어가 있는가
- **에러 경로**: exception/finally 블록에서 자원 정리가 누락되지 않았는가
- **TTL/만료**: Redis 키에 적절한 TTL이 설정되는가, 만료 시 동작이 정의되었는가
- **원자성**: 다단계 연산이 중간에 실패할 때 일관성이 유지되는가

**결과:**
- 명확한 결함 → 🟡 YELLOW
- 잠재적 위험 (특정 조건에서만 발생) → 🟡 YELLOW
- 방어가 있지만 문서화 부족 → 🟢 GREEN

---

## V5. 테스트 패치 패턴

plan이 변경하는 모듈/함수를 **기존 테스트에서 mock/patch하는 패턴**과 대조한다.

**절차:**
1. plan의 변경 대상 모듈/함수를 Grep으로 테스트 디렉토리에서 검색
2. `patch("모듈.함수")`, `patch.object(모듈, "함수")`, `sys.modules["모듈"]` 패턴 확인
3. plan의 변경(이름 변경, 모듈 이동 등)이 이 패치를 깨뜨리는지 판단
4. 깨뜨리는데 plan에 테스트 수정 항목이 없음 → 🔴 RED

**예시:**
- plan이 `merge_lock.py`를 `merge_queue.py`로 교체하는데, 16개 테스트 파일에서 `patch("merge_lock.xxx")` 사용 → plan에 테스트 패치 수정 항목 필요

---

## V6. 문서 메타 정합성

plan 문서 자체의 **구조적 오류**를 검토한다.

**검토 항목:**
- **번호 충돌**: 상위 항목 번호가 중복되지 않는가
- **중복 항목**: 동일한 작업이 다른 Phase에 중복 기재되지 않았는가
- **Phase 누락**: 구현 Phase와 테스트 Phase 사이에 빠진 단계가 없는가
- **경로 교차 검증**: 프론트엔드 경로(`frontend/src/...`)와 백엔드 경로(`app/...`)가 뒤섞이지 않았는가
- **진행률 정합성**: 체크박스 개수와 헤더/푸터의 진행률이 일치하는가
- **Phase R 존재 (fix: plan 전용)**: 파일명 `_fix-`/`_fix_` 또는 제목 `fix:`인 plan에 `### Phase R` 또는 `재발 경로 분석` 문자열이 있는가
- **Phase R 완전성 (fix: plan 전용)**: Phase R 섹션 내 `미방어` 문자열이 잔존하는가

**결과:**
- 번호 충돌, 중복 → 🟢 GREEN
- Phase 누락 → 🟡 YELLOW
- 진행률 불일치 → 🟢 GREEN
- Phase R 미존재 (fix: plan) → 🔴 RED (INCONSISTENT 판정)
- Phase R 내 미방어 경로 잔존 → 🔴 RED (INCONSISTENT 판정)


---

## V2-S. 보안 패턴 전파

CLAUDE.md에 보안 패턴 레지스트리가 있을 때, plan이 새로 추가/수정하는 코드에 해당 패턴이 적용되어야 하는지 확인한다.

**절차:**
1. CLAUDE.md에서 보안 패턴 레지스트리(예: `subprocess.run` safe.directory 요구 등) 확인
2. plan의 변경 대상 코드에 동일 계열 패턴(새 subprocess 호출, 외부 명령 실행 등)이 추가/수정되는지 확인
3. 보안 패턴 레지스트리의 패턴이 적용되지 않은 파일이 있으면 → 🔴 RED (plan에 해당 작업 추가)

**예시:**
- plan이 새 `subprocess.run(["git", "..."])` 호출을 추가하는데 `safe.directory` 설정 없음 → RED
- CLAUDE.md에 보안 패턴 레지스트리가 없으면 → 해당 없음 (GREEN)

**결과:**
- 미적용 패턴 발견 → 🔴 RED
- 모두 적용됨 또는 레지스트리 없음 → 🟢 GREEN
