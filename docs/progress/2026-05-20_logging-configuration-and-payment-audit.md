# Logging Configuration & Payment Audit — 2026-05-20

## 1. 세션 요구사항 (Requirements)
* 애플리케이션 로그의 **일일 단위 백업(Rolling) 및 파일 저장** 구성.
* 현재 백엔드 서버에서 로그가 파일로 기록되고 있는지 여부 진단.
* **결제 및 주문 데이터** 관련 로그가 보안 요건(마스킹)을 준수하며 상세하게 기록되고 있는지 진단 및 정밀 분석.

---

## 2. 작업 내용 (Implementation Details)
### 2-1. 로그 파일 기록 및 일일 백업 구성
* `logback-spring.xml` 파일을 새롭게 구성하여, 기본 콘솔 출력 외에도 `/logs` 디렉토리에 실시간으로 로그를 파일로 기록하도록 구축했습니다.
* **일일 백업 (Rolling Policy)**: `SizeAndTimeBasedRollingPolicy`를 적용하여 매일 자정 로그 파일을 `logs/backup/app.YYYY-MM-DD.i.log` 형태로 백업하도록 설정했습니다.
* **로그 파일 관리**: 개별 로그 파일 크기는 최대 `10MB`, 로그 보관 기간은 `30일`, 전체 보관 용량 상한선은 `3GB`로 지정하여 무제한 용량 증가로 인한 서버 디스크 풀(Full) 장애를 예방했습니다.

### 2-2. 결제 및 주문 로그 정밀 검증
* `PaymentService.java` 및 `PendingPaymentCleanupScheduler.java` 소스코드를 진단하여, 결제 관련 라이프사이클의 핵심 지점마다 상세히 로그가 기록되고 있음을 검증했습니다.
* **결제 시도 시작**: `[PAYMENT] Attempting payment — email={masked} options={ids} method={method}`
* **중복 결제 차단**: `[PAYMENT] Duplicate payment blocked — email={masked}`
* **PG 연동 유효성**: `[PAYMENT] PG replycode invalid`, `[PAYMENT] PG verification passed`, `[PAYMENT] PG verify API non-200` 및 통신 예외 완벽 로깅.
* **성공 처리**: `[PAYMENT] Payment completed — email={masked} regNo={regNo} amount={amount}`
* **스케줄러 정리**: `[CLEANUP] PENDING → FAILED — id={id} regNo={regNo}` 및 카운트 정리 로깅.
* **보안 준수**: `maskEmail` 헬퍼 메소드를 사용해 로그상 이메일 앞글자를 제외한 문자열을 마스킹(`k***@test.com`) 처리함으로써, 네트워크 감사의 보안 무결성을 보장하고 있습니다.

---

## 3. 변경 파일 목록 (Modified Files)
* [NEW] [logback-spring.xml](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/resources/logback-spring.xml) — 하루 단위 롤링, 파일 보관 기한, 결제 로그 레벨 구성 파일.

---

## 4. 향후 과제 (Next Steps)
1. **GitHub Push & AWS 자동 배포**: 로컬 커밋 이후 `main` push를 진행해 Lightsail 배포 스크립트를 기동합니다.
2. **서버 로그 경로 검증**: Lightsail 서버 내 `/opt/kssc2026/logs/`에 정상적으로 `app.log`가 생성되는지 실시간 체크합니다.
