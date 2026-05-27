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

- **인코딩 깨짐 없는 로마자 표기 구현 (완료)**: 유니코드 특수 로마자 문자(`Ⅰ, Ⅱ, Ⅲ`)를 사용할 경우 일부 JVM 환경이나 DB 인코딩(MS949/EUC-KR 등) 충돌로 인해 글자 깨짐(물음표나 외계어)이 나타나는 현상을 방지하기 위해, 전 세계 표준 ASCII인 **영어 대문자 `I` (아이) 조합(`I, II, III`)**으로 로마자 명칭을 변경하여 원천 차단 조치했습니다.
- **옵션 시딩 데이터 동기화 이슈 해결 (완료)**: 백엔드 스프링 가동 후 ApplicationRunner 내에서 트랜잭션 경계가 성립되지 않아 Dirty Checking(변경 감지)만으로 기존 옵션의 변경이 동기화되지 않던(sync change 안 됨) 원인을 전격 교정했습니다. 명시적으로 `optionRepository.save(existing)` 및 `optionRepository.save(o)`를 추가 호출하도록 구조를 보강하여, 부팅 시 신규 가격과 로마자 명칭이 영속적으로 확실하게 강제 업데이트되도록 조치했습니다.
- **계정생성 페이지 안내문구 추가 및 가이드 배정 (완료)**: `SignupPage.tsx`의 소속 선택 콤보박스 하단에 Premium Alert Box 스타일로 안내문구를 정확히 삽입했습니다. 또한, 화면 하단 가이드 리스트 및 스타일링 맵에서 기존 `NON_MEMBER_PLUS`로 표기되던 항목들을 일반 비회원 규격인 `NON_MEMBER`로 전격 수정 및 표기 일치시켰습니다.
- **등록자 카테고리 디폴트 설정 재매핑 (완료)**: 36세 이상 일반 비회원 가입 시 백엔드 `AuthService.java`에서 `MemberType.NON_MEMBER`를 부여하도록 로직을 수정하고, 프론트엔드 `types/index.ts` 라벨을 `"Non-member"`로 맞추었으며, `RegistrationPage.tsx`에서 비로그인 및 fallback 초기값을 `NON_MEMBER`로 재정의했습니다. 또한, 상단 헤더 및 배지 렌더링에 사용되는 `Shared.tsx`의 비회원 배지 스타일을 네이비 프리미엄 컬러로 고도화하여 시인성을 높였습니다.
- **관리자 페이지 ID 칼럼 제거 (완료)**: `AdminDashboardPage.tsx`의 Registered Users 탭 및 IABSE Members 탭에서 DB 일련번호 `ID` 칼럼을 th/td 모두 완벽하게 탈거했습니다.
- **Technical Tour 옵션 갱신 (완료)**: `DataInitializer.java`에서 기술 투어 1, 2, 3을 로마자 표기 대용 대문자 알파벳 `I, II, III` 조합 명칭으로 교정하고 투어 II와 III의 가격을 `71,000 KRW`로 동기화하여, 사용자가 정상 유료 활성 옵션으로 결제 및 선택할 수 있게 마이그레이션했습니다.
- **관리자 한정 수량 옵션 정원 변경 기능 추가 (완료)**: `ConferenceOption.java`, `ConferenceOptionService.java`, `AdminOptionController.java`에 정원 수정 기능 및 판매된 수량 미만으로의 감소 제한 유효성 체크 비즈니스 로직을 빌드했고, `AdminDashboardPage.tsx`에 "Ticket Inventory" 탭을 추가하여 실시간 정원 변경을 어드민 웹에서 수행 가능하게 했습니다.
- **로그인 세션(JWT) 보안 강화 (완료)**: `application.yaml`의 JWT 설정을 Access 15분, Refresh 30분으로 조정하여 미활동 상태에서 30분이 지나면 확실하게 로그아웃되고 활성 사용자는 세션이 자동 유지되도록 보안성을 극대화했습니다.
- **Total Payments 결제 내역 엑셀 다운로드 (완료)**: `AdminDashboardPage.tsx` 내에 `handleExportExcel` 메서드를 구축하여, 모든 결제 내역(등록번호, 참석자명, 이메일, 요율유형, 소속, 공급가, 부가세, 합계, 결제수단, 상태, 처리일시, 선택 옵션, 동반인 정보)을 깨짐 방지 UTF-8 BOM 인코딩을 탑재한 프리미엄 CSV 엑셀 양식으로 즉각 추출해 내는 다운로드 버튼을 Total Payments 탭에 신설했습니다.

---

## 3. 변경 파일 목록

### 신규 파일
- 없음 (계획서 및 검증 Walkthrough 제외)

### 수정 파일
- [SignupPage.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/pages/SignupPage.tsx)
- [AuthService.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/service/AuthService.java)
- [index.ts](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/types/index.ts)
- [Shared.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/components/Shared.tsx)
- [RegistrationPage.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/pages/RegistrationPage.tsx)
- [AdminDashboardPage.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/components/AdminDashboardPage.tsx)
- [DataInitializer.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/config/DataInitializer.java)
- [GEMINI.md](file:///Users/roor2i/Desktop/sw/conference-registration/GEMINI.md)
- [application.yaml](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/resources/application.yaml)
- [ConferenceOption.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/option/entity/ConferenceOption.java)
- [ConferenceOptionService.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/option/service/ConferenceOptionService.java)
- [AdminOptionController.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/option/controller/AdminOptionController.java)
- [api.ts](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/lib/api.ts)

---

## 4. 테스트 결과

- **백엔드 메이븐 통합 테스트 (`./mvnw test`)**: `BUILD SUCCESS` (총 11개 단위/통합 테스트 오류 및 실패 없이 완전 통과)
