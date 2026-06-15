# 2026-06-15 Admin Registered Users Details & Ticket Inventory Bug Fix

## 세션 요구사항
1. [REGISTERED USERS] 항목에 계정 생성 시 등록자가 입력했던 개인정보가 모두 표시되도록 변경 요청.
2. 티켓 인벤토리 수량 변경 시, 2~3일 후면 초기 설정 수량으로 계속 되돌아감. 오류 확인 필요.

---

## 구현 결과

### 1. 가입자 상세 개인정보 아코디언 펼치기 영역 구현 (완료)
- **DTO 및 엔티티 매핑 확장:** 
  - [AdminUserResponse.java](file:///Users/rrlee/ETC/conference-registration/back/src/main/java/com/roo/payment/domain/user/dto/AdminUserResponse.java)에 식단 정보(`dietaryRequirement`, `dietaryNote`), IABSE ID(`iabseId`) 및 영문 결제 주소 9개 필드를 전부 포함하도록 레코드 구조와 static `from()` mapper를 수정했습니다.
- **프론트엔드 타입 정의 갱신:**
  - [index.ts](file:///Users/rrlee/ETC/conference-registration/front/src/types/index.ts) 내 `AdminUser` 타입 인터페이스에 위의 새로운 백엔드 필드들을 추가했습니다.
- **Admin 대시보드 UI 개선:**
  - [AdminDashboardPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/AdminDashboardPage.tsx)에서 각 가입자 행을 클릭하면 하단으로 상세 프로필 카드가 미려하게 펼쳐지는 inline expandable accordion panel(접기/펼치기)을 구현했습니다.
  - 펼침 카드 내부에는 **개인 정보/연락처**, **소속 및 식단 요구사항**, **빌링 주소(PO 번호, 우편번호, 주소 등)**가 3컬럼 반응형 그리드로 정돈되어 표시됩니다.
  - 가 등급 변경(Manual Grade Control) 및 삭제(Delete) 등 개별 액션 클릭 시 접기/펼치기가 불필요하게 트리거되는 것을 방지하기 위해 `e.stopPropagation()`을 적용했습니다.

### 2. 티켓 인벤토리 수량 초기화 오류 규명 및 해결 (완료)
- **원인 분석:**
  - 서버 기동 시 실행되는 `DataInitializer.seedOptions()`에서, 이미 DB에 생성된 옵션이 있더라도 `existing.syncFrom(d)`을 매번 호출하였습니다.
  - `ConferenceOption.java`의 `syncFrom()` 메서드가 가격, 활성화 여부 등과 함께 `maxCapacity` 필드까지 코드에 하드코딩되어 있던 초기값(갈라 디너 200, 웰컴 리셉션 600 등)으로 덮어쓰고 있었음이 확인되었습니다. 이 때문에 2~3일 간격으로 배포나 서버 재기동이 발생할 때마다 변경된 수량이 무시되고 초기화되었습니다.
- **해결책:**
  - [ConferenceOption.java](file:///Users/rrlee/ETC/conference-registration/back/src/main/java/com/roo/payment/domain/option/entity/ConferenceOption.java)의 `syncFrom()` 메서드에서 `maxCapacity` 필드를 덮어씌우는 동기화 라인을 제거했습니다.
  - 이를 통해 새로운 옵션 생성 시에는 기본 수량이 올바르게 삽입되지만, 이미 생성된 기존 옵션들의 정원은 관리자가 어드민 페이지에서 수정한 상태 그대로 영구히 보존됩니다.

---

## 변경 파일 목록

### Backend
- **[MODIFY]** [AdminUserResponse.java](file:///Users/rrlee/ETC/conference-registration/back/src/main/java/com/roo/payment/domain/user/dto/AdminUserResponse.java) — 가입자 정보 DTO 확장
- **[MODIFY]** [ConferenceOption.java](file:///Users/rrlee/ETC/conference-registration/back/src/main/java/com/roo/payment/domain/option/entity/ConferenceOption.java) — 부트 시 maxCapacity 덮어쓰기 로직 제거

### Frontend
- **[MODIFY]** [index.ts](file:///Users/rrlee/ETC/conference-registration/front/src/types/index.ts) — AdminUser TypeScript 인터페이스 필드 추가
- **[MODIFY]** [AdminDashboardPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/AdminDashboardPage.tsx) — inline expandable accordion UI 구현 및 액션 차단 이벤트 전파 제어

---

## 테스트 및 검증 결과
- **백엔드 테스트:** `mvnw clean test` 결과 총 21개 통합 및 단위 테스트 케이스 100% 통과 (Failures: 0, Errors: 0).
- **프론트엔드 빌드:** `npm run build`를 통해 TypeScript 컴파일(`tsc`) 및 Vite 프로덕션 번들 빌드가 정상 동작 및 무오류 성공 확인.
