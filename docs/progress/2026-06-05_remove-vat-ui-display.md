# 2026-06-05 Remove VAT UI Display

## 세션 요구사항
1. **표시되는 부가세(VAT 10%) 계산 및 표시 제거**
   - 결제 내역, 어드민 대시보드 등의 UI 화면에서 10% VAT 부가세 계산 및 내역 표시를 삭제 처리합니다.
   - 단, 영문 빌링 주소(Billing Address)의 참고 필드인 "VAT/CIF/NIF/ other ref." 입력 필드는 그대로 유지합니다.

---

## 구현 결과

### 1. 프론트엔드 (Frontend)
- **결제 내역 탭 (`PaymentHistory.tsx`)**:
  - 개별 결제 영수증 세부 내역에서 Net Price (Subtotal) 및 VAT (10% Tax) 행을 제거하고, **Total Amount Paid**만 표시하도록 간소화하였습니다.
- **관리자 대시보드 (`AdminDashboardPage.tsx`)**:
  - 결제 목록 테이블에서 `Net Amount`, `VAT (10%)` 열을 제거하고 `Total Amount` 단일 열만 보여주도록 컬럼을 병합하였습니다.
  - 이에 따라 테이블의 `colSpan` 속성 값을 `10`에서 `8`로 동기화하였습니다.
  - 결제 상세 정보에서 Net Price 및 VAT (10% Tax)를 삭제하고 **Total Amount Paid**만 표시하도록 `Payment Summary` 카드 영역을 간소화하였습니다.
  - 엑셀 CSV 내보내기 헤더 및 데이터 매핑에서 `Net Amount (KRW)`, `VAT (KRW)` 필드를 삭제하고 `Total Amount (KRW)`로 통합하였습니다.

---

## 변경 파일 목록

### Frontend
- **[MODIFY]** [PaymentHistory.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/PaymentHistory.tsx) (수정)
- **[MODIFY]** [AdminDashboardPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/AdminDashboardPage.tsx) (수정)

---

## 테스트 및 검증 결과
- **프론트엔드 빌드 검증**: `npm run build`를 수행한 결과, 타입 에러 및 Vite 빌드 경고 없이 번들링이 완료되었습니다.
