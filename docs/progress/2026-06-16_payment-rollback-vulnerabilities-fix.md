# 2026-06-16_payment-rollback-vulnerabilities-fix.md

## 세션 요구사항 (작업 전 원문)
> 또 이러한 문제없는지 QA 라 생각하고 분석해봐 우리 DB 에 데이터가 저장되지않는 상태는 절대 없어야해 (롤백 시 PG 자동 결제 취소는 제외)

## 구현 결과
- **완료**:
  1. `PaymentRequest` DTO 내 `passportFirstName`, `passportLastName`, `passportNumber`, `iabseId`, `appliedDiscountCode` 필드 크기 제한 적용.
  2. `PaymentService.createPayment` 초입부에 명시적인 글자 수 길이 유효성 검사 추가 (PG API 검증 전 에러 차단).
  3. `generateRegistrationNumber` 메소드 내 난수 생성 자릿수를 5자리에서 8자리로 확장하여 동시 결제 건 간의 고유 번호 충돌(Unique Index Violation) 및 롤백 위험성 방지.
- **제외**:
  1. 롤백 시 PG 자동 결제 취소(Cancel API 연동)는 사용자 요청에 따라 범위에서 제외함.

## 변경 파일 목록
### Backend
- **[MODIFY]** [PaymentRequest.java](file:///Users/rrlee/ETC/conference-registration/back/src/main/java/com/roo/payment/domain/payment/dto/PaymentRequest.java)
- **[MODIFY]** [PaymentService.java](file:///Users/rrlee/ETC/conference-registration/back/src/main/java/com/roo/payment/domain/payment/service/PaymentService.java)
- **[MODIFY]** [GEMINI.md](file:///Users/rrlee/ETC/conference-registration/GEMINI.md)

## 아키텍처 결정 사항 (ADR)
- **결제 롤백 방지 설계**: 외부 연동 API 호출(PG 승인 검증)은 롤백할 수 없는 외적 성격의 처리를 동반하므로, 호출 전에 발생 가능한 모든 비즈니스 예외 및 DB 데이터 포맷 제약(글자 수 등) 검사를 앞단으로 당김. 이를 통해 실결제 후 DB 롤백으로 인한 결제 유실 리스크를 차단함.
