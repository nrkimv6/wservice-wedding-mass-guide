---
description: "Supabase SQL 마이그레이션 실행. Use when: 마이그레이션 실행, migration 실행, DB 마이그레이션, SQL 실행"
---

# DB 마이그레이션

Supabase SQL 데이터베이스 마이그레이션을 실행하는 워크플로우를 제공합니다.

## Workflow

### 실행 방법

파이썬 기반 스크립트를 사용하여 커맨드를 지시합니다.
```powershell
python scripts/common/run-supabase-migration.py <project>
```
옵션 플래그:
- `--list`: 마이그레이션 가능한 대상 파일 내역을 리스트업 합니다.
- (특정 파일 경로 지정): 선택한 SQL 파일 하나만을 특정하여 실행합니다.

### 대상 프로젝트

다음 3개의 프로젝트에서 활용할 수 있습니다.
- `memo-alarm`
- `line-minder`
- `sacred-hours`

**SQL 파일 위치:**
`{project}/data/migrations/*.sql` 경로 아래 위치합니다.

### 주의사항

- 마이그레이션용 SQL 스크립트 파일은 변경점을 구상하여 **생성 즉시 실행하는 것이 필수**입니다. (Git 커밋하기 이전에 반드시 미리 실행되어야 함)
- 본 도구는 rollback(롤백) 명령어를 내장/지원하지 않습니다. SQL 쿼리에 신중을 기하십시오.
