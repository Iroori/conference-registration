# Progress Log — Visa Invitation & Passport Info Integration (2026-06-15)

## 작업 정보
- **작업 브랜치**: `main`
- **커밋 해시**: N/A
- **PR 링크**: N/A

## 세션 요구사항 (작업 전 원문)
'Yes, I need an invitation letter.'를 클릭했을 때 아래로 확장되어(Toggle) 필수 정보를 입력받을 수 있도록 설정.

⚠️ Please ensure all information is entered exactly as it appears on your passport.

**FULL NAME (AS ON PASSPORT) ***
[ First Name ] [ Last Name ]

**PASSPORT NUMBER ***
[ Enter your passport number ]

**DATE OF BIRTH ***
[ DD / MM / YYYY ]  (달력 선택 위젯 권장)

해당 정보가 추가되면서 관리자패널이나 마이페이지에서도 이 정보를 조회할수 있고 변경할수있는지 확인.

## 구현 결과
- **완료**:
  - 회원가입/결제 단계에서 비자 초청장 필요 체크 시 여권 정보(이름, 성, 여권번호) 및 생년월일 수집 폼 렌더링 및 유효성 검증 구현.
  - 마이 프로필 탭 내에서 수집된 여권 상세 정보 및 생년월일을 직접 수정할 수 있도록 연동.
  - 관리자 대시보드 가입 회원 상세(Registered Users) 패널 내 개인정보 섹션에 여권 이름 및 여권 번호 표기 및 아코디언 상세 조회 추가.
  - 관련 백엔드 API 요청 DTO 및 엔티티 칼럼 추가 및 검증 로직 구현.

## 변경 파일 목록

### Backend
- **수정**:
  - `back/src/main/java/com/roo/payment/domain/user/entity/User.java` (여권 필드 추가 및 헬퍼 메서드)
  - `back/src/main/java/com/roo/payment/domain/payment/dto/PaymentRequest.java` (여권 필드 추가)
  - `back/src/main/java/com/roo/payment/domain/payment/service/PaymentService.java` (비자 선택 시 여권 검증 로직 추가)
  - `back/src/main/java/com/roo/payment/domain/user/dto/UpdateProfileRequest.java` (여권 및 생년월일 필드 추가)
  - `back/src/main/java/com/roo/payment/domain/user/controller/UserController.java` (마이 프로필 수정 시 여권 정보 바인딩 및 토큰 갱신)
  - `back/src/main/java/com/roo/payment/domain/user/dto/AdminUserResponse.java` (어드민용 여권 필드 노출)
  - `back/src/test/java/com/roo/payment/domain/user/UserControllerTest.java` (생성자 파라미터 갱신에 따른 테스트 수정)

### Frontend
- **수정**:
  - `front/src/types/index.ts` (API 요청/응답 여권 관련 필드 타입 추가)
  - `front/src/components/StepInvitationLetter.tsx` (비자 선택 시 여권 정보 입력 폼 토글 렌더링 및 필수 필드 미입력 시 다음 단계 진입 제어)
  - `front/src/pages/RegistrationPage.tsx` (결제 폼 상태 및 마이페이지 프로필 정보 갱신 연동)
  - `front/src/components/AdminDashboardPage.tsx` (가입 회원 목록 상세 아코디언 내 여권 정보 노출)

## 아키텍처 결정 사항 (ADR)
- **여권 정보의 라이프사이클**: 비자 초청장 발급에 필요한 개인정보는 결제 최종 시점에 `User` 테이블에 저장되며, 마이페이지를 통해 언제든 확인 및 자가 수정이 가능하도록 단일 엔티티(`User`) 속성으로 통합하여 영속화함.

## 테스트 계정 정보 및 옵션 ID 참조
- **옵션 ID**: `OPT-VISA` (Visa Invitation Letter Fee)
- **테스트 계정**: `member@test.com` / `Test1234!`
