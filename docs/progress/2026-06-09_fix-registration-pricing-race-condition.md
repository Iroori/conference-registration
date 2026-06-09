# 2026-06-09 Fix Registration Pricing Race Condition

## 세션 요구사항
1. 국가별 금액 반영 정책 교차 체크 (코드는 수정 금지 지침 우선, 이후 수정 요청에 따라 수정 진행)
2. 해외 사용자에 대해 얼리버드(Early Bird) 요율 대신 현장/일반 요율(Regular)이 적용되는 문제 원인 진단 및 해결

---

## 구현 결과

### 1. 원인 진단 및 아키텍처 검증 (완료)
- 국가별 가격 차이(국내/해외 다르게 산정)를 두는 로직은 존재하지 않으며, 모든 요금은 동일하게 적용되는 상태임을 교차 검증 완료.
- 네트워크 레이턴시가 긴 해외 사용자의 경우, 기간 조회 API `/api/config/registration-periods` 응답이 오기 전 cached/빠른 옵션 목록 API `/api/options`가 먼저 수신되어 요금제 판단 로직(`getCurrentTier`)이 `REGULAR`(현장요금) 등급을 디폴트 옵션 ID로 강제 바인딩하는 레이스 컨디션 버그 발견.
- 이후 기간 로딩이 완료되더라도 1단계 컴포넌트(`StepRegistrationType`) 내 `selectedCategory` 상태값 선점으로 인해 얼리버드로 상태 갱신을 누락(Early Return)하여 일반/현장 가격으로 최종 결제가 청구되었음.

### 2. 프론트엔드 개선 (완료)
- **[StepRegistrationType.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepRegistrationType.tsx)**:
  - `useRegistrationPeriods`가 반환하는 로딩 상태(`isPeriodsLoading`)도 초기 `isLoading` 변수에 함께 결합하여 두 API 정보가 모두 정상 도치된 시점에 첫 컴포넌트 활성화 처리를 진행하도록 수정.
  - 이를 통해 첫 렌더링 시점에 기간이 올바르게 평가되어 얼리버드(`PRE_REGISTRATION`)의 옵션 ID가 기본값으로 부모 컴포넌트에 안전하게 보관됨.

---

## 변경 파일 목록

### Frontend
- **[MODIFY]** [StepRegistrationType.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepRegistrationType.tsx) (수정)

---

## 테스트 및 검증 결과
- **컴파일 빌드 검증**: 로컬 환경에서 `npm run build`를 수행하여, TypeScript 컴파일 및 Vite 프로덕션 빌드가 성공적으로 완료되었음을 검증.
