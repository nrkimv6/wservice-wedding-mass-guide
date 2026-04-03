# Main Drift Gate Reference

## 목적

`/expand-todo` 수행 전에 main 브랜치 드리프트를 하이브리드 방식으로 점검하기 위한 판정표다.

## 입력 우선순위

1. `기준커밋` (최우선)
2. `작성일시` 기반 git log (fallback)
3. 둘 다 없으면 보수적 fallback + `영향 없음` 근거 기록

## 판정 절차

1. archive/history 문서에서 의도·배경을 파악한다. (판정 보조)
2. `git diff --name-only {기준커밋}..main`으로 변경 파일을 확정한다.
3. fallback 시 `git log --name-only --since="{작성일시}" main`을 사용한다.
4. `rg`로 키워드 교차 검증을 수행한다.
5. 교집합이 없어도 수정 대상 파일별 `git diff`를 확인한다.

## strict 모드

다음 조건 중 하나면 strict 모드로 승격:

- fix plan
- 공통 모듈/API/DB 경로 변경
- 영향 범위가 큰 변경

strict 모드에서는 `전수 검색(rg) -> 선별 Read` 순서를 강제한다.

## 출력 계약

- 결과 반영 위치: `추가 TODO` 또는 `기술적 고려사항`만 허용
- `영향 없음`은 반드시 근거(검사 범위 + diff/log 결과)와 함께 기록
- 분기 라벨:
  - `archive-only`: 문서 stale 후보
  - `git-only`: 누락 고위험 후보
