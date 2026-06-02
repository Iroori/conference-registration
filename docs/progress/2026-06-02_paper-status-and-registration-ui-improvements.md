# 2026-06-02 Paper Status Checkboxes and Registration UI Improvements

## 세션 요구사항
1. 회원가입 페이지에서 논문 저자 및 발표자 상태 독립 체크박스 수집 (Paper Author and Presenter Status)
   - "I am an author or co-author of a paper at the Congress."
   - "I am the presenter of a paper at the Congress."
   - "Please enter your paper number or title here." 입력란 신설 (placeholder: 123 or A Novel Bridge Design…)
   - 하단에 옅은 안내 문구 배치
2. 등록 요율 테이블 최신화 반영 (얼리버드, 일반, 현장등록 가격 상/하향 업데이트)
3. 로그인 후 등록 카테고리(Registration Category) 화면 UI 최적화:
   - 상단 "Current Period" 노란색 뱃지 제거
   - 카테고리 라벨 대문자화 및 설명 subtext 줄바꿈 하단 분리 배치
   - Young Engineer 생년월일 입력을 브라우저 언어 환경 무관 영문 고정을 위한 Year/Month/Day 3단 영문 select 드롭다운으로 개편
   - Step 2와 요약 탭의 "Additional Programs" 라벨 및 설명을 삭제하고 "Social Programme"으로 갱신
   - 어드민 대시보드 회원 목록 테이블에 저자(Author) 여부 표시 열 추가

---

## 구현 결과

### 1. 백엔드 (Backend)
- **User 엔티티 필드 확장**: `User.java`에 `author` 필드(boolean) 추가 및 DB 자동 DDL 갱신(`ddl-auto: update`를 통해 반영).
- **DTO 및 프로세스 동기화**: `SignupRequest`, `AuthResponse`, `AdminUserResponse`에 저자 필드를 추가하여 가입, 인증, 어드민 조회 간 무결한 직렬화 지원.
- **등록 요율 시드 갱신**: `DataInitializer.java` 내의 3티어 등록 가격 조정 완료.

### 2. 프론트엔드 (Frontend)
- **체크박스 및 마크업 개편**: `SignupPage.tsx`에서 독립적인 두 개의 체크박스로 논문 상태 수집 및 세련된 연한 회색 안내 문구 적용.
- **카테고리 뷰 리스타일링**: `StepRegistrationType.tsx`에서 노란 뱃지를 제거하고, 대문자 메인 타이틀 아래 옅은 subLabel로 부연 설명을 깔끔하게 수직 정렬.
- **3단 영문 생년월일 셀렉터**: 한국어 "연도-월-일" 달력 대신 100% 영문 Year/Month/Day 셀렉터를 제공하여 로케일 이슈 완벽 해결.
- **사회 프로그램 명칭 갱신**: Step 2와 요약 탭의 명칭을 "Social Programme"으로 통일하고 예전 설명문을 탈거하여 가독성 증대.
- **어드민 목록 확장**: 어드민 사용자 목록 테이블에 `Author` 열을 신설하고 YES/No 상태 배지를 표기하여 어드민 시인성 극대화.

---

## 변경 파일 목록

### Backend
- `back/src/main/java/com/roo/payment/domain/user/entity/User.java` (수정)
- `back/src/main/java/com/roo/payment/domain/user/dto/SignupRequest.java` (수정)
- `back/src/main/java/com/roo/payment/domain/user/dto/AuthResponse.java` (수정)
- `back/src/main/java/com/roo/payment/domain/user/dto/AdminUserResponse.java` (수정)
- `back/src/main/java/com/roo/payment/domain/user/service/AuthService.java` (수정)
- `back/src/main/java/com/roo/payment/config/DataInitializer.java` (수정)

### Frontend
- `front/src/types/index.ts` (수정)
- `front/src/pages/SignupPage.tsx` (수정)
- `front/src/components/StepRegistrationType.tsx` (수정)
- `front/src/components/StepAdditionalOptions.tsx` (수정)
- `front/src/components/StepSummary.tsx` (수정)
- `front/src/components/AdminDashboardPage.tsx` (수정)

---

## 테스트 및 검증 결과
- **프론트엔드 프로덕션 빌드**: `npm run build` 결과, 정적 타입 오류 없이 컴파일 완벽 성공.
- **백엔드 빌드 및 JUnit 검증**: `./mvnw test` 결과, 11개 단위 테스트 모두 통과 (Failures: 0, Errors: 0).
