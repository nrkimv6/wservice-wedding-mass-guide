# Supabase Migration Skill

Supabase 데이터베이스에 SQL 마이그레이션을 실행합니다.

---

## Trigger

- "마이그레이션 실행", "migration 실행", "supabase migration"
- "DB 마이그레이션", "SQL 실행"
- "테이블 생성", "스키마 업데이트"

---

## 사용법

### 최신 마이그레이션 실행

```bash
python scripts/common/run-supabase-migration.py <project>
```

### 특정 마이그레이션 실행

```bash
python scripts/common/run-supabase-migration.py <project> <sql-file>
```

### 마이그레이션 목록 확인

```bash
python scripts/common/run-supabase-migration.py --list
python scripts/common/run-supabase-migration.py --list <project>
```

---

## 예시

```bash
# memo-alarm의 최신 마이그레이션 실행
python scripts/common/run-supabase-migration.py memo-alarm

# 특정 마이그레이션 실행
python scripts/common/run-supabase-migration.py memo-alarm 003_supabase_auth_sync

# 전체 경로로 실행
python scripts/common/run-supabase-migration.py memo-alarm data/migrations/003_supabase_auth_sync.sql

# 프로젝트 목록 확인
python scripts/common/run-supabase-migration.py --list

# memo-alarm 마이그레이션 목록 확인
python scripts/common/run-supabase-migration.py --list memo-alarm
```

---

## 지원 프로젝트

Supabase를 사용하는 프로젝트:
- `memo-alarm` - 메모 알람 앱
- `line-minder` - 회선 관리 앱
- `sacred-hours` - 기도 알람 앱

---

## 마이그레이션 파일 위치

각 프로젝트의 마이그레이션 파일은 다음 경로에 있습니다:

```
{project}/data/migrations/*.sql
```

---

## 연결 정보

스크립트에 하드코딩되어 있습니다:
- Host: `aws-1-ap-northeast-1.pooler.supabase.com`
- Port: `6543` (Transaction Pooler)
- User: `postgres.qxiuqztinabmdhclxsuz`

비밀번호 변경 시 `scripts/common/run-supabase-migration.py` 파일 수정 필요.

---

## 주의사항

1. **psycopg2 필요**: `pip install psycopg2-binary`
2. **이미 실행된 마이그레이션**: DDL 중복 에러 발생 가능 (정상)
3. **롤백 미지원**: 실패 시 수동 복구 필요

---

## 트러블슈팅

### psycopg2 미설치
```bash
pip install psycopg2-binary
```

### 비밀번호 인증 실패
Supabase Dashboard → Project Settings → Database에서 비밀번호 확인/리셋

### DDL 중복 에러
이미 실행된 마이그레이션입니다. 무시해도 됩니다.
