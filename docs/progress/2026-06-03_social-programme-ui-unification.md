# 2026-06-03 Social Programme UI Unification and Policy Updates

## 세션 요구사항
1. **Social Programme (Option Step 2) 내 UI 일관성 확보**
   - 각 옵션 카드 제목의 원색 빨간색(`text-red-600`)을 다른 화면과 유사한 차분한 차콜 글씨(`text-ink font-bold`)로 변경.
   - 각 옵션 카드의 좌측에 타 단계(요율 선택, 기술 투어 등)와 통일된 **골드 원형 라디오 인디케이터** 적용.
   - 각 옵션이 활성화(수량 1 이상 또는 세부 체크박스 선택)되면 골드 활성 상태(`border-gold` + 내부에 골드 점)를 보여주고, 미선택 시에는 빈 회색 원(`border-slate-300`)을 유지하여 시각적 일관성과 동작 방식 통일.
2. **등록비 카테고리 Non-IABSE Member 안내 문구 수정**
   - `NON_MEMBER_PLUS` 카테고리의 1년 회원권 포함 안내 문구(`subLabel`)를 `*Includes a one-year IABSE membership` 로 수정하여 시각적 직관성 확보.
3. **취소 및 환불 정책 규정 내 Insurance 섹션 업데이트**
   - 결제 단계(`Step3Payment.tsx`) 하단에 표시되는 환불 규정 본문에서 기존 `Refund Processing` 섹션을 제거하고, 새로운 여행 및 건강 보험 권고 사항을 다루는 `Insurance` 조항으로 전면 개정 및 교체.

---

## 구현 결과

### 프론트엔드 (Frontend)
- **추가 옵션 선택 컴포넌트 리팩토링 (`StepAdditionalOptions.tsx`)**:
  - `OPT-WELCOME`(웰컴 리셉션), `OPT-YE-PROGRAM`(영 엔지니어 프로그램), `OPT-GALA-DINNER`/`OPT-GALA-DINNER-YE`(갈라 디너) 및 동반인 카드 전체에 대해 `flex items-start gap-3` 구조를 적용하여 레이아웃을 2-column 형태로 개편.
  - 카드 제목 영역에 지정되어 있던 원색 빨강(`text-red-600`) 스타일을 `text-ink`로 전면 교체.
  - 각 카드의 좌측 영역에 원형 라디오 인디케이터(`span` 태그와 내부 골드 원)를 추가하여, 활성화 시 동적으로 활성화(Gold Circle) 상태를 피드백하도록 바인딩.
- **카테고리 메타데이터 수정 (`types/index.ts`)**:
  - `NON_MEMBER_PLUS` 카테고리의 subLabel을 `'includes 1 year IABSE membership'` -> `'*Includes a one-year IABSE membership'`으로 포맷 조정 및 업데이트.
- **결제 규정 정보 개정 (`Step3Payment.tsx`)**:
  - 취소 및 환불 가이드 라인 중 `Refund Processing` 부분을 탈거하고, `Insurance` 규정 및 권고 문구(Participants are highly advised to arrange their own personal travel and health insurance...)를 새로이 삽입.

---

## 변경 파일 목록

### Frontend
- `front/src/components/StepAdditionalOptions.tsx` (수정)
- `front/src/types/index.ts` (수정)
- `front/src/components/Step3Payment.tsx` (수정)

---

## 테스트 및 검증 결과
- **프론트엔드 빌드 무결성**: `npm run build` 결과 TypeScript 컴파일 및 Vite 정적 애셋 빌드 프로세스 모두 무결하게 성공 완료.
