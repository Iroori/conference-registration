# 2026-06-03 Social Programme UI Unification and Policy/Billing/Capacity Updates

## 세션 요구사항
1. **Social Programme (Option Step 2) 내 UI 일관성 확보**
   - 각 옵션 카드 제목의 원색 빨간색(`text-red-600`)을 다른 화면과 유사한 차분한 차콜 글씨(`text-ink font-bold`)로 변경.
   - 각 옵션 카드의 좌측에 타 단계(요율 선택, 기술 투어 등)와 통일된 **골드 원형 라디오 인디케이터** 적용.
   - 각 옵션이 활성화(수량 1 이상 또는 세부 체크박스 선택)되면 골드 활성 상태(`border-gold` + 내부에 골드 점)를 보여주고, 미선택 시에는 빈 회색 원(`border-slate-300`)을 유지하여 시각적 일관성과 동작 방식 통일.
2. **등록비 카테고리 Non-IABSE Member 안내 문구 수정**
   - `NON_MEMBER_PLUS` 카테고리의 1년 회원권 포함 안내 문구(`subLabel`)를 `*Includes a one-year IABSE membership` 로 수정하여 시각적 직관성 확보.
3. **취소 및 환불 정책 규정 내 Insurance 섹션 업데이트**
   - 결제 단계(`Step3Payment.tsx`) 하단에 표시되는 환불 규정 본문에서 기존 `Refund Processing` 섹션을 제거하고, 새로운 여행 및 건강 보험 권고 사항을 다루는 `Insurance` 조항 추가.
4. **마이 프로필 빌링 주소 필드 정보 수정 연동**
   - 가입 유저가 마이 프로필 탭(`MyProfileTab`)에서 본인의 영문 회사/빌링 주소 정보 9개 필드를 직접 수정할 수 있도록 폼 컴포넌트 추가 및 갱신 API 연동.
5. **웰컴 리셉션 (`OPT-WELCOME`) 초기 정원 600명 어드민 편입**
   - 기존 무제한(null) 상태이던 웰컴 리셉션 옵션의 `maxCapacity` 값을 `600`으로 갱신하여 어드민에서 판매 현황 및 재고 한도를 직접 트래킹할 수 있도록 데이터베이스 시드 스키마 조정.
6. **영 엔지니어용 갈라 디너 (`OPT-GALA-DINNER-YE`) 옵션 전면 폐지**
   - 영 엔지니어 전용 무료 갈라 디너 옵션(`OPT-GALA-DINNER-YE`)을 완전히 제거하고, 영 엔지니어 참가자도 일반 참가자와 동일하게 일반 갈라 디너 옵션(`OPT-GALA-DINNER`, 250,000 KRW)을 선택/결제하도록 정책 변경 반영.
7. **갈라 디너 카드 타이틀 옆 가격 표시 (`250,000 KRW`) 제거**
   - Social Programme 단계의 갈라 디너 카드 상단 우측에 표시되던 가격 텍스트 `{formatKRW(opt.price)}`를 삭제하여 화면을 더욱 정갈하게 정리.
8. **관리자 메뉴 (Ticket Inventory)에서 폐지된 갈라 디너 영 엔지니어 옵션 제거**
   - 관리자 페이지의 옵션 재고(Option Ticket Capacities & Inventory) 탭에서 비활성화(active = false)된 옵션이 조회되지 않도록 백엔드 `ConferenceOptionService` 비즈니스 로직을 보완하여 폐지된 영 엔지니어용 갈라 디너(`OPT-GALA-DINNER-YE`)를 완전히 보이지 않게 처리.
   - `front/src/types/index.ts` 내 `DECLINE_LABELS` 맵에서 완전히 폐지된 `'OPT-GALA-DINNER-YE'`를 삭제하여 프론트엔드 코드 청소 완료.

---

## 구현 결과

### 1. 백엔드 (Backend)
- **옵션 시드 갱신 및 조회 필터링 (`DataInitializer.java`, `ConferenceOptionService.java`)**:
  - `OPT-GALA-DINNER-YE` 옵션 선언을 `desiredOptions()` 리스트에서 완전히 제외하여, 서버 재기동 시 데이터베이스상에서 자동으로 비활성화(`active = false`) 처리되도록 구현.
  - `OPT-WELCOME` 옵션의 `maxCapacity` 변수를 `null` -> `600`으로 갱신하여 서버 재기동 시 데이터베이스에 자동 반영 및 동기화 구현.
  - `getAllOptionsForAdmin()` 메서드 내에서 `optionRepository.findAll().stream().filter(...)` 로직을 추가하여 `active = true` 상태인 옵션만 어드민 재고 관리 화면으로 응답하도록 보완.
- **DTO 및 엔티티 동기화 (`UpdateProfileRequest.java`, `AuthResponse.java`)**:
  - 프로필 수정 전용 DTO와 세션 동기화 응답용 DTO에 9가지 빌링 주소 필드를 추가 및 바인딩 완료.
- **컨트롤러 서비스 매핑 (`UserController.java`)**:
  - 유저 정보 변경 시 데이터베이스의 빌링 정보 필드들도 즉시 업데이트 및 정합성 유지가 되도록 기능 통합.

### 2. 프론트엔드 (Frontend)
- **타입 바인딩 및 API 통신 (`types/index.ts`)**:
  - `programOptionIds` 함수 내의 옵션 정렬 목록에서 `'OPT-GALA-DINNER-YE'`를 전면 제거.
  - `DECLINE_LABELS` 맵에서 `'OPT-GALA-DINNER-YE'` 제거.
  - `AuthUser` 및 `UpdateProfileRequest` 타입 인터페이스에 9가지 빌링 주소 필드를 추가하여 전체 타입 안정성 확립.
- **추가 옵션 UI 노출 동기화 및 정비 (`StepAdditionalOptions.tsx`)**:
  - 기존에 영 엔지니어 회원 유형인 경우 일반 갈라 디너(`OPT-GALA-DINNER`)를 감추고 무료 갈라 디너를 보여주도록 되어 있던 `hiddenIds` 숨김 로직을 삭제하여, 모든 회원 유형이 일반 갈라 디너를 동일하게 조회할 수 있도록 변경.
  - 갈라 디너 카드 렌더링 영역 내에서 영 엔지니어 대상 무료 조건부 문구 분기 로직(Free for Young Engineer 등)을 정리하고 표준 갈라 디너 요율로 정규화하여 출력되도록 수정.
  - 갈라 디너 카드 타이틀 우측에 붙어 있던 가격 표시 텍스트 `{formatKRW(opt.price)}`를 완전히 제거하여 직관적인 텍스트 레이아웃 제공.
- **프로필 폼 UI 구현 및 동기화 (`RegistrationPage.tsx` - `MyProfileTab`)**:
  - `MyProfileTab` 컴포넌트 내에 빌링 주소 자가수정을 위한 React state 9개 신설 및 초기 유저 세션 정보 마운트 매핑.
  - 필수 빌링 정보 누락 체크를 위한 프론트엔드 required 및 trim 기반 유효성 검사 로직 보완 및 갱신 API(`apiUpdateProfile`) 호출 연동.

---

## 변경 파일 목록

### Backend
- `back/src/main/java/com/roo/payment/config/DataInitializer.java` (수정)
- `back/src/main/java/com/roo/payment/domain/option/service/ConferenceOptionService.java` (수정)
- `back/src/main/java/com/roo/payment/domain/user/dto/UpdateProfileRequest.java` (수정)
- `back/src/main/java/com/roo/payment/domain/user/dto/AuthResponse.java` (수정)
- `back/src/main/java/com/roo/payment/domain/user/controller/UserController.java` (수정)

### Frontend
- `front/src/types/index.ts` (수정)
- `front/src/pages/RegistrationPage.tsx` (수정)
- `front/src/components/StepAdditionalOptions.tsx` (수정)
- `front/src/components/Step3Payment.tsx` (이전 수정 완료)

---

## 테스트 및 검증 결과
- **백엔드 컴파일 검증**: `mvn clean compile` 수행 결과 backend 소스 코드 및 JPA 매핑 충돌 없이 빌드 성공.
- **프론트엔드 정적 애셋 빌드 검증**: `npm run build` 결과 전 파일에 걸친 TypeScript 타입 선언과 API 호출의 결합 무결성 검사 통과 및 정상 컴파일 성공.
