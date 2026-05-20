### 2026-05-20 Gala Dinner — MemberType 기반 노출 제한

- **Branch:** `main`
- **Session Requirements:**
  Additional Options 단계에서 Young Engineer 사용자에게는 Young Engineer 갈라 디너(₩200,000)만,
  그 외 모든 사용자(MEMBER / NON_MEMBER / NON_MEMBER_PLUS)에게는 일반 갈라 디너(₩250,000)만 노출.
- **Results:** Completed.
- **Changed Files:**
  - `[MODIFIED]` `back/src/main/java/com/roo/payment/config/DataInitializer.java`
  - `[MODIFIED]` `front/src/components/StepAdditionalOptions.tsx`
- **Architectural Decisions (ADR):**
  - **이전 결정 번복 (2026-05-19 Option C → Restricted):** `2026-05-19_gala-dinner-visibility.md`에서 모든 사용자가 두 갈라 옵션을 자유롭게 선택할 수 있도록 개방했던 정책을 뒤집음. 가격이 다른 동일 행사에 대해 사용자가 멤버 유형과 불일치하는 옵션을 임의로 고를 수 있는 것은 운영상 혼선을 유발한다는 판단.
  - **백엔드 단일 잠금, 프론트 보조 필터 (비대칭 설계):** `ConferenceOption.allowedMemberType`이 단일 값 컬럼이라 한 옵션을 3개 유형에만 허용하는 직접 표현이 불가. 이에 비대칭 전략 채택:
    - `OPT-GALA-DINNER-YE` → `allowedMemberType = YOUNG_ENGINEER`로 잠금 → 비-YE 사용자는 API 응답 단계에서 자동 제외(서버 강제).
    - `OPT-GALA-DINNER` → `allowedMemberType = null` 유지 → YE 사용자에 대해서만 프론트엔드 `StepAdditionalOptions` `useMemo`에서 한 줄 필터로 숨김.
    - 결과: YE가 일반 250k 옵션을 API로 직접 결제 우회하는 것은 막지 못하나, 그 반대(일반 사용자가 YE 할인 옵션을 우회 결제) 시나리오는 서버에서 차단됨. 후자가 더 위험한 케이스라 절반의 안전망으로 충분하다고 판단.
  - **스키마 확장은 도입하지 않음:** `Set<MemberType> allowedMemberTypes`로의 다중 허용 확장이 더 일관된 해결이나, 본 변경 범위에서는 과한 작업으로 판단해 보류. 향후 유사 정책(예: Tech Tour를 MEMBER+YE에게만 등)이 다시 등장하면 그 시점에 스키마 리팩토링을 재검토.
  - **DB 마이그레이션 불필요:** `DataInitializer.syncOptions()`가 기동 시 기존 row의 `allowedMemberType`을 desired 정의로 덮어쓰므로 운영 DB도 재시작만으로 반영됨.
