# 2026-07-20 — 등록비 Regular 요율 일괄 적용 & PechaKucha 신청칸 비활성화

- **브랜치**: `claude/waitlist-offer-payment`
- **PR**: (작성 예정)

---

## 1. 세션 요구사항 (원문)

> 첨부된 것중 REGULAR 항목으로 카테고리들의 금액이 일괄 다변경되어야함. 변경전 꼭 해당사항이 맞는지 물어볼것
> 등록비 옵션중 2.Options SocialProgramme 중 youngEngineer Programme on 16th September 항목중
> iwod like to present in the pechakucha session 선택칸만 disable (화면에선안보이고 코드상에선 주석처리)

첨부 이미지: IABSE INC 2026 등록비 표 (Early Bird / Regular / On-site 3열).

---

## 2. 사전 확인 사항

작업 전 사용자 확인을 받은 항목:

1. **금액 변경 범위** — 첨부 표의 **Regular(until 26 August)** 열 값으로 일괄 적용 → 승인
2. **옵션명 라벨** — `nameEn`의 `"Early Bird — ..."` 접두어를 `"Regular — ..."`로 변경 → 승인

---

## 3. 구현 결과

### 3-1. 등록비 Regular 요율 적용 (완료)

현행 코드는 2026-06-15 커밋(`3b306b4`)에서 3티어 구조가 제거되어 **`OPT-REG-PRE-*` 단일 요율만 활성** 상태였다.
따라서 "Regular로 일괄 변경"은 **이 단일 활성 요율의 금액·라벨을 Regular 기준으로 갱신**하는 작업으로 수행했다.
옵션 ID는 변경하지 않았다 (과거 결제 레코드 FK 무결성 보존).

| 카테고리 | 옵션 ID | 변경 전 | 변경 후 |
|---|---|---|---|
| IABSE Member | `OPT-REG-PRE-MEMBER` | 1,300,000 | **1,450,000** |
| Non-IABSE Member | `OPT-REG-PRE-NM` | 1,400,000 | **1,550,000** |
| Non-IABSE Member Plus | `OPT-REG-PRE-NMP` | 1,500,000 | **1,650,000** |
| Young Engineer | `OPT-REG-PRE-YE` | 800,000 | **900,000** |
| Additional Badge for Exhibitors | `OPT-REG-PRE-EXH` | 500,000 | 500,000 (Regular 동일) |
| Accompanying Person | `OPT-ACCOMP-PRE` | 400,000 | 400,000 (Regular 동일) |

부수 변경:
- `nameKr` `"얼리버드 (...)"` → `"정규등록 (...)"`, `nameEn` `"Early Bird — ..."` → `"Regular — ..."`
- 프론트 티어 라벨 `REG_TIER_CONFIG.PRE_REGISTRATION.label` `'Early Bird'` → `'Regular'`,
  subtitle `'Best rates — limited availability'` → `'Standard registration rate'`

### 3-1-1. "Early Bird / 30 June" 표기 일괄 정리 (완료)

UI에 남아있던 Early Bird·6월 30일 표기를 Regular·8월 26일로 정리했다.

| 위치 | 변경 |
|---|---|
| `application.yaml` (dev/prod) | `pre-registration.end-date` `2026-06-30` → `2026-08-26` |
| `test/resources/application.yaml` | 동일 (`2026-08-26`) — 테스트/운영 기준 불일치 방지 |
| `StepRegistrationType.tsx:183` | 배너 `Early Bird Registration Deadline: 30 June 2026` → `Regular Registration Deadline: 26 August 2026` |
| 요약 패널 3곳 | `StepRegistrationType` / `StepAdditionalOptions` / `StepTechnicalTour` 의 `{tierCfg.label} · Deadline {deadlineLabel(...)}` — 라벨·기간 모두 서버 설정 기반이라 자동으로 `Regular · Deadline 26 August` 렌더링 |

`deadlineLabel()`은 `toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })` 포맷이므로
기존 `30 June`과 동일한 스타일의 **`26 August`**(축약 아님)로 출력된다.

**의도적으로 변경하지 않은 곳** — `Step3Payment.tsx:574` 환불 규정.
이 문장의 "Early Bird period (until 30 June 2026)"는 등록비 티어 라벨이 아니라
**환불 단계의 기준일**이다 (6/30 이전 전액 → 7/1\~8/26 30% → 이후 불가).
기계적으로 `30 June` → `26 August`로 치환하면 "8/26까지 전액 환불"과
"7/1\~8/26은 30% 환불"이 동시에 성립하는 모순 문장이 된다.
사용자 확인 결과 **현행 유지**로 결정했다.

### 3-2. PechaKucha 신청 선택칸 비활성화 (완료)

`StepAdditionalOptions.tsx`의 Young Engineer Programme 마스터 카드에서
`"I would like to present in the Pechakucha session."` `CheckRow`만 **JSX 주석 처리** —
화면에서 사라지되 코드는 보존되어 복구가 용이하다.

하단 PechaKucha 안내 2줄("participants will be selected through a separate process." /
"Further details will be provided by email in due course.")은 **그대로 노출한다.**
선택칸이 없어도 별도 선발 절차와 이메일 안내가 예정되어 있다는 정보는 참가자에게 계속 필요하다.

- 백엔드 시드 `OPT-PECHAKUCHA`는 **유지**했다. 시드에서 제거하면 `DataInitializer.seedOptions()`가
  해당 옵션을 비활성화 처리하고, 이미 신청한 사용자의 결제 상세에서 항목명이 조회되지 않을 수 있다.
- `checkedPecha` 변수는 카드 활성화 상태(`active`) 계산에 계속 쓰이므로 그대로 두었다
  (기존 신청자의 카드 하이라이트가 유지된다).

---

## 4. 변경 파일 목록

### 수정
| 파일 | 내용 |
|---|---|
| `back/src/main/java/com/roo/payment/config/DataInitializer.java` | 등록비 5종 + 동반자 금액·라벨 Regular 기준 갱신 |
| `back/src/main/resources/application.yaml` | dev/prod `pre-registration.end-date` → `2026-08-26` |
| `back/src/test/resources/application.yaml` | 테스트 프로파일 `pre-registration.end-date` → `2026-08-26` |
| `back/src/test/java/com/roo/payment/domain/payment/service/DiscountCodeServiceTest.java` | 등록비 상수 1,300,000 → 1,450,000 반영 |
| `front/src/types/index.ts` | `REG_TIER_CONFIG.PRE_REGISTRATION` 라벨/부제 |
| `front/src/components/StepRegistrationType.tsx` | 상단 등록 마감 배너 문구 Regular / 26 August 반영 |
| `front/src/components/StepAdditionalOptions.tsx` | PechaKucha `CheckRow` + 안내문 주석 처리 |

### 신규
- `docs/progress/2026-07-20_regular-fee-and-pechakucha-disable.md` (본 문서)

---

## 5. 아키텍처 결정 사항 (ADR)

- **ADR-1: 옵션 ID를 유지하고 금액만 갱신** — Regular용 신규 옵션 ID를 만들면 과거 Early Bird
  결제 레코드와 신규 레코드가 분리되어 정산/집계가 복잡해진다. `ConferenceOption.syncFrom()`이
  기동 시 `price`를 덮어쓰므로 시드 수정만으로 반영된다. 단, **과거 결제 레코드의 금액은
  스냅샷으로 별도 보관되어 소급 변경되지 않는다.**
- **ADR-2: PechaKucha는 시드 유지 + 프론트 주석** — 시드 제거는 옵션 비활성화를 유발해
  기존 신청 데이터 표시에 영향을 준다. 표시 계층에서만 차단하는 것이 가역적이고 안전하다.
- **ADR-3: 티어는 날짜와 무관하게 고정** — `end-date`는 표시 전용이며,
  `getCurrentTier()`는 날짜를 보지 않고 `'PRE_REGISTRATION'`을 반환한다.
  기존 주석이 "서버 기간 기반 판정"이라 실제 동작과 반대로 적혀 있어,
  향후 날짜 판정 로직이 잘못 추가되는 것을 막도록 주석을 수정했다. (아래 6절 참조)

---

## 5-1. 마감일 경과 시 티어 자동 전환 여부 (검증 완료)

**전환되지 않는다.** 2026-08-26이 지나도 요금·라벨은 그대로 유지된다.

- 프론트: 티어를 정하는 유일한 지점인 `StepRegistrationType.getCurrentTier()`가
  날짜를 참조하지 않고 `'PRE_REGISTRATION'` 상수를 반환한다.
  이 값이 `onSelect()` → `RegistrationPage.selectedTier` → 하위 스텝으로 그대로 전달된다.
- 백엔드: `AppProperties.Registration`의 날짜는 `RegistrationPeriodsResponse`로
  그대로 직렬화될 뿐, 날짜로 티어/금액을 선택하는 로직이 존재하지 않는다.
  (`LocalDate.now()` 사용처는 회원 나이 계산·토큰 만료뿐)
- `end-date`의 유일한 소비처는 `deadlineLabel()` — 화면의 "Deadline ..." 문구다.

기존 `getCurrentTier()` 주석이 `"서버에서 받은 기간 기반으로 현재 활성 티어 판정"`으로
실제 동작과 **반대로** 적혀 있었다. 누군가 이를 미구현으로 오해하고 날짜 비교를 넣으면
마감일 다음 날부터 폐기된 `OPT-REG-EARLY-*`(DB 비활성) 를 조회해 요금이 사라진다.
이를 막기 위해 주석을 실제 동작·의도·금지사항을 명시하도록 교체했다.

---

## 6. 검증

- `front`: `npx tsc --noEmit` — 통과 (에러 없음)
- `back`: `./mvnw -Dtest=DiscountCodeServiceTest test` — 5건 중 4건 통과.
  `testCreatePaymentWithDiscountCode` 1건 실패하나 **본 변경과 무관한 기존 실패**다.
  `git stash` 후 원본 코드로 재실행하여 동일 실패(`Accompanying person's name (First/Last) is required.`,
  `PaymentService.java:93`)를 확인했다. 금액 단언 이전 `initiatePayment` 단계에서 예외가 발생한다.
  → 별도 후속 수정 필요 (테스트 픽스처에 동반자 이름 누락).

---

## 7. 배포 시 확인 사항

- 운영 서버 `/opt/kssc2026/.env`에 `REG_PRE_END`가 **명시적으로 설정되어 있으면**
  application.yaml 기본값(`2026-08-26`)이 무시된다. 배포 전 해당 값 확인/갱신 필요.
- 재기동 시 `DataInitializer`가 금액을 DB에 동기화하므로 별도 SQL 마이그레이션은 불필요하다.
