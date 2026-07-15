# 2026-07-15 — 대기자 오퍼 & 추가 결제 (Waitlist Offer / Additional Payment)

## 브랜치 / 커밋 / PR
- 브랜치: (미커밋) — `main` 직접 커밋 금지 규칙에 따라 `claude/waitlist-offer-payment` 브랜치 생성 후 PR 예정
- 커밋: 대기
- PR: 대기

## 세션 요구사항 (원문 요약)
- 수량제한으로 웨이팅리스트를 받는 항목에서, 대기자가 결제 가능해질 때(정원 추가/앞선 취소) **해당 항목만 추가 결제**할 수 있어야 한다.
- 기존 기능에 영향 없이, 이 내역도 **결제내역으로 관리**되어야 한다.
- 오퍼는 **관리자 수동**(대기 순서 리스트 확인 → Offer 버튼). Offer 시 메일 발송.
- 접근/인증: **로그인 기반(JWT)**. 오퍼받은 본인만 접근하는 **전용 결제 페이지**, 그 항목만 결제.
- **등록 미완료자에게도 오퍼 허용**(오퍼 항목만 결제, 등록비 미납 유지 — 관리자 책임).
- 오퍼에 **수량 지정** 가능(2개 이상). 정원 초과도 **수량 제한 없이** 열어줄 수 있어야 함(관리자 확인 하에).

## 아키텍처 결정 (ADR)
1. **추가 결제 = 새 `Payment` 레코드(`paymentType=WAITLIST`)**. 기존 `initiate→PayGate→complete` 파이프라인을 재사용하고, 원 결제·정원·PG 로직을 건드리지 않는다. 자동으로 결제내역(`/payments/me`)에 잡힌다.
2. **인증은 기존 JWT 재사용**. 매직링크 미사용. 메일은 **토큰 없는 알림**(로그인 유도)만. 인가 = `JWT 이메일 == 오퍼 소유자` + `OFFERED` + `미만료`.
3. **오퍼 경로는 공개 정원 체크 우회**(오퍼 자체가 결제 권한). 일반 결제 경로의 정원 로직은 불변 → 매진 좌석이 일반 사용자에게 노출되지 않으면서 오퍼받은 사람만 초과 수용.
4. **오퍼에 수량(`offeredQuantity`)**. 예약 좌석 = `maxCapacity − currentCount − Σ(미결제 OFFERED 수량)`. 결제 완료 시 `increaseCount(quantity)`로 정확 카운트.
5. **초과 오퍼는 `force=true`로만 허용**(관리자 명시 승인). 요청 수량 > 잔여면 `409 WAITLIST_CAPACITY_FULL`, force 시 통과(잔여 음수 가능).
6. **지연 만료(lazy expiry)**. 별도 배치 없이, 관리자 조회·오퍼·유저 조회 시점에 마감 지난 OFFERED를 `EXPIRED`로 정리. 관리자 `Revoke`로 즉시 회수.
7. **상태머신**: `WAITING → OFFERED → COMPLETED` / `OFFERED → EXPIRED(만료)·WAITING(회수)`.

## 구현 결과 (완료)
- 대기자 **상태머신 + 수량 오퍼** (`OptionWaitlist` 확장: `OFFERED/EXPIRED`, `offeredAt/offerExpiresAt/fulfilledPaymentId/offeredQuantity`).
- `WaitlistService`: 요약/상세(FIFO+부모결제상태)/오퍼(락+예약+메일)/회수/내오퍼/지연만료.
- `PaymentService.initiateWaitlistPayment`(정원 우회, 정가×수량) + 완료 분기(`fulfillWaitlist`: `increaseCount(qty)` + `OFFERED→COMPLETED`, 멱등).
- 관리자 API `/api/admin/waitlists/**`, 유저 API `/api/payments/waitlist/**`.
- 오퍼 알림 메일(`EmailService.sendWaitlistOffer`, 영어/토큰없음/수량·마감·로그인 링크).
- 프론트: 관리자 **Waitlist 탭**(옵션 요약 카드 → FIFO 표, 수량입력+Offer/Revoke, 초과 확인), 유저 **`/waitlist/pay`** 전용 페이지(로그인 게이트, 잠긴 라인아이템, PayGate 재사용).

## 추가 (2차): 관리자 직접 오퍼 (대기 신청/결제 이력 무관)
- 요구: 대기 리스트에 없고 **결제 이력도 없는** 회원가입 유저에게도 특정 옵션(투어1) 결제 권한을 열어줄 수 있어야 함(실결제됐으나 DB 누락 건 보정). 수량 무제한.
- 구현: `POST /api/admin/waitlists/grant {email, optionId, quantity, force}` → `WaitlistService.grantAndOffer`가 새 `OptionWaitlist`를 **OFFERED**로 생성. 유저는 기존 `/waitlist/pay`에서 그대로 결제(페이지·결제 흐름 무변경).
- 구조 변경(불가피, 안전): `OptionWaitlist`에 **`user` 직접 참조 추가 + `payment`를 nullable로**. 직접 오퍼는 결제 없이 유저에 바로 연결(payment=null, originRegistrationNumber=null). 기존 대기 데이터가 전무(저장버그로 항상 실패)해 백필 리스크 없음. 조회 쿼리는 `w.user` 기준 + payment는 LEFT JOIN으로 하위호환.
- 프론트: 관리자 **Registered Users 탭 각 행에 [Open payment] 버튼**(옵션·수량·over-capacity 미니 모달, 그 행의 이메일 사용). 유저는 기존 `/waitlist/pay`에서 직접 결제(유저가 실제로 돈을 냄 — 이중청구 아님). 유저 페이지 무변경.

## 발견/수정한 기존 버그 (중요)
1. **`initiatePayment`의 대기자 저장 순서 버그** — `OptionWaitlist`(non-null FK)를 부모 `Payment` 영속화 **이전에** 저장 → `TransientPropertyValueException`. 즉 **기존 웨이팅리스트 신청은 실제로 항상 500** 이었다(UI만 존재, 백엔드 크래시). `paymentRepository.save(payment)`를 대기자 저장 앞으로 이동해 수정.
2. **`option_waitlists.status` CHECK 제약** — Hibernate가 STRING enum에 대해 자동 생성한 CHECK가 구값(WAITING/COMPLETED/CANCELLED)만 허용. `ddl-auto=update`는 이를 갱신하지 않으므로 `OFFERED` 저장 시 500. → **prod 마이그레이션에서 제약 제거 필요**(아래).

## 마이그레이션 (prod/dev 공통, 배포 전 수동 실행)
- 스크립트: [`docs/migrations/2026-07-15_waitlist_offer.sql`](../migrations/2026-07-15_waitlist_offer.sql)
- 핵심: `payments`(payment_type/waitlist_id/origin_registration_number), `option_waitlists`(offered_at/offer_expires_at/fulfilled_payment_id/offered_quantity/**user_id**) 컬럼 추가 + **`payment_id`를 nullable로**(직접 오퍼) + **`option_waitlists.status`의 구 CHECK 제약 제거**(★없으면 오퍼 시 500★).
- 적용 대상: `kssc2026_dev`, `kssc2026` 둘 다. `dev` 프로파일이 원격 MSSQL(52.79.209.95/kssc2026_dev)에 붙으므로 dev DB에도 적용해야 기능 동작.

## 변경 파일 목록
### 신규 (Backend)
- `domain/payment/entity/PaymentType.java`
- `domain/payment/service/WaitlistService.java`
- `domain/payment/controller/AdminWaitlistController.java`
- `domain/payment/dto/{WaitlistEntryResponse,WaitlistOptionDetail,WaitlistSummaryResponse,WaitlistOfferResponse}.java`
### 수정 (Backend)
- `domain/payment/entity/OptionWaitlist.java` (상태/필드/메서드)
- `domain/payment/entity/Payment.java` (paymentType/waitlistId/originRegistrationNumber + markAsWaitlist)
- `domain/option/entity/ConferenceOption.java` (increaseCount(int)/decreaseCount(int))
- `domain/payment/service/PaymentService.java` (오퍼 결제 + 완료 분기 + **저장 순서 버그 수정**)
- `domain/payment/controller/PaymentController.java` (유저 waitlist 엔드포인트)
- `domain/payment/controller/AdminPaymentController.java` (**결제삭제 FK 처리** + WAITLIST 복원)
- `domain/payment/repository/OptionWaitlistRepository.java`, `domain/option/repository/ConferenceOptionRepository.java`(비관적 락)
- `domain/payment/dto/PaymentResponse.java` (paymentType/originRegistrationNumber)
- `domain/user/service/EmailService.java` (sendWaitlistOffer)
- `common/exception/ErrorCode.java` (WAITLIST_*), `config/AppProperties.java` (Waitlist.offerWindowHours/paymentPath)
### 신규/수정 (Frontend)
- 신규: `components/AdminWaitlistTab.tsx`, `pages/WaitlistOfferPage.tsx`
- 수정: `components/AdminDashboardPage.tsx`(탭), `App.tsx`(라우트 `/waitlist/pay`), `lib/api.ts`, `types/index.ts`
### 신규 (Docs)
- `docs/migrations/2026-07-15_waitlist_offer.sql`

## 검증 결과
- 백엔드 `compile` 통과, 프론트 `tsc --noEmit` 통과, Spring 컨텍스트 정상 기동.
- **E2E(H2 create-drop)**: intake(부모 PENDING=등록 미완료) → 관리자 요약/상세 → 오퍼 qty100 force=false **409** → qty2 성공(잔여 40→38, 예약 반영) → 유저 오퍼 조회(qty2/₩180,000) → **WAITLIST 결제 개시**(type=WAITLIST, total=180,000, origin=부모 등록번호) → 초과 오퍼 qty100 force=true 성공(잔여 −60) → 오퍼 메일 dev-log 확인.
- **결제삭제 FK**: 대기 행이 달린 결제 DELETE → **HTTP 200**(dev H2 + 원격 MSSQL 양쪽), 대기 행 정리 확인.
- 미검증(런타임): 최종 PG 완료 단계(`fulfillWaitlist`)는 실 게이트웨이 필요 — 일반 완료와 동일 코드 경로. 마이그레이션 적용 후 stage 결제로 최종 확인 권장.

## 테스트 계정 / 옵션 참조
- 관리자(현재 유일 시드): `admin@kibse.or.kr` / `Admin2026!` (MemberType.MEMBER, ROLE_ADMIN). ※ CLAUDE.md 8-2의 member@test.com 등은 **현재 미시드**(문서 갱신 필요).
- 대기 대상 예시 옵션: `OPT-TECH-TOUR-1` (maxCapacity 40, price 90,000).
- 설정: `app.waitlist.offer-window-hours`(기본 48), `app.waitlist.payment-path`(기본 `/waitlist/pay`).

## 후속 과제
- (선택) 오퍼 만료 **배치 스케줄러**(현재 지연 만료로 충분).
- (선택) 마이페이지에 "오퍼 있음" 배너/알림.
- CLAUDE.md 8-2 시드 계정 표 갱신(테스트 계정 실제 시드와 불일치).
