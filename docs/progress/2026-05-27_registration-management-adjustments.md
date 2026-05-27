# IABSE INCHEON 2026 — 작업 이력 (2026-05-27_registration-management-adjustments.md)

이 이력서는 세션 요구사항에 따른 IABSE 등록 및 관리 시스템의 세부 조정 작업을 기록합니다.

---

## 1. 세션 요구사항 원문

1. 계정생성 페이지 (이름/ 소속 입력 칸 하단 안내문구삽입)
Please note that to successfully verify your IABSE membership and access the member registration rate, the **Full Name** and **Affiliation** you enter must exactly match the information registered in your official IABSE membership profile.

If your membership verification fails or you encounter any issues during this process, please do not proceed with the payment. Instead, kindly contact the Secretariat directly at iabse2026@kibse.or.kr for assistance, and we will promptly help verify your status.

2. 등록자 카테고리 수정 필요
- IABSE member / YE가 아닐 시에는 기본으로 Non-member로 표기 현재 Non-member plus로 표기됨.

3. 관리자 페이지
- 등록자 ID번호 다 밀어버리깅

4. 옵션비
Technical Tour 1,2,3 숫자표기 로마자로 변경. 
- Technical Tour Ⅰ 70,000KRW 
- Technical Tour Ⅱ 71,000KRW
- Technical Tour Ⅲ 71,000KRW

옵션 티켓 수량제한
Gala dinner 일반 200개
Gala dinner 영엔지니어 80개
Technical tour 3개 모두 각각 40개

---

## 2. 구현 결과 (완료)

- **계정생성 페이지 안내문구 추가 (완료)**: `SignupPage.tsx`의 소속 선택 콤보박스 하단에 Premium Alert Box 스타일로 안내문구를 정확히 삽입했습니다.
- **등록자 카테고리 디폴트 설정 재매핑 (완료)**: 36세 이상 일반 비회원 가입 시 백엔드 `AuthService.java`에서 `MemberType.NON_MEMBER`를 부여하도록 로직을 수정하고, 프론트엔드 `types/index.ts` 라벨을 `"Non-member"`로 맞추었으며, `RegistrationPage.tsx`에서 비로그인 및 fallback 초기값을 `NON_MEMBER`로 재정의했습니다.
- **관리자 페이지 ID 칼럼 제거 (완료)**: `AdminDashboardPage.tsx`의 Registered Users 탭 및 IABSE Members 탭에서 DB 일련번호 `ID` 칼럼을 th/td 모두 완벽하게 탈거했습니다.
- **Technical Tour 옵션 갱신 (완료)**: `DataInitializer.java`에서 기술 투어 1, 2, 3을 로마자 `Ⅰ, Ⅱ, Ⅲ` 명칭으로 교정하고 투어 Ⅱ와 Ⅲ의 가격을 `71,000 KRW`로 동기화하여, 사용자가 정상 유료 활성 옵션으로 결제 및 선택할 수 있게 마이그레이션했습니다.

---

## 3. 변경 파일 목록

### 신규 파일
- 없음 (계획서 및 검증 Walkthrough 제외)

### 수정 파일
- [SignupPage.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/pages/SignupPage.tsx)
- [AuthService.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/service/AuthService.java)
- [index.ts](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/types/index.ts)
- [RegistrationPage.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/pages/RegistrationPage.tsx)
- [AdminDashboardPage.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/components/AdminDashboardPage.tsx)
- [DataInitializer.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/config/DataInitializer.java)
- [GEMINI.md](file:///Users/roor2i/Desktop/sw/conference-registration/GEMINI.md) (누적 이력 업데이트 예정)

---

## 4. 테스트 결과

- **백엔드 메이븐 통합 테스트 (`./mvnw test`)**: `BUILD SUCCESS` (총 11개 단위/통합 테스트 오류 및 실패 없이 완전 통과)
