# 2026-06-15 Passport Details Visibility in Payment Summary and History

## 작업 브랜치
- `main`

## 요구사항
1. 결제 직전 최종 확인(Summary) 단계에서 사용자가 등록한 여권 정보(Passport Name, Passport Number)를 직접 확인하고 수정할 수 있도록 표시 처리.
2. 사용자 및 관리자 관점의 결제 완료 상세 내역(My Payments 및 Admin Total Payments) 조회 화면에서도 여권 및 비자 정보가 있는 경우 상세 카드가 보이도록 연동.
3. 여권 정보가 공백(빈 값)이거나 누락된 결제 내역의 경우, 에러가 발생하지 않고 `—` (대시) 형태로 빈 값 처리가 안전하게 이루어지도록 예외 처리 구현.

---

## 구현 결과

### 1. 결제 직전 확인(Summary) 단계 여권 정보 추가 (완료)
- **대상 파일:** [StepSummary.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepSummary.tsx), [RegistrationPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/pages/RegistrationPage.tsx)
- **변경 사항:**
  - `StepSummary` 컴포넌트의 props로 `passportFirstName`, `passportLastName`, `passportNumber`를 전달하여 비자 초청장 발급 신청(`needsInvitationLetter === true`) 시 여권 상세 정보 카드가 요약 화면에 출력되도록 레이아웃을 수정했습니다.
  - 사용자는 요약 화면에서 여권 정보에 오타가 없는지 한눈에 검증할 수 있으며, 수정이 필요한 경우 우측 상단의 "Edit" 버튼을 클릭하여 비자 신청 정보 수정 단계로 바로 이동할 수 있습니다.

### 2. 백엔드 Payment 응답 객체에 여권 정보 필드 연동 (완료)
- **대상 파일:** [PaymentResponse.java](file:///Users/rrlee/ETC/conference-registration/back/src/main/java/com/roo/payment/domain/payment/dto/PaymentResponse.java)
- **변경 사항:**
  - `PaymentResponse` record 클래스에 `passportFirstName`, `passportLastName`, `passportNumber`, `birthDate` 필드를 새롭게 정의하고, 데이터베이스로부터 `payment.getUser()` 객체를 통해 정보를 안전하게 자동 바인딩 처리했습니다.
  - 사용자가 비자를 신청하지 않았거나 과거 결제 건으로 해당 컬럼 데이터가 비어 있을(null) 경우에도 예외 없이 null 값을 안정적으로 반환하도록 설계되었습니다.

### 3. 사용자 및 어드민 결제 내역 상세 조회 연동 (완료)
- **대상 파일:** [PaymentHistory.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/PaymentHistory.tsx), [AdminDashboardPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/AdminDashboardPage.tsx)
- **변경 사항:**
  - `PaymentResponse` 타입 정의에 신규 필드 4종을 추가했습니다.
  - 마이 페이지의 **My Payments** 아코디언 상세 보기와 어드민의 **Total Payments** 상세 보기 영역 하단에 "Passport & Visa Info" 섹션을 추가로 렌더링하도록 수정했습니다.
  - 여권 정보 중 단 하나라도 존재하는 경우 섹션이 확장 노출되며, 해당 데이터가 존재하지 않는 필드는 대시(`—`)로 예외 없이 바인딩하여 안전하게 표시됩니다.

---

## 변경 파일 목록

### Backend
- **[MODIFY]** [PaymentResponse.java](file:///Users/rrlee/ETC/conference-registration/back/src/main/java/com/roo/payment/domain/payment/dto/PaymentResponse.java) — 결제 완료 DTO 에 회원 여권/생년월일 필드 추가 연동

### Frontend
- **[MODIFY]** [StepSummary.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepSummary.tsx) — 요약 화면에 비자 신청 시 입력한 여권 정보 요약 카드 구현
- **[MODIFY]** [RegistrationPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/pages/RegistrationPage.tsx) — StepSummary 에 여권 정보 바인딩 전달
- **[MODIFY]** [types/index.ts](file:///Users/rrlee/ETC/conference-registration/front/src/types/index.ts) — PaymentResponse 타입 정의 확장
- **[MODIFY]** [PaymentHistory.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/PaymentHistory.tsx) — 개인 결제 완료 상세 내역에 여권/비자 카드 연동
- **[MODIFY]** [AdminDashboardPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/AdminDashboardPage.tsx) — 관리자 전체 결제 내역 상세 보기에 여권/비자 카드 연동

### Docs
- **[NEW]** [2026-06-15_passport-details-in-summary-and-history.md](file:///Users/rrlee/ETC/conference-registration/docs/progress/2026-06-15_passport-details-in-summary-and-history.md) — 본 작업 진행 기록 작성

---

## 검증 완료 정보
- 백엔드 테스트 컴파일(`mvn test-compile`) 성공.
- 프론트엔드 빌드 검증(`npm run build`) 성공.
