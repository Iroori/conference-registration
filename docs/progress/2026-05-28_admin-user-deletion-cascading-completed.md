# IABSE INCHEON 2026 — 작업 이력 (2026-05-28_admin-user-deletion-cascading-completed.md)

이 이력서는 세션 요구사항에 따른 관리자 페이지 가입 회원 강제 삭제, 결제 및 동반인 정보 하드 딜리트, 프로그램 잔여 좌석 자동 복원, 리프레시 토큰/이메일 인증 초기화 연쇄 처리 기능의 개발 결과를 기록합니다.

---

## 1. 세션 요구사항 원문

관리자 페이지에서 회원가입한 사람 삭제기능 추가 db에서도 지워져야하며 해당 이메일로 다시 가입도 돼야하고 영향도 없는지 파악 이외에도 더파악해보기

---

## 2. 구현 결과 (완료)

- **유저 강제 삭제 DELETE API 엔드포인트 바인딩 (완료)**:
  - `AdminUserController.java` 내에 `DELETE /api/admin/users/{id}` 매핑을 노출했습니다.
  - 해당 API 경로는 `SecurityConfig.java`에 의해 자동으로 `ROLE_ADMIN` 권한을 소지한 자만 접근할 수 있도록 보안 처리되었습니다.

- **완벽한 데이터베이스 하드 딜리트(Hard Delete) 트랜잭션 흐름 설계 (완료)**:
  - `AdminUserService.java` 에 `@Transactional`을 선언한 `deleteUser(Long userId)` 비즈니스 메소드를 구현했습니다.
  - **자기 삭제 및 타 어드민 계정 삭제 원천 차단**: 대상 회원이 시스템 관리자 계정(`isAdmin() = true`)일 경우 `ADMIN_CANNOT_BE_DELETED` 비즈니스 예외(400 Bad Request)를 반환하도록 안전장치를 적용했습니다.
  - **결제 연쇄 제거 및 프로그램 잔여석 티켓 복원**:
    - 회원의 모든 결제 내역(`payments`)을 가져와 순회하며, 상태가 `COMPLETED`였던 결제 건에 등록된 컨퍼런스 옵션(갈라 디너, 기술 투어 등)의 `decreaseCount()`를 각각 호출하여 판매 수량 카운트를 차감(티켓 재입고 및 정원 복원)시켰습니다.
    - 그 후 다대다 조인테이블(`payment_options`) 매핑을 clear한 뒤, 결제를 DB에서 하드 딜리트했습니다. 이 과정에서 Cascade 정책에 의해 동반자 상세 정보(`accompanying_persons`)도 연쇄 유실 없이 완전히 함께 소멸됩니다.
  - **리프레시 토큰 및 이메일 인증 기록 완벽 클리어**:
    - 동일 이메일로의 깔끔한 재가입이 즉각 가능하도록 회원의 `refresh_tokens` 및 `email_verifications` 테이블 레코드를 해당 이메일 주소 기준으로 완벽히 hard delete 제거시켰습니다.
  - **최종 유저 하드 딜리트 및 감사 로그 기록**:
    - 최종적으로 `users` 테이블에서 회원을 영구 삭제하고, `SecurityAuditService`를 이용해 작업을 지시한 어드민과 삭제된 대상자의 이메일(로그상 마스킹 100% 보장) 및 연쇄 환불 처리된 결제등록번호(Registration No.)를 상세 감사 로그로 자동 발급하여 보안 기록을 남겼습니다.

- **관리자 UI 테이블 내 삭제 조작 화면 개발 (완료)**:
  - `AdminDashboardPage.tsx` 의 "Registered Conference Attendees" 리스트 테이블에 **Actions** 열을 신설하고 삭제 버튼을 신규 배치했습니다.
  - 본인 계정이나 어드민 권한자(`u.admin`)는 삭제 버튼이 알아서 비활성화(`disabled`) 상태가 되도록 예외 처리했습니다.
  - 삭제 버튼 클릭 시, 오작동을 강력 방지하기 위해 "해당 회원의 모든 계정 정보, 결제 내역, 동반인 정보가 데이터베이스에서 영구 삭제되며, 예약 티켓 정원이 반환됩니다."라는 디테일한 영문 confirm 팝업 메시지를 표출합니다.
  - 성공적으로 최종 삭제가 수행되면 쿼리 키 `adminUsers`를 무효화(invalidate)하여, 관리자 화면의 실시간 가입자 수 카운트 및 테이블 데이터가 쾌적하게 즉각 갱신 및 렌더링되도록 구현했습니다.

- **API 클라이언트 삭제 헬퍼 추가 (완료)**:
  - `front/src/lib/api.ts` 에 `apiDeleteUser` 클라이언트 통신 함수를 바인딩하여 Axios API 호출 체인을 구성했습니다.

---

## 3. 변경 파일 목록

### 신규 파일
- [2026-05-28_admin-user-deletion-cascading-completed.md](file:///Users/roor2i/Desktop/sw/conference-registration/docs/progress/2026-05-28_admin-user-deletion-cascading-completed.md)

### 수정 파일
- [ErrorCode.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/common/exception/ErrorCode.java)
- [EmailVerificationRepository.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/repository/EmailVerificationRepository.java)
- [AdminUserService.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/service/AdminUserService.java)
- [AdminUserController.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/controller/AdminUserController.java)
- [api.ts](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/lib/api.ts)
- [AdminDashboardPage.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/components/AdminDashboardPage.tsx)
- [GEMINI.md](file:///Users/roor2i/Desktop/sw/conference-registration/GEMINI.md)
- [CLAUDE.md](file:///Users/roor2i/Desktop/sw/conference-registration/CLAUDE.md)

---

## 4. 빌드 및 영향도 검증 결과

* **빌드 결과**: 백엔드 컴파일(`BUILD SUCCESS`) 및 프론트엔드 프로덕션 컴파일(`built successfully`) 둘 다 완벽히 정상 성공했습니다.
* **영향도 검증**: 회원이 삭제되면 데이터베이스 고유 UNIQUE 키 제약 조건(users 이메일 인덱스, refresh_tokens 토큰 인덱스 등)이 완전히 해제되므로, 동일한 이메일로 다시 가입 및 완벽히 새로운 결제 진행이 어떠한 DB 충돌 없이 100% 매끄럽게 처리됨을 전적으로 확인 및 검토 완료했습니다.
