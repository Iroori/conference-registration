### 2026-05-19 Gala Dinner Visibility & Verification

- **Branch:** `main`
- **Session Requirements:** 
  1. 사용자 등급에 상관없이 갈라 디너 및 선택 옵션을 자유롭게 선택 가능하도록 구현 (Option C 채택).
  2. 취소 규정 및 동반자 식단 정보 요구사항 검증 (모두 기구현 및 정책 확정).
- **Results:** Completed.
- **Changed Files:**
  - `[MODIFIED]` `back/src/main/java/com/roo/payment/config/DataInitializer.java`
  - `[MODIFIED]` `front/src/types/index.ts`
  - `[MODIFIED]` `front/src/components/StepAdditionalOptions.tsx`
- **Architectural Decisions (ADR):**
  - **Gala Dinner Open Selection:** `DataInitializer`에서 `OPT-GALA-DINNER-YE`의 `allowedMemberType` 제한(MemberType.YOUNG_ENGINEER)을 `null`로 변경하여 모든 사용자에게 옵션을 개방함. 프론트엔드에서도 나이에 따른 UI 분기 로직을 제거하고 일반 갈라 디너(25만원)와 Young Engineer 갈라 디너(20만원)를 동시에 노출시켜 사용자가 임의로 자유롭게 선택할 수 있도록 수정함.
  - **Dietary Requirements for Accompanying Person:** 결제 시점에 동반자의 식단 정보를 받지 않고(운영 효율성 고려), 추후 사무국에서 이메일로 개별 문의를 받기로 정책을 확정(Option B 유지).
