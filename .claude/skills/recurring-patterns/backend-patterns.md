# 백엔드 패턴 (monitor-page 전용)

## 패턴 #6 — 비동기 API (202 + 폴링)

5초 이상 걸릴 수 있는 작업은 동기 응답 대신 비동기 패턴 적용.

```
POST /search → 202 { search_id, status: "pending" }
  ↓ Redis LPUSH
Worker: RPOP → 처리 → DB result_json 저장
  ↓
GET /search/{id} → { status, result }  (클라이언트 1초 간격 폴링)
```

```python
# 요청 접수 (즉시 반환)
@router.post("/search", status_code=202)
async def search(request: SearchRequest, db: Session = Depends(get_db)):
    search_id = str(uuid.uuid4())
    db.add(FileSearchRequest(search_id=search_id, status="pending"))
    db.commit()
    await redis_queue.push({"search_id": search_id})
    return {"search_id": search_id, "status": "pending"}

# 결과 폴링
@router.get("/search/{search_id}")
async def get_result(search_id: str, db: Session = Depends(get_db)):
    req = db.query(FileSearchRequest).filter_by(search_id=search_id).first()
    return {"status": req.status, "result": req.result_json}
```

## 패턴 #7 — Session 0 제약 (Redis 큐 위임)

API 서버(NSSM, Session 0)에서 subprocess/GUI/GPU 직접 호출 금지. Redis 큐로 유저 세션 워커에 위임.

| Session 0에서 금지 | 이유 |
|-------------------|------|
| `subprocess.Popen(["code", ...])` | GUI 실행 불가 |
| `Invoke-WebRequest` (PowerShell) | 네트워크 hang |
| GPU 모델 로딩 | CUDA 초기화 실패 |
| Desktop 알림 | 세션 없음 |

```python
# ✅ Redis 큐 위임 + fallback
@router.post("/open")
async def open_file(request: OpenFileRequest):
    try:
        await open_queue.push({"file_path": request.file_path})
        return {"ok": True, "via": "redis"}
    except Exception as e:
        logger.warning(f"Redis 실패: {e}")
    service.open_file(request.file_path)  # fallback
    return {"ok": True, "via": "direct"}
```

## 패턴 #8 — 워커 에러 격리 (_safe_execute)

워커의 개별 작업 실패가 전체 워커를 중단시키면 안 된다.

```python
# ❌ 예외 전파 → 워커 사망
async def _main_loop_iteration(self):
    await self._process_queue()
    await self._check_status()

# ✅ 예외 격리 → 다음 작업 계속
async def _main_loop_iteration(self):
    await self._safe_execute("process_queue", self._process_queue)
    await self._safe_execute("check_status", self._check_status)
```

- `_safe_execute`: try/except 예외 격리, 로깅 후 계속
- 연속 에러 10회 초과 시에만 `WorkerCriticalError`
- 에러 후 점진적 백오프 (1초→최대 30초)
