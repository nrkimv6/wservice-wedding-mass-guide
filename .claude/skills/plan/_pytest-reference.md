# pytest TC 카테고리 레퍼런스

> auto-plan이 TC 보충 시 Read하는 상세 참조 문서.
> plan/expand-todo 스킬에서 직접 로드하지 않음 — 필요 시만 참조.

## RIGHT-BICEP 카테고리

| 약어 | 의미 | TC 내용 | 예시 |
|------|------|---------|------|
| **R** | Right (정상) | 정상 입력 → 기대 출력 | `test_parse_valid_json()` |
| **B** | Boundary (경계) | 빈값, 0, 최대값, off-by-one | `test_parse_empty_string()` |
| **I** | Inverse (역) | 역연산/역조건 검증 | `test_encode_then_decode_roundtrip()` |
| **C** | Cross-check (교차) | 다른 수단으로 같은 결과 확인 | `test_count_matches_len()` |
| **E** | Error (에러) | 예외, 잘못된 입력, 타임아웃 | `test_parse_invalid_raises()` |
| **P** | Performance (성능) | 대량 데이터, 응답 시간 | `test_bulk_insert_under_5s()` |

**필수**: R, B, E — 모든 함수에 항상 포함
**선택**: I, C, P — 해당 시만

## CORRECT 카테고리

| 약어 | 의미 | TC 내용 | 예시 |
|------|------|---------|------|
| **Co** | Conformance (준수) | 포맷, 스키마, 프로토콜 | `test_output_matches_schema()` |
| **O** | Ordering (순서) | 정렬, 순서 의존 로직 | `test_tasks_sorted_by_priority()` |
| **R** | Range (범위) | 숫자 범위, 문자열 길이 | `test_priority_range_0_to_3()` |
| **Re** | Reference (참조) | 외부 의존성, 참조 무결성 | `test_fk_points_to_existing_record()` |
| **E** | Existence (존재) | null, None, 빈 컬렉션 | `test_none_input_returns_default()` |
| **Ca** | Cardinality (기수) | 0개, 1개, N개 | `test_empty_list_vs_single_vs_many()` |
| **T** | Time (시간) | 타임아웃, 동시성 | `test_timeout_after_30s()` |

**선택**: 모두 해당 시만 — 관련 없는 카테고리는 스킵

## TC 체크박스 형식

```
- ☐ `test_{함수명}_{카테고리}_{설명}()` — {카테고리}: {검증 내용}
```

## 모범 사례

`common/docs/plan/2026-02-26_plan-runner-quota-stop_todo.md` Phase 4-6:
- Phase 4: 함수별 RIGHT-BICEP/CORRECT TC 개별 체크박스
- Phase 5: E2E mock subprocess 통합 테스트
- Phase 6: 검증 (실행 + 회귀 + 수동)
