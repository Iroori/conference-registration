# IABSE INCHEON 2026 — 작업 이력 (2026-05-28_refund-policy-and-tour-prices.md)

이 이력서는 세션 요구사항에 따른 IABSE 결제 직전 화면 취소 정책 문구 수정 및 기술 투어 가격 수정 작업을 기록합니다.

---

## 1. 세션 요구사항 원문

a. 결제 직전 화면 취소 정책 문구 수정 2. General Refund Policy 부분 전체 수정. 아래 내용으로 갈음. 1,3 부분은 동일.
Refunds will be granted based on the date of receipt of the written cancellation request. The following cancellation schedule applies:

- On the Early Bird Registration Deadline (30 June): 100% refund of the registration fee. Please note that all payment processing fees (bank transfer charges and credit card transaction fees) are the responsibility of the participant and will be strictly deducted from the final refund amount.
- From July 1, 2026 and No-shows: No refunds will be issued under any circumstances.

b. Technical Tour 1,2,3 금액 모두 75,000원으로 수정

---

## 2. 구현 결과 (완료)

- **결제 직전 화면 취소 정책 문구 수정 (완료)**:
  - `front/src/components/Step3Payment.tsx` 파일 내 `2. General Refund Policy` 항목 전체를 사용자가 요청한 최신 정책 문안으로 교체했습니다.
  - 사용자가 사전에 동의한 대로, 본문 텍스트 내 존재하던 영문 오타 `'circumstacnes'`를 표준 올바른 철자인 `'circumstances'`로 자연스럽게 정정하여 신뢰성과 완성도를 유지했습니다.
  - 기존 3단계 일정(얼리버드 100% / 레귤러 50% / 최종 미환불)에서 단축된 2단계 신규 환불 가이드 라인(6월 30일까지 100% 환불 후 수수료 차감 / 7월 1일부터 전액 환불 불가 및 노쇼 처리)을 정상 반영했습니다.

- **기술 투어 I, II, III 가격 75,000원 수정 (완료)**:
  - 백엔드 컨퍼런스 옵션 시드 부팅 로더인 `back/src/main/java/com/roo/payment/config/DataInitializer.java` 파일을 수정했습니다.
  - `OPT-TECH-TOUR-1` (기술 투어 I), `OPT-TECH-TOUR-2` (기술 투어 II), `OPT-TECH-TOUR-3` (기술 투어 III) 총 3종의 옵션 기준 가격을 각각 기존 가격에서 **`75,000 KRW`** (`75_000L`)로 동기화했습니다.
  - 백엔드가 부팅될 때 해당 옵션 정보가 `ConferenceOptionRepository`와 데이터베이스에 이미 보존된 기존 currentCount(등록 수량)를 유지한 채 `syncFrom`을 통해 가격 필드만 안전하고 즉각적으로 강제 동기화되도록 설계했습니다.

---

## 3. 변경 파일 목록

### 신규 파일
- [2026-05-28_refund-policy-and-tour-prices.md](file:///Users/roor2i/Desktop/sw/conference-registration/docs/progress/2026-05-28_refund-policy-and-tour-prices.md)

### 수정 파일
- [Step3Payment.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/components/Step3Payment.tsx)
- [DataInitializer.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/config/DataInitializer.java)
- [GEMINI.md](file:///Users/roor2i/Desktop/sw/conference-registration/GEMINI.md)

---

## 4. 빌드 및 테스트 결과

- **백엔드 메이븐 소스 컴파일 (`./mvnw clean compile`)**: 빌드 성공 (`BUILD SUCCESS`)
- **프론트엔드 프로덕션 빌드 (`npm run build`)**: TypeScript 검사 통과 및 Vite 프로덕션 번들링 빌드 정상 통과 (`built successfully`)
