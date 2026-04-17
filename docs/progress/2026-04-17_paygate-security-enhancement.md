# 2026-04-17 — PayGate 결제 시스템 운영 강화

## 작업 브랜치

`main` (직접 배포)

---

## 세션 요구사항

PayGate 결제 시스템의 보안·안정성·관찰 가능성·운영 인프라를 전반적으로 강화.  
PayGate API PDF 문서(`docs/payment/api_kr.pdf`) 기반으로 Cancel API 직접 연동.

---

## 구현 결과

### Phase 1 — 보안·핵심

| 파일 | 내용 |
|------|------|
| `PaymentService.java` | PG 응답 본문 파싱, 중복 결제 차단, Logger 추가, PENDING 취소 qty 버그 수정, 등록번호 prefix `KSSC-2026-` → `IABSE-2026-` |
| `ErrorCode.java` | `PAYMENT_ALREADY_EXISTS`, `PAYGATE_BODY_INVALID`, `PAYMENT_AMOUNT_MISMATCH` 추가 |
| `PaymentRepository.java` | `existsByUserAndStatus`, `findByStatusAndCreatedAtBefore`, `findAllWithOptions` 추가 |
| `PaymentFailureRequest.java` | [신규] 프론트엔드 결제 실패 이벤트 수신 DTO |
| `PaymentController.java` | [신규] `POST /api/payments/failure` 엔드포인트 |
| `Step3Payment.tsx` | 결제 실패 이벤트 서버 전송, `isSubmitting` 중복 클릭 방지, 수동 환율 변환 제거 |

### Phase 2 — 관찰 가능성

| 파일 | 내용 |
|------|------|
| `PaymentController.java` | 요청/응답 INFO 로그 |
| `GlobalExceptionHandler.java` | 결제·보안 에러 ERROR 레벨, 스택트레이스 포함 |

### Phase 3 — 서비스 품질

| 파일 | 내용 |
|------|------|
| `AppProperties.java` | `Paygate` 설정 클래스 — `verifyUrl`, `cancelUrl`, `eventDate`, `midDomestic`, `midOverseas` 환경변수화 |
| `PaymentService.java` | `verifyUrl` AppProperties 참조로 변경, verifyReceived HTTP 200 기준 단순화 (PDF 문서 근거) |
| `AsyncConfig.java` | `@EnableScheduling` 추가 |

### Phase 4 — 운영 인프라

| 파일 | 내용 |
|------|------|
| `AdminPaymentController.java` | [신규] `GET /api/admin/payments`, `GET /api/admin/payments/{id}` (X-Admin-Key 인증) |
| `PendingPaymentCleanupScheduler.java` | [신규] 매시간 24h 초과 PENDING → FAILED 자동 처리, `@Profile("prod")` 적용 |

### Phase 5 — PayGate Cancel API 연동 + 부분 환불

| 파일 | 내용 |
|------|------|
| `Payment.java` | `tid` 필드 추가 (PG 환불 API 호출용), `storeTid()` 메서드 |
| `PaymentService.java` | 부분 환불 계산 (30일 초과 → 100%, 8\~30일 → 50%, 7일 이내 → 0%), `callPaygateCancelApi()` 구현 |
| `AppProperties.Paygate` | `midDomestic`, `midOverseas` 필드 추가 |
| `application.yaml` | dev/prod 모두 `paygate.*` 설정 추가 |
| `PaymentController.java` | 취소 응답에 `refundAmount`, `message` 포함, 로그 영문화 |
| `PendingPaymentCleanupScheduler.java` | `@Profile("prod")` — dev 환경 비활성 |

### 한국어 → 영문화

| 파일 | 내용 |
|------|------|
| `Step2Options.tsx` | 카테고리 라벨, 옵션 이름(nameKr→nameEn), Required/Sold Out/Seats/Free/VAT/Total/Order Summary/Proceed to Payment |
| `SignupPage.tsx` | placeholder `홍길동` → `Hong Gil-dong` |

---

## 운영 서버 환경변수 추가 방법

운영 서버의 환경변수는 `/opt/kssc2026/.env` 파일에서 관리합니다.

```bash
# SSH 접속
ssh -i ~/.ssh/kssc2026-lightsail.pem ubuntu@52.79.209.95

# .env 파일 편집
sudo nano /opt/kssc2026/.env
```

### 추가할 환경변수

```dotenv
# PayGate 설정
PAYGATE_MID_DOMESTIC=kibse
PAYGATE_MID_OVERSEAS=kibse0us
PAYGATE_EVENT_DATE=2026-09-16
```

> `PAYGATE_MID_DOMESTIC`과 `PAYGATE_MID_OVERSEAS`는 취소/환불 API 호출 시 사용됩니다.
> card 전용이므로 `VITE_PAYGATE_METHOD=card`는 프론트엔드 `.env`에서 이미 처리됨.

### 서버 재시작

```bash
sudo systemctl restart kssc2026
sudo journalctl -u kssc2026 -f  # 로그 확인
```

---

## 아키텍처 결정 사항 (ADR)

1. **환율 수동 변환 제거**: 해외 MID(`kibse0us`)가 PayGate에서 통화 변환 자동 처리 — `goodcurrency=WON`, `unitprice=KRW 금액`을 그대로 전달
2. **verifyReceived.jsp**: PayGate PDF 문서 기준 HTTP 200 = 검증 성공으로 단순화 (기존 본문 heuristic 제거)
3. **Cancel API MID**: 백엔드가 `app.paygate.mid-domestic` (AppProperties)에서 읽음 — 프론트엔드 `.env`와 이중 관리 없이 일원화
4. **부분 환불 기준**: 취소 시점 기준 행사 개시일(`PAYGATE_EVENT_DATE`)까지 남은 일수로 계산

---

## 남은 작업 (Next Session)

### 🔴 Critical

| 항목 | 내용 |
|------|------|
| Idempotency Key | `POST /api/payments` 중복 요청 방어 — 동시 요청 시 이중 결제 가능성 잔존 |
| tid 저장 연결 | `payment.storeTid(request.tid())` 호출이 `createPayment()`에 누락됨 — Cancel API 사용 전 반드시 추가 필요 |

### 🟡 Important

| 항목 | 내용 |
|------|------|
| Admin API 보안 | JWT 권한 체크 또는 IP 제한 추가 |
| 결제 영수증 PDF | 등록 완료 후 PDF 다운로드 제공 |
| Admin API 페이징 | 1,000명 초과 시 응답 지연 |

### 🟢 Minor

| 항목 | 내용 |
|------|------|
| 이메일 템플릿 영문 확인 | `sendPaymentConfirmation()` / `sendCancellationConfirmation()` 영문 여부 확인 |
| AWS SES Sandbox 해제 여부 | 실제 이메일 발송 테스트 |
| CloudWatch 로그 수집 | `journalctl` 순환으로 인한 결제 감사 로그 유실 방지 |

---

## 테스트 계정 정보

| 이메일 | 비밀번호 | 회원 유형 |
|--------|----------|----------|
| member@test.com | Test1234! | MEMBER |
| young@test.com | Test1234! | NON_MEMBER (Young Engineer) |
| senior@test.com | Test1234! | NON_MEMBER_PLUS |
| admin@kibse.or.kr | Admin2026! | ADMIN |
