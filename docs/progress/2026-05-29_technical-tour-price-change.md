# IABSE INCHEON 2026 — 작업 이력 (2026-05-29_technical-tour-price-change.md)

이 이력서는 세션 요구사항에 따른 기술 투어 Ⅰ (Technical Tour I) 옵션 가격 변경 작업을 기록합니다.

---

## 1. 세션 요구사항 원문

옵션비중에 - Technical Tour Ⅰ \90,000로 변경해주라

---

## 2. 구현 결과 (완료)

- **기술 투어 I 가격 90,000원 수정 (완료)**:
  - 백엔드 컨퍼런스 옵션 시드 로더인 `back/src/main/java/com/roo/payment/config/DataInitializer.java` 파일을 수정했습니다.
  - `OPT-TECH-TOUR-1` (기술 투어 I) 옵션의 기준 가격을 기존 `75,000 KRW` (`75_000L`)에서 **`90,000 KRW`** (`90_000L`)으로 수정했습니다.
  - 백엔드 서버 기동 시 기존 옵션 가격 데이터를 유지하는 것이 아니라 `syncFrom` 로직에 의해 변경된 `90,000 KRW` 가격으로 데이터베이스의 컨퍼런스 옵션 기준 정보가 즉각 동기화됩니다.

---

## 3. 변경 파일 목록

### 신규 파일
- [2026-05-29_technical-tour-price-change.md](file:///d:/rooroo저장소/03.Code/cof-reg/docs/progress/2026-05-29_technical-tour-price-change.md)

### 수정 파일
- [DataInitializer.java](file:///d:/rooroo저장소/03.Code/cof-reg/back/src/main/java/com/roo/payment/config/DataInitializer.java)
- [GEMINI.md](file:///d:/rooroo저장소/03.Code/cof-reg/GEMINI.md)
- [CLAUDE.md](file:///d:/rooroo저장소/03.Code/cof-reg/CLAUDE.md)

---

## 4. 빌드 및 테스트 결과

- **백엔드 메이븐 테스트 (`.\mvnw.cmd clean test`)**: 빌드 및 단위 테스트 성공 통과.
