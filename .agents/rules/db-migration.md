---
paths:
  - "app/migrations/**"
  - "app/models/**"
  - "*/migrations/**"
  - "*/models/**"
---

# DB 마이그레이션 규칙

## 🔴 마이그레이션 SQL 파일 생성 시 즉시 실행 필수

마이그레이션 SQL 파일을 생성했다면 **커밋 전 즉시 실행**해야 한다.
미실행 상태로 커밋하면 API 장애 발생.

### SQLite 실행 명령 (프로젝트 루트 기준)

```powershell
python -c "import sqlite3; conn = sqlite3.connect('{project_root}/data/monitor.db'); sql = open('{project_root}/app/migrations/XXX.sql', 'r', encoding='utf-8').read(); conn.executescript(sql); conn.commit(); conn.close(); print('Done')"
```

> `{project_root}`를 실제 프로젝트 절대경로로 교체할 것.
> 예: `D:/work/project/tools/monitor-page`

### 실행 확인 체크리스트

- SQL 파일 생성 후 위 명령으로 즉시 실행
- 실행 성공(`Done` 출력) 확인 후 커밋
- 구현 완료 후 `app/REQUIREMENTS.md` 업데이트
