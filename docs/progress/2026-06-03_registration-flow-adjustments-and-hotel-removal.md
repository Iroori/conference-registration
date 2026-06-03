# 2026-06-03 Registration Flow Adjustments and Hotel Page Removal

## 세션 요구사항
1. **Category 탭 IABSE MEMBER 인증 오류 초기화**
   - IABSE MEMBER 카테고리에서 인증을 시도하여 실패해 우측 사이드바에 에러 메시지가 뜬 상태에서, 다른 카테고리를 클릭하면 해당 경고 문구가 다시 사라지도록 개선.
2. **OPTIONS 메뉴 우측 사이드바 반응형 위치 일관성 수정**
   - 모바일 등 화면 폭이 좁은 반응형 레이아웃일 때 OPTIONS 페이지의 사이드바(금액란)가 다른 페이지와 다르게 상단에 위치해 있던 부분을 타 페이지와 동일하게 하단으로 흐르도록 배치 수정.
3. **VISA 탭 선택 상태 가독성 강화 및 Free 문구 제거**
   - 비자 초청장 선택 버튼(Yes/No)의 활성화 구분이 더 쉽도록 남색 테두리(`border-navy`), 남색 배경 틴트(`bg-navy/5`), 남색 글씨(`text-navy font-bold`), 그리고 남색 아웃라인 링(`ring-1 ring-navy`)을 적용하여 라디오 버튼 없이도 강조 효과 제공.
   - 비자 신청 탭의 요약 정보, 최종 등록 확인(Summary/Confirm) 페이지, 그리고 결제 완료 화면을 포함하여 결제 흐름 전체에서 비자 초청장 관련 'Free' 문구 완전 삭제.
4. **HOTEL 페이지 전체 제거**
   - 참가 등록 프로세스에서 숙박 정보 안내 단계('Hotel')를 완전히 제거하여 기존 7개 단계를 6개 단계로 축소 및 페이지 연동 논리 수정.
   - 더 이상 사용되지 않는 `StepAdditionalInfo.tsx` 컴포넌트 파일 삭제.
5. **결제 전 취소정책 규정 문구 업데이트**
   - 결제 단계(`Step3Payment.tsx`)의 취소 및 환불 정책 규정(Cancellation & Refund Policy) 내 Registration Terms, Cancellation Terms, Insurance 섹션의 영문 문구를 최신 변경본으로 업데이트.
6. **옵션 탭 내 갈라 디너 가격 표시 복원**
   - 소셜 프로그램 옵션 선택 카드 내에서 갈라 디너 카드 상단 우측에 가격(`250,000 KRW`) 정보가 시각적으로 표시되도록 원래대로 복원.
7. **Tours 단계 우측 사이드바에 선택된 소셜 프로그램 목록 노출**
   - 이전 단계(Options)에서 선택한 소셜 프로그램들이 기술 투어(Tours) 단계 우측 사이드바에 합산 금액만 들어가고 목록은 누락되었던 점을 개선하여, 선택된 소셜 프로그램 리스트와 소계(Subtotal)를 사이드바에 명확히 표기.
8. **토큰 만료 시 403 Forbidden 오류 및 미로그아웃 해결 (보안 개선)**
   - 백엔드의 Stateless 세션 설정 중 인증 예외 처리의 누락으로 인해, 액세스 토큰 만료 후 보호된 엔드포인트(예: `/api/admin/users`, `/api/payment/history` 등) 호출 시 `401 Unauthorized` 대신 anonymous 권한에 따른 `403 Forbidden`이 반환되어 프론트엔드 인터셉터에서 토큰 갱신 및 로그아웃 유도가 안 되던 현상을 해결.
9. **최종 선택 확인(Summary) 화면 내 Member Type 안내 제거**
   - 최종 등록 확인 단계에서 불필요해진 'Member Type' 항목 표시를 제외하여 UI를 더 정돈되게 개편.
10. **Payment Breakdown 내 Technical Tour 폰트 스타일 일관성 수정**
    - 최종 확인 화면의 우측 금액 상세 명세(Payment Breakdown)에서 기술 투어(Technical Tour) 항목만 굵은 글씨(`font-semibold`)로 튀게 출력되던 현상을 수정하여 다른 항목(등록비, 소셜 프로그램 등)들과 동일하게 일반 글씨체 두께로 통일.

---

## 구현 결과

### 프론트엔드 (Frontend)
- **카테고리 선택 오류 초기화 (`StepRegistrationType.tsx`)**:
  - 카테고리 아이템의 클릭 핸들러인 `handleClick` 내에 `setErrorMessage(null)`를 추가하여 다른 카테고리 클릭 시 멤버십 오류 메시지가 즉시 제거되도록 수정.
- **소셜 프로그램 사이드바 모바일 레이아웃 수정 (`StepAdditionalOptions.tsx`)**:
  - 우측 사이드바의 최상위 컨테이너 클래스에서 모바일 우선 상단 정렬을 지시하던 `order-first lg:order-none` 클래스를 제거하여 다른 단계의 페이지들처럼 하단에 흐르도록 일관성 있게 배치 수정.
- **비자 초청장 페이지 선택 강조 및 가격 텍스트 제거 (`StepInvitationLetter.tsx`)**:
  - Yes/No 카드 버튼의 선택 상태 클래스를 골드에서 네이비 계열 색상(`border-navy`, `bg-navy/5`, `text-navy`, `ring-1 ring-navy`)으로 갱신하여 디자인 가시성 대폭 향상.
  - 우측 선택 요약 패널 내에서 비자 신청 시 노출되던 `<p className="amount-total mt-2">Free</p>` 라벨을 삭제.
  - 다음 단계 버튼의 텍스트를 `Continue to Accommodation`에서 `Continue`로 문구 갱신.
- **등록 확인 화면 비자 가격 제거 (`StepSummary.tsx`)**:
  - 비자 신청 여부 카드 정보 내에 표시되던 `Free` 텍스트를 제거.
  - 우측 결제 금액 상세 명세(Breakdown) 내에 포함되어 있던 비자 초청장 항목 자체를 렌더링에서 완전히 제외하여 가격 관련 표기 통제.
- **결제 완료 화면 비자 가격 제거 (`Step3Payment.tsx`)**:
  - 결제 완료 영수증 카드 내에서 비자 초청장 옵션(`OPT-VISA`)의 경우 가격 영역에 `Free`를 출력하는 대신 공백을 출력하도록 분기 처리.
- **등록 프로세스 단계 간소화 및 Hotel 제거 (`RegistrationPage.tsx`, `types/index.ts`)**:
  - `STEP_LABELS` 배열에서 `'Hotel'` 문자열을 삭제하고 총 6개 단계로 갱신.
  - `STEP_INDEX` 객체와 `RegistrationStep` 타입 유니온에서 `'ADDITIONAL_INFO'`를 삭제하여 단계를 전면 정리.
  - 비자 단계(`INVITATION`)에서 다음으로 진행 시 최종 확인(`SUMMARY`) 단계로 가고, 최종 확인 단계에서 뒤로 이동 시 비자 단계로 복귀하도록 라우팅 논리 동기화.
  - 미사용 컴포넌트인 `StepAdditionalInfo.tsx` 파일 삭제 완료.
- **취소 및 환불 규정 문구 개정 (`Step3Payment.tsx`)**:
  - `Cancellation & Refund Policy` 렌더링 영역 내의 HTML 목록(`<li>`) 항목들의 영문 문구를 유저가 제공한 새로운 규정(Early Bird 100% 환불 및 공제 조항, 7/1~8/26 기간 30% 환불, 대리 참석 무료 변경, No-show 책임 규정, 환불 소요 기간 4주 안내 등)으로 전면 교체.
- **갈라 디너 가격 표시 복원 (`StepAdditionalOptions.tsx`)**:
  - 갈라 디너 선택 카드 헤더 우측 영역에 `{waitlisted ? '0 KRW' : formatKRW(opt.price)}`를 다시 추가하여 가격(250,000 KRW)이 보이도록 복원.
- **기술 투어 단계 소셜 프로그램 목록 노출 (`StepTechnicalTour.tsx`)**:
  - `selectedProgramOptions` 메모이즈 계산 블록을 추가하여, 이전 단계에서 선택한 소셜 프로그램들의 이름과 수량, 개별 단가(대기자는 0 KRW) 및 소셜 프로그램 소계를 우측 사이드바에 렌더링하도록 보완.
- **등록 확인 화면 내 회원 유형 표기 삭제 (`StepSummary.tsx`)**:
  - Personal Details 내부에 표시되던 'Member Type' 항목 렌더링을 삭제하고, 이로 인해 사용되지 않게 된 `MemberTypePill` 컴포넌트 임포트 코드를 제거.
- **등록 확인 화면 내 기술 투어 금액 명세 스타일 통일 (`StepSummary.tsx`)**:
  - Payment Breakdown의 기술 투어 항목 렌더링 코드에서 불일치를 유발하던 `font-semibold` 클래스를 제거하여 다른 요율 상세 항목들과 폰트 두께를 통일성 있게 매칭.

### 백엔드 (Backend)
- **인증 예외 처리 커스텀 엔트리 포인트 등록 (`SecurityConfig.java`)**:
  - `filterChain` 내에 `.exceptionHandling()` 옵션을 추가하여, 미인증 사용자(만료되거나 없는 토큰)가 인가 권한이 필요한 API에 접근해 거부당했을 때 Spring Security 기본값인 anonymous 403이 아닌 표준 규격인 `401 Unauthorized` (JSON 형식) 응답을 반환하도록 설정 완료.

---

## 변경 파일 목록

### Backend
- `back/src/main/java/com/roo/payment/config/SecurityConfig.java` (수정)

### Frontend
- `front/src/types/index.ts` (수정)
- `front/src/pages/RegistrationPage.tsx` (수정)
- `front/src/components/StepRegistrationType.tsx` (수정)
- `front/src/components/StepAdditionalOptions.tsx` (수정)
- `front/src/components/StepInvitationLetter.tsx` (수정)
- `front/src/components/StepSummary.tsx` (수정)
- `front/src/components/Step3Payment.tsx` (수정)
- `front/src/components/StepAdditionalInfo.tsx` (삭제)

---

## 테스트 및 검증 결과
- **프론트엔드 전체 정적 빌드 검증**: `npm run build` 스크립트를 실행하여 TypeScript 형식 정의 불일치나 누락된 모듈/타입 참조 없이 번들링이 완벽하게 완료됨을 확인 (`tsc` 및 `vite build` 정상 통과).
