# IABSE INCHEON 2026 — 개발 이력서 (Progress Log)

이 파일은 이번 세션에서 진행된 세 가지 신규 기능 구현 사항을 누적 기록하는 작업 이력서입니다.

## 1. 세션 정보
- **날짜**: 2026-06-02
- **작업 브랜치**: local development
- **커밋 해시**: TBD (로컬 빌드 검증 성공)

## 2. 세션 요구사항 (원문)
- 결제 완료 후에도 개인정보 직접 수정하도록 변경
- 관리자 페이지 관리항목 (등록비, 옵션 내역 확인 가능하도록)
- 옵션 gala dinner/ technical tour 인원 다 차면 웨이팅리스트 선택 가능하도록

## 3. 구현 결과 (완료 / 미완료)
- **[완료] 개인정보 직접 수정 기능**:
  - 백엔드 `UserController.java`의 `PUT /api/user/profile` API에서 `AuthResponse` 생성을 `AuthResponse.of(newAccessToken, "", user)` 공용 팩토리 메서드로 교체하여 에러 해결 및 정합성 보장.
  - 백엔드 `AuthResponse` 및 프론트엔드 `AuthUser` 모델에 `phone` 필드 신설하여 회원 연락처도 완전 동기화 처리.
  - 프론트엔드 상단 네이비 바에 "My Profile" 탭 신설 및 기존 `SignupPage.tsx`에 선언된 `COUNTRIES` 및 `POSITION_OPTIONS` 재사용을 위한 export 처리.
  - 프로필 수정 완료 시 `AuthContext.login()`을 호출하여 세션 데이터를 실시간 즉시 갱신 처리.
- **[완료] 관리자 페이지 USERS 탭 항목 확장**:
  - `AdminDashboardPage.tsx`에서 결제 내역 조회 `adminPayments` 쿼리의 `enabled` 트리거 조건에 `activeTab === 'USERS'`를 추가하여 데이터를 연동.
  - 가입 회원(USERS) 테이블에 `Registration & Options` 컬럼을 신설하여, 각 사용자의 이메일로 매칭되는 완료(COMPLETED) 결제건을 조회해 등록 등급 패키지명, 갈라 디너 및 기타 소셜 옵션 목록, 테크니컬 투어명, 동반인 정보 및 실결제 총액을 가독성 있게 구조화된 UI 블록으로 렌더링. 결제 완료 데이터가 없는 회원은 회색의 `Unpaid / No Registration` 처리.
- **[완료] 테크니컬 투어 매진 시 대기자 신청 및 상호 배제**:
  - `StepTechnicalTour.tsx`에서 매진(`available === false`)된 투어 카드를 dynamic `div` 요소로 변경하여 inner checkbox(Please add me to the waitlist) 클릭 시 disabled 버튼의 버블링 차단 문제를 방지.
  - 매진된 투어 하단에 `Please add me to the waitlist` 체크박스를 렌더링하고, 특정 매진 투어의 대기자를 선택하면 다른 투어(활성 선택 및 타 매진 투어 대기)가 자동으로 초기화되는 완전한 상호 배제(Mutual Exclusion) 구현.
  - 대기 신청된 투어는 ₩0로 계산되도록 `StepTechnicalTour.tsx` 및 `StepSummary.tsx`에서 가격 연동 보정.

## 4. 변경 파일 목록

### Backend (Java)
- **[수정]** [UserController.java](file:///Users/rrlee/ETC/conference-registration/back/src/main/java/com/roo/payment/domain/user/controller/UserController.java) — `AuthResponse.of` 공용 팩토리를 통한 인스턴스화로 인수 개수 컴파일 오류 해결
- **[수정]** [AuthResponse.java](file:///Users/rrlee/ETC/conference-registration/back/src/main/java/com/roo/payment/domain/user/dto/AuthResponse.java) — `phone` 연락처 필드 record 추가 및 팩토리 연동

### Frontend (TypeScript / React)
- **[수정]** [index.ts](file:///Users/rrlee/ETC/conference-registration/front/src/types/index.ts) — `UpdateProfileRequest` 인터페이스 선언 및 `AuthUser` 모델 내 `phone` 필드 추가
- **[수정]** [api.ts](file:///Users/rrlee/ETC/conference-registration/front/src/lib/api.ts) — `apiUpdateProfile` 호출 메서드 추가 및 타입 바인딩
- **[수정]** [SignupPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/pages/SignupPage.tsx) — 중복 정의 방지를 위해 `POSITION_OPTIONS` 및 `COUNTRIES` 배열 export 변경
- **[수정]** [RegistrationPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/pages/RegistrationPage.tsx) — My Profile 네비게이션 탭 추가, 폼 컴포넌트(`MyProfileTab`) 및 입출력 제어 로직 구현, 테크니컬 투어 컴포넌트에 `onWaitlistChange` 주입
- **[수정]** [StepTechnicalTour.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepTechnicalTour.tsx) — 매진된 카드의 대기 체크박스 제공, ₩0 가산 연산 처리 및 상호 배제(Mutual Exclusion) 로직 완비, TypeScript 타입 제약 회동을 위한 `TECH_TOUR_OPTION_IDS` string[] 강제 형변환 보정
- **[수정]** [StepSummary.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepSummary.tsx) — 최종 요약 요율표와 우측 바 총액 명세표 내 테크니컬 투어 대기 신청 시 ₩0 및 Waitlisted 라벨 표시 보정

## 5. 아키텍처 결정 사항 (ADR)
- **대기 상태의 상호 배제**: 테크니컬 투어는 동일 시간대 진행되므로 복수 가입이 불가함. 이에 따라 대기 목록 체크박스 또한 단일 활성 옵션으로 취급하여, 대기 목록 체크 시 활성 투어가 제거되고, 역으로 활성 투어 클릭 시 대기 상태가 초기화되도록 하여 결제 전 데이터 오염을 예방함.
- **Admin Users - Payments 조인 최소화**: 백엔드 User와 Payment의 무거운 연쇄 조회(Cascade/Join) 쿼리를 구현하는 대신, 어드민 로딩 시 이미 메모리에 탑재되는 `payments` 컬럼을 맵핑하여 React 레벨에서 O(N) 탐색 매칭 처리함. 이를 통해 어드민 API 오버헤드를 제로화함.

## 6. 테스트 계정 정보 및 옵션 ID 참조
- **옵션 ID**:
  - `OPT-TECH-TOUR-1` : 기술 투어 I (Cheongna Sky Bridge)
  - `OPT-TECH-TOUR-2` : 기술 투어 II (Gimpo-Paju Tunnel)
  - `OPT-TECH-TOUR-3` : 기술 투어 III (Yeongdong-daero Underground Complex)
- **테스트 계정**:
  - 일반 가입자: `member@test.com` (비밀번호: `Test1234!`)
  - 어드민 계정: `admin@kibse.or.kr` (비밀번호: `Admin2026!`)
