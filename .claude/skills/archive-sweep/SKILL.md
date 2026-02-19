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

## auto-next 통합

`auto-next-sequential.ps1`의 deep check (3사이클마다)에서 자동 실행됩니다.
