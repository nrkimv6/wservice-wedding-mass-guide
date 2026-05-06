# archive-sweep: 완료된 plan 자동 아카이브

완료 상태의 plan 문서를 감지하고 자동 아카이브합니다.

## 트리거

- "아카이브 정리", "archive sweep", "plan 정리", "완료 정리"

## 실행

```powershell
# 기본 실행
& "D:\work\project\service\wtools\common\tools\archive-sweep.ps1"

# DryRun (시뮬레이션만)
& "D:\work\project\service\wtools\common\tools\archive-sweep.ps1" -DryRun

# haiku 강제 호출 (애매한 파일 LLM 판정)
& "D:\work\project\service\wtools\common\tools\archive-sweep.ps1" -ForceHaiku
```

## 동작 방식

1. **정규식 1차 필터**: plan 디렉토리 스캔 → 확실완료 / 애매 / 미완료 분류
2. **haiku LLM 2차 판정**: 애매한 파일이 2개 이상이고 전체 5개 이상일 때만 호출
3. **auto-done.ps1 호출**: 완료 판정된 파일을 아카이브 이동
4. **worktree/branch 존재 시 스킵**: plan 헤더의 `> branch:`/`> worktree:` 필드를 확인하고, 해당 branch/worktree가 실제 git에 존재하면 아카이브 대상에서 제외. 결과 요약에 "worktree/branch 존재 (스킵)" 카운트 표시.
5. **LLM Wiki ingest** (archive 이동 성공 건당): 새 archive에 대해 아래 순서로 처리
   1. 태그 추출: 파일명, 첫 H1, 본문 앞 100자를 `docs/wiki-schema.md`의 화이트리스트(`## 3. 태그 Vocabulary` 섹션)로 소문자 매칭한다. 매칭 0건이면 `untagged` 단독 부여.
   2. `POST http://localhost:8001/api/v1/plans/records/ingest`를 호출해 DB에 archive 단건을 등록한다. request body에는 `file_path`, `project`, `raw_content`를 포함한다.
   3. DB ingest 실패 시 archive 이동 자체는 성공으로 처리하고, 경고와 복구 힌트를 출력한다. 복구 경로는 단건 ingest 재시도 또는 `POST /api/v1/plans/records/import-archived`다.
   4. `docs/dev-guide/_meta.yaml`을 읽어 각 가이드의 `owns_archive_tags`와 추출 태그가 교집합이면 해당 가이드의 `<!-- AUTO:BEGIN -->` 직후에 동일 포맷 1행을 insert한다.
   5. 매칭된 가이드의 `last_archive_scan`을 오늘 날짜(ISO 8601)로 갱신한다.

## archive-sweep vs batch-done 역할 차이

| | `/archive-sweep` | `/batch-done` |
|--|--|--|
| 완료 판정 | haiku LLM 판단 | 체크박스 100% 기계적 판정 |
| 처리 범위 | **archive 이동만** | full done flow (TODO→DONE, wtools sync, commit) |
| worktree 점검 | 포함 (스킵) | 포함 (스킵) |
| 대상 파일 | `.md` (plan 원본) | `_todo.md` (작업 파일) |

## auto-next 통합

`auto-next-sequential.ps1`의 deep check (3사이클마다)에서 자동 실행됩니다.
