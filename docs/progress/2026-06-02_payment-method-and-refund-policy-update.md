# 2026-06-02 Payment Method Selector and Refund Policy Update

## 세션 요구사항
1. **결제 방법 선택 영역(Payment Method Selector)**
   - 기존의 단일 카드 결제 연동에서 탈피하여, `Credit / Debit card`와 `Bank transfer` 2종의 라디오 선택 버튼을 제공하도록 개편.
   - `Bank transfer` 선택 시 좌측의 `Notice for Registration Payment` 노란색 안내 창이 동적으로 팝업되도록 바인딩.
   - 계좌이체 선택 시에는 온라인 카드 결제를 차단하기 위해 우측의 `Confirm & Pay` 버튼을 비활성화하고 문구를 `Bank Transfer Selected`로 자동 조절.
2. ** Cancellation & Refund Policy 약관 개정**
   - 기존 약관 타이틀 구조를 `Terms and Conditions` 로 명확화하고 `You have accepted below terms and conditions:` 명시.
   - 이미지의 텍스트에 부합하도록 `Registration Terms and Conditions`, `Registration Cancellation Terms & Conditions`, `Refund Processing`을 정교한 불릿 형태로 전면 갱신.

---

## 구현 결과

### 1. 프론트엔드 (Frontend)
- **컴포넌트 리팩토링 (`Step3Payment.tsx`)**:
  - `paymentMethod` 상태 변수를 도입하여 선택 상태에 따른 유기적인 조건부 UI 연동 구축.
  - 노티스 박스 및 우측 결제 단추의 동적 비활성화 액션 바인딩 완료.
  - 약관 내용 영문 불릿 항목 전체 갱신 완료.

---

## 변경 파일 목록

### Frontend
- `front/src/components/Step3Payment.tsx` (수정)

---

## 테스트 및 검증 결과
- **컴파일 무결성**: TypeScript 타입 빌드 체크 성공.
