# 2026-06-03 Social Programme UI Unification and Policy/Billing/Capacity Updates

## 세션 요구사항
1. **Social Programme (Option Step 2) 내 UI 일관성 확보**
   - 각 옵션 카드 제목의 원색 빨간색(`text-red-600`)을 다른 화면과 유사한 차분한 차콜 글씨(`text-ink font-bold`)로 변경.
   - 각 옵션 카드의 좌측에 타 단계(요율 선택, 기술 투어 등)와 통일된 **골드 원형 라디오 인디케이터** 적용.
   - 각 옵션이 활성화(수량 1 이상 또는 세부 체크박스 선택)되면 골드 활성 상태(`border-gold` + 내부에 골드 점)를 보여주고, 미선택 시에는 빈 회색 원(`border-slate-300`)을 유지하여 시각적 일관성과 동작 방식 통일.
2. **등록비 카테고리 Non-IABSE Member 안내 문구 수정**
   - `NON_MEMBER_PLUS` 카테고리의 1년 회원권 포함 안내 문구(`subLabel`)를 `*Includes a one-year IABSE membership` 로 수정하여 시각적 직관성 확보.
3. **취소 및 환불 정책 규정 내 Insurance 섹션 업데이트**
   - 결제 단계(`Step3Payment.tsx`) 하단에 표시되는 환불 규정 본문에서 기존 `Refund Processing` 섹션을 제거하고, 새로운 여행 및 건강 보험 권고 사항을 다루는 `Insurance` 조항으로 전면 개정 및 교체.
4. **개인정보 수정(My Profile) 페이지 내 빌링 주소(Billing Address) 자가수정 기능 연동**
   - 기존에 인적 사항 위주로만 제한되었던 프로필 직접 수정(`MyProfileTab`) 영역에 회원가입 시 받았던 빌링 주소 9가지 필드를 모두 연동.
   - 프론트엔드 입력 폼, 백엔드 DTO, 엔티티 바인딩 및 세션 업데이트용 인증 응답 DTO(`AuthResponse`)에 걸친 전체 파이프라인 동기화 구축.
5. **Welcome Reception (`OPT-WELCOME`) 초기 최대 정원(Max Capacity) 설정**
   - 기존에 정원 무제한(`maxCapacity = null`)으로 설정되어 있었던 웰컴 리셉션 옵션을 초기 최대 정원 **600명**으로 재설정.
   - 어드민의 **Ticket Inventory** 관리 리스트에 웰컴 리셉션이 정상적으로 노출되도록 동기화하여, 관리자가 정원을 유연하게 실시간 조정할 수 있도록 지원.
6. **영 엔지니어용 갈라 디너 (`OPT-GALA-DINNER-YE`) 옵션 전면 폐지**
   - 영 엔지니어 전용 무료 갈라 디너 옵션(`OPT-GALA-DINNER-YE`)을 완전히 제거하고, 영 엔지니어 참가자도 일반 참가자와 동일하게 일반 갈라 디너 옵션(`OPT-GALA-DINNER`, 250,000 KRW)을 선택/결제하도록 정책 변경 반영.

---

## 구현 결과

### 1. 백엔드 (Backend)
- **옵션 시드 갱신 (`DataInitializer.java`)**:
  - `OPT-GALA-DINNER-YE` 옵션 선언을 `desiredOptions()` 리스트에서 완전히 제외하여, 서버 재기동 시 데이터베이스상에서 자동으로 비활성화(`active = false`) 처리되도록 구현.
  - `OPT-WELCOME` 옵션의 `maxCapacity` 변수를 `null` -> `600`으로 갱신하여 서버 재기동 시 데이터베이스에 자동 반영 및 동기화 구현.
- **DTO 및 엔티티 동기화 (`UpdateProfileRequest.java`, `AuthResponse.java`)**:
  - 프로필 수정 전용 DTO와 세션 동기화 응답용 DTO에 `billingUniversity`, `billingVat`, `billingPoNumber`, `billingStreet`, `billingAdditionalInfo`, `billingPoBox`, `billingPostcode`, `billingCity`, `billingCountry` 9가지 필드를 온전히 추가 및 바인딩 완료.
- **컨트롤러 서비스 매핑 (`UserController.java`)**:
  - 기존 인적 사항 업데이트 흐름에 연달아 `user.assignBillingAddress(...)` 비즈니스 로직을 호출하여, 유저 정보 변경 시 데이터베이스의 빌링 정보 필드들도 즉시 업데이트 및 정합성 유지가 되도록 기능 통합.

### 2. 프론트엔드 (Frontend)
- **타입 바인딩 및 API 통신 (`types/index.ts`)**:
  - `programOptionIds` 함수 내의 옵션 정렬 목록에서 `'OPT-GALA-DINNER-YE'`를 전면 제거.
  - `AuthUser` 및 `UpdateProfileRequest` 타입 인터페이스에 9가지 빌링 주소 필드를 추가하여 전체 타입 안정성 확립.
- **추가 옵션 UI 노출 동기화 (`StepAdditionalOptions.tsx`)**:
  - 기존에 영 엔지니어 회원 유형인 경우 일반 갈라 디너(`OPT-GALA-DINNER`)를 감추고 무료 갈라 디너를 보여주도록 되어 있던 `hiddenIds` 숨김 로직을 삭제하여, 모든 회원 유형이 일반 갈라 디너를 동일하게 조회할 수 있도록 변경.
  - 갈라 디너 카드 렌더링 영역 내에서 영 엔지니어 대상 무료 조건부 문구 분기 로직(Free for Young Engineer 등)을 정리하고 표준 갈라 디너 요율(250,000 KRW)로 정규화하여 출력되도록 수정.
- **프로필 폼 UI 구현 및 동기화 (`RegistrationPage.tsx` - `MyProfileTab`)**:
  - `MyProfileTab` 컴포넌트 내에 빌링 주소 자가수정을 위한 React state 9개 신설 및 초기 유저 세션 정보 마운트 매핑.
  - 필수 빌링 정보 누락 체크를 위한 프론트엔드 required 및 trim 기반 유효성 검사 로직 보완 및 갱신 API(`apiUpdateProfile`) 호출 연동.

---

## 변경 파일 목록

### Backend
- `back/src/main/java/com/roo/payment/config/DataInitializer.java` (수정)
- `back/src/main/java/com/roo/payment/domain/user/dto/UpdateProfileRequest.java` (수정)
- `back/src/main/java/com/roo/payment/domain/user/dto/AuthResponse.java` (수정)
- `back/src/main/java/com/roo/payment/domain/user/controller/UserController.java` (수정)

### Frontend
- `front/src/types/index.ts` (수정)
- `front/src/pages/RegistrationPage.tsx` (수정)
- `front/src/components/StepAdditionalOptions.tsx` (수정)
- `front/src/components/Step3Payment.tsx` (기이전 수정 완료)

---

## 테스트 및 검증 결과
- **백엔드 컴파일 검증**: `mvn clean compile` 수행 결과 backend 소스 코드 및 JPA 매핑 충돌 없이 빌드 성공.
- **프론트엔드 정적 애셋 빌드 검증**: `npm run build` 결과 전 파일에 걸친 TypeScript 타입 선언과 API 호출의 결합 무결성 검사 통과 및 정상 컴파일 성공.
