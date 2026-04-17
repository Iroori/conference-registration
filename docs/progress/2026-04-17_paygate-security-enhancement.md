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

## 남은 작업 및 Session 요구사항 (Architecture Design & Implementation Plan)

이하의 내용은 **차기 릴리즈에서 시스템 안정성 및 운영 성숙도를 극대화하기 위해 반드시 개발되어야 할 핵심 아키텍처 과제**입니다.

### 1. 🔴 [보안/안정성] Idempotency Key (멱등성 키) 도입

*   **배경 및 필요성 (Why needed):**
    현재 등록 결제 시스템(`POST /api/payments`)은 "결제 완료 상태(`COMPLETED`)의 존재 여부"를 DB 조회로 확인하여 중복 결제를 차단합니다. 그러나 찰나의 네트워크 지연이나 브라우저의 비정상 재전송(더블 클릭 등)으로 **동시에 여러 스레드가 진입할 경우(Race Condition)**, 두 트랜잭션 모두 이전 완료 상태를 감지하지 못하고 동시에 PG사 승인 후 DB에 저장될 수 있는 심각한 위험(이중 과금)이 잠재되어 있습니다.
*   **구현 설계 (How to implement):**
    *   **프론트엔드:** 결제 화면(Step3) 진입 시 고유 UUID(`Idempotency-Key`)를 생성하여 결제 API 호출 시 HTTP 헤더에 담아 전송합니다.
    *   **백엔드:** 인메모리 Redis 인프라가 없으므로 RDBMS 고유 제약 조건을 활용합니다.
    *   새로운 엔티티 `IdempotencyRecord` 생성: `(key: PK, user_id, status, response_json)`.
    *   API 진입 시 해당 Key를 우선 `INSERT` 시도합니다. 동시성에 의해 동일 키 접근 시 DB 단에서 `EntityExistsException` (Unique Constraint Violation)이 즉시 발생하며 트랜잭션이 차단됩니다(HTTP 409 Conflict).
    *   결제가 성공적으로 끝나면 트랜잭션 종료 직전 `response_json`에 결제 반환 값을 캐싱해두어, 유저가 새로고침하여 같은 키로 재요청할 경우 PG사 통신 없이 안전하게 캐싱된 응답(HTTP 200)을 즉시 리턴하게 만듭니다.

### 2. 🟡 [보안/권한] Admin API 인증 아키텍처 고도화 (JWT RBAC 연동)

*   **배경 및 필요성 (Why needed):**
    현행 관리자 API(`/api/admin/**`)는 설정 파일에 기입된 정적 토큰(`X-Admin-Key`) 헤더에 의존하여 인증을 수행하고 있습니다. 이 방식은 키가 유출되었을 경우 사용자들의 결제 내역과 개인정보가 모두 탈취될 수 있는 위험을 내포합니다.
*   **구현 설계 (How to implement):**
    *   세션, 토큰 키 재발급, 만료가 지원되는 기존 JWT 인프라를 활용한 **RBAC (Role-Based Access Control)** 체계로 전환합니다.
    *   **백엔드:** `User` 엔티티의 `memberType` 외에 권한을 나타내는 필드를 추가하거나, Spring Security의 `GrantedAuthority` 부여 시 로그인한 계정의 `admin` boolean 컬럼을 검사해 `ROLE_ADMIN`을 주입합니다.
    *   `AdminPaymentController`의 인가 설정을 `@PreAuthorize("hasRole('ADMIN')")`로 교체하고 기존 하드코딩 헤더 검증 로직은 폐기합니다.
    *   **프론트엔드:** 별도로 API 인터셉터에 헤더를 삽입할 필요 없이, AuthContext의 토큰만으로 보안 통신을 일원화합니다.

### 3. 🟡 [사용성/운영] 공식 결제 영수증(Receipt) PDF 동적 생성 로직 구축

*   **배경 및 필요성 (Why needed):**
    학회 참가 등록비는 소속 기관(대학/기업)에 재무회계용으로 증빙 처리를 해야 합니다. 단순 이메일 본문이나 화면 캡처로는 부족하며, 공식 포맷(A4) 기준의 PDF 다운로드가 필수적으로 요구됩니다.
*   **구현 설계 (How to implement):**
    *   라이선스 제약(AGPL)을 피하기 위해 `OpenPDF` 라이브러리를 의존성에 추가합니다.
    *   `ReceiptPdfGenerator` 컴포넌트를 설계하여 참가자 영문 이름, 소속, 결제 고유 번호(TID), 등록 번호(`IABSE-2026-X`), 부가세 및 과세 기준을 A4 규격에 맞게 PDF 캔버스 단위로 드로잉합니다.
    *   백엔드 엔드포인트 `GET /api/payments/me/receipt/{id}`를 신설하고 응답 Content-Type을 `application/pdf`로 설정하며, 스트리밍 방식으로 메모리 점유를 최적화하여 반환합니다.

### 4. 🟢 [퍼포먼스/DB] 대규모 트래픽 대비 기반 쿼리 페이징(Pagination) 도입

*   **배경 및 필요성 (Why needed):**
    예상 참가자가 수천 명 단위로 확대될 수 있는 환경 속에서, 모든 결제 내역을 메모리에 올려 컬렉션으로 반환하는 현행 `AdminPaymentController`의 `findAll` 방식은 JVM OOM(Out of Memory) 스파이크와 지연속도 폭증의 원인이 됩니다.
*   **구현 설계 (How to implement):**
    *   Spring Data JPA의 `Pageable` 인터페이스를 매개변수로 받아 데이터베이스 단의 `OFFSET`, `FETCH NEXT` (SQL Server 방언)를 쿼리 레벨로 내려 처리합니다.
    *   API 매개변수로 `?page=0&size=50&sort=createdAt,desc`를 표준으로 제공하고, 반환 렌더링 최적화를 위해 프론트엔드의 `react-query` 무한 스크롤 또는 페이지네이션 컴포넌트와 결합합니다.

---

## 테스트 계정 정보

| 이메일 | 비밀번호 | 회원 유형 |
|--------|----------|----------|
| member@test.com | Test1234! | MEMBER |
| young@test.com | Test1234! | NON_MEMBER (Young Engineer) |
| senior@test.com | Test1234! | NON_MEMBER_PLUS |
| admin@kibse.or.kr | Admin2026! | ADMIN |
