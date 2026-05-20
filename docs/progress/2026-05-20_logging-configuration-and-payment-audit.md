# Logging Configuration, Payment Audit & Itemized Receipt Breakdown — 2026-05-20

## 1. 세션 요구사항 (Requirements)
* 애플리케이션 로그의 **일일 단위 백업(Rolling) 및 파일 저장** 구성.
* 현재 백엔드 서버에서 로그가 파일로 기록되고 있는지 여부 진단.
* **결제 및 주문 데이터** 관련 로그가 보안 요건(마스킹)을 준수하며 상세하게 기록되고 있는지 진단 및 정밀 분석.
* **결제 조회 UI 개선**:
  * **어드민 토탈 결제 관리**: 개별 회원이 결제 시 선택한 모든 세부 옵션의 목록, 개별 가격, 해당 옵션의 카테고리 구분, 그리고 공급가액(Net) + 부가세(VAT 10%) + 최종 과금액(Gross Total)과 동반자(Accompanying Guest) 정보가 일목요연하게 표시되도록 보완.
  * **마이페이지 개인 결제 내역**: 동일하게 개별 세부 옵션, 카테고리, 공급가액, 부가세, 동반자 정보 등을 완벽히 시각화하여 프리미엄 영수증(Breakdown Receipt) 형태로 토글 표시.

---

## 2. 작업 내용 (Implementation Details)
### 2-1. 로그 파일 기록 및 일일 백업 구성
* `logback-spring.xml` 파일을 새롭게 구성하여, 기본 콘솔 출력 외에도 `/logs` 디렉토리에 실시간으로 로그를 파일로 기록하도록 구축했습니다.
* **일일 백업 (Rolling Policy)**: `SizeAndTimeBasedRollingPolicy`를 적용하여 매일 자정 로그 파일을 `logs/backup/app.YYYY-MM-DD.i.log` 형태로 백업하도록 설정했습니다.
* **로그 파일 관리**: 개별 로그 파일 크기는 최대 `10MB`, 로그 보관 기간은 `30일`, 전체 보관 용량 상한선은 `3GB`로 지정하여 무제한 용량 증가로 인한 서버 디스크 풀(Full) 장애를 예방했습니다.

### 2-2. 결제 및 주문 로그 정밀 검증
* `PaymentService.java` 및 `PendingPaymentCleanupScheduler.java` 소스코드를 진단하여, 결제 관련 라이프사이클의 핵심 지점마다 상세히 로그가 기록되고 있음을 검증했습니다.
* **결제 시도 시작**: `[PAYMENT] Attempting payment — email={masked} options={ids} method={method}`
* **중복 결제 차단**: `[PAYMENT] Duplicate payment blocked — email={masked}`
* **PG 연동 유효성**: `[PAYMENT] PG replycode invalid`, `[PAYMENT] PG verification passed`, `[PAYMENT] PG verify API non-200` 및 통신 예외 완벽 로깅.
* **성공 처리**: `[PAYMENT] Payment completed — email={masked} regNo={regNo} amount={amount}`
* **스케줄러 정리**: `[CLEANUP] PENDING → FAILED — id={id} regNo={regNo}` 및 카운트 정리 로깅.
* **보안 준수**: `maskEmail` 헬퍼 메소드를 사용해 로그상 이메일 앞글자를 제외한 문자열을 마스킹(`k***@test.com`) 처리함으로써, 네트워크 감사의 보안 무결성을 보장하고 있습니다.

### 2-3. 어드민 및 사용자 개인 결제 내역 UI 개선 (아코디언 영수증 상세 뷰 추가)
* **어드민 패널 (`AdminDashboardPage.tsx`)**:
  * 각 결제 이력 행에 아코디언 드롭다운 토글 기능(`expandedPaymentId` 상태 및 토글 쉐브론 화살표)을 구현했습니다.
  * 행을 클릭하면 상세 패널이 하단으로 부드럽게 펼쳐지며, **선택한 세부 옵션 아이템 목록(영어/한글명, 카테고리 뱃지, 개별 가격)**, **동반자 등록자 명단**, **과금 요약(Net Subtotal, VAT 10%, Gross Total)**을 미려한 카드 형태로 렌더링합니다.
* **마이페이지 개인 결제 내역 (`PaymentHistory.tsx`)**:
  * 어드민과 동일한 UX를 제공하여 사용자가 본인 결제 내역을 클릭하면 **"Registration Receipt & Breakdown" 상세 카드**가 드롭다운되도록 개발했습니다.
  * 마찬가지로 개별 주문 아이템, 카테고리(Registration, Program, Admin), 개별 옵션 금액, 동반자 이름, Subtotal + VAT + Gross Total 산출 결과를 미학적으로 표현하여 고급스러운 학회 영수증 느낌을 주었습니다.
* **빌드 무결성**: 프론트엔드 TypeScript 프로덕션 컴파일(`npm run build`) 결과, 경고 및 에러 없이 완벽하게 번들링이 완료됨을 확인했습니다.

---

## 3. 변경 파일 목록 (Modified Files)
* [NEW] [logback-spring.xml](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/resources/logback-spring.xml) — 하루 단위 롤링, 파일 보관 기한, 결제 로그 레벨 구성 파일.
* [MODIFY] [AdminDashboardPage.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/components/AdminDashboardPage.tsx) — 어드민 결제 탭에 디테일 아코디언 영수증 카드 및 동반자 뷰 구현.
* [MODIFY] [PaymentHistory.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/components/PaymentHistory.tsx) — 일반 유저 마이페이지 결제 이력에 Receipt 상세 명세 토글 구현.

---

## 4. 향후 과제 (Next Steps)
1. **GitHub Push & AWS 자동 배포**: 로컬 커밋 이후 `main` push를 완료하여 Lightsail 배포 스크립트를 기동했습니다.
2. **배포 및 기능 실시간 검증**: Nginx 정적 파일이 갱신된 후, 어드민 대시보드와 마이페이지에서 상세 영수증이 완벽히 작동하는지 실시간 확인을 진행합니다.

