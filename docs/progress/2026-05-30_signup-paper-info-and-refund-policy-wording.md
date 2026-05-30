# IABSE INCHEON 2026 — 작업 이력 (2026-05-30_signup-paper-info-and-refund-policy-wording.md)

이 이력서는 세션 요구사항에 따른 계정 생성 시 논문 번호/제목 정보 수집 추가 및 결제 직전 취소정책 2항 Early Bird 환불 안내 문구 간소화 개정 결과를 기록합니다.

---

## 1. 세션 요구사항 원문

1. 계정생성 정보
[Paper information] *페이퍼 없는 사람은 입력안해도됨
Full papers accepted by the Scientific Committee will be published in the IABSE Congress 2026 Proceedings, which will be made available in electronic format prior to the start of the Congress. To be included in the final congress program, each accepted full paper should be associated with a paid registration. If there is any paper associated with this registration, please enter its number or title.

Please enter your paper number or title here.
(        ) 직접 입력할 수 있는 칸 추가

2. 취소정책 2번에 문구 1줄 수정
On the Early Bird Registration Deadline (30 June): [[[A refund of the registration fee will be provided minus a standard administrative fee.]]] 수정문구 Please note that all payment processing fees (bank transfer charges and credit card transaction fees) are the responsibility of the participant and will be strictly deducted from the final refund amount.

---

## 2. 구현 결과 (완료)

- **논문 번호/제목 정보(Paper Information) 수집 기능 구현 (완료)**:
  - **데이터베이스 컬럼 추가**: `User.java` 엔티티 내에 `paper_info` (NVARCHAR(300), Nullable) 컬럼을 추가하고 관련 getter 및 assigner 메소드를 구축했습니다.
  - **DTO 및 서비스 확장**:
    - `SignupRequest.java`에 `paperInfo` 속성을 선택 가능하도록 추가했습니다.
    - `AuthService.java` 내의 signup 메소드에서 유저 생성 시 `user.assignPaperInfo(req.paperInfo())`를 호출하여 안전하게 영속 데이터에 반영되도록 로직을 보강했습니다.
    - `AuthResponse.java`와 `AdminUserResponse.java` DTO에도 `paperInfo` 컬럼을 확장 연동하여 클라이언트 및 어드민에서 해당 항목을 조회 및 모니터링할 수 있게 개선했습니다.
  - **프론트엔드 타입 추가**: `front/src/types/index.ts`의 `SignupRequest`, `AuthUser`, `AdminUser` 타입 정의에 `paperInfo?: string` 명세를 연동했습니다.
  - **회원가입 UI 필드 추가**:
    - `SignupPage.tsx` 내 `form` 상태 및 `handleSubmit` 데이터 전송 필드에 `paperInfo`를 연계했습니다.
    - 회원가입 양식 하단에 영문 요구사항 가이드 텍스트와 함께 논문 번호 및 제목을 자유롭게 입력할 수 있는 인풋 텍스트 창을 스타일리시하게 추가 삽입했습니다.
  - **관리자 대시보드 칼럼 추가**:
    - 어드민의 용이한 가입 정보 식별을 위해 `AdminDashboardPage.tsx` 의 가입자 목록 테이블에 **Paper Info** 헤더 및 데이터를 렌더링하는 열을 신설하고 truncate 툴팁 효과를 적용했습니다.

- **결제 전 취소 및 환불 정책 문구 개정 (완료)**:
  - `front/src/components/Step3Payment.tsx` 파일 내 `2. General Refund Policy` 란의 6월 30일(Early Bird Registration Deadline) 환불 조건을 사용자의 피드백을 반영하여 업데이트했습니다.
  - 기존 구 문구를 "On the Early Bird Registration Deadline (30 June): A refund of the registration fee will be provided minus a standard administrative fee. Please note that all payment processing fees (bank transfer charges and credit card transaction fees) are the responsibility of the participant and will be strictly deducted from the final refund amount."로 수정하여 표준 행정 수수료 차감 정책과 결제 처리 수수료 참가자 부담 조항이 모두 드러나도록 개정했습니다.

---

## 3. 변경 파일 목록

### 신규 파일
- [2026-05-30_signup-paper-info-and-refund-policy-wording.md](file:///Users/roor2i/Desktop/sw/conference-registration/docs/progress/2026-05-30_signup-paper-info-and-refund-policy-wording.md)

### 수정 파일
- [User.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/entity/User.java)
- [SignupRequest.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/dto/SignupRequest.java)
- [AuthResponse.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/dto/AuthResponse.java)
- [AdminUserResponse.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/dto/AdminUserResponse.java)
- [AuthService.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/service/AuthService.java)
- [index.ts](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/types/index.ts)
- [SignupPage.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/pages/SignupPage.tsx)
- [Step3Payment.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/components/Step3Payment.tsx)
- [AdminDashboardPage.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/components/AdminDashboardPage.tsx)
- [GEMINI.md](file:///Users/roor2i/Desktop/sw/conference-registration/GEMINI.md)
- [CLAUDE.md](file:///Users/roor2i/Desktop/sw/conference-registration/CLAUDE.md)

---

## 4. 컴파일 및 빌드 검증 결과

* **백엔드**: `./mvnw clean compile` 빌드 성공 (`BUILD SUCCESS`, 변경으로 인한 타입 충돌 없음).
* **프론트엔드**: `npm run build` 번들링 빌드 정상 통과 (`built successfully`, TypeScript 정적 검사 정상 패스).
