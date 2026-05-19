# 2026-05-19 — 등록비/옵션비 개편

## 작업 정보
- 브랜치: `claude/update-registration-fees-NcTBA`
- PR: (미생성)

## 세션 요구사항 (원문 요약)
1. **등록비 (Registration select 탭)**
   - 금액은 전부 KRW 기준 표시
   - 카테고리를 모두 노출해 사용자가 직접 선택
   - IABSE Member 카테고리는 로그인 유저가 IABSE 회원이 아니면 선택 불가
   - "Additional Badge for Exhibitors" 카테고리 추가 (별도 안내 문구 영역만 확보, 문구 미정)
   - 기간 3티어 × 카테고리 5종 금액 갱신
2. **옵션비 (Option 탭)**
   - 선택 사항(Optional) — 미선택해도 진행 가능
   - 체크 1개 = 1 Count
   - 정원 제한 옵션은 판매/잔여 수량을 데이터로 관리, 마감 시 사용자에게 안내(수량 미노출)
   - 각 옵션의 description 문구를 옵션 아래 설명으로 표시
   - Accompanying Person: lastName/firstName 입력 칸 + 별도 저장, 기간별 금액 상이

## 구현 결과 (완료)
### 등록비
- 등록 기간 3티어 날짜 변경: 사전등록 ~6/30, 얼리버드 7/1~8/31, 일반등록 9/14~
  (`application.yaml`, dev/prod 공통)
- 등록비 카테고리 5종(IABSE Member / Non-IABSE Member / IABSE-Non Member Plus /
  Young Engineer / Additional Badge for Exhibitors) × 3티어 = 15개 옵션 시드
- 등록비 옵션은 모든 회원 유형에 노출(`allowedMemberType = null`), 카테고리 잠금은
  프론트엔드에서 처리 — IABSE Member 카테고리만 비IABSE 회원에게 잠금
- `StepRegistrationType` 을 현재 기간 기준 5개 카테고리 선택 UI로 재구성
- Exhibitor 카테고리에 안내 문구 영역(placeholder) 확보

### 옵션비
- Welcome Reception(무료, 무제한) / Gala Dinner(일반 25만·200석, YE 20만·80석) /
  Technical Tour 1(7만·40석) / Tour 2·3(금액 미정·40석) / Accompanying Person(기간별 35/35/40만)
- Gala Dinner는 일반/Young Engineer 별도 옵션으로 분리 (가격·정원 상이)
- Accompanying Person은 기간별 3개 옵션 (`OPT-ACCOMP-PRE/EARLY/REGULAR`)
- 옵션 description을 DB `description` 필드에 저장 → 옵션 카드 설명으로 표시
- Welcome/Gala는 "I will not attend …" 거절 체크박스 추가, Welcome은 기본 선택(참석)
- 마감 옵션: `available=false` 만 노출(잔여 수량 비공개), "Sold Out" 안내
- 금액 미정 투어: "Price TBA" 표시 + 선택 비활성화

### 동반자(Accompanying Person) 데이터
- 신규 엔티티 `AccompanyingPerson` (`accompanying_persons` 테이블, payment 1:1)
- `PaymentRequest.accompanyingPerson`(lastName/firstName) 수신, 동반자 옵션 선택 시 필수 검증
- `PaymentResponse.accompanyingPerson` 응답 포함, 완료 화면에 동반자 이름 표시

### 시드 동기화
- `DataInitializer.seedOptions()` 를 기동 시 항상 동기화하도록 변경
  (신규 insert / 기존 가격·정원·문구 갱신 / 미사용 옵션 비활성화, `currentCount` 보존)

## 변경 파일
### 백엔드 (신규)
- `domain/payment/entity/AccompanyingPerson.java`
### 백엔드 (수정)
- `config/DataInitializer.java`, `config/.../application.yaml`
- `domain/option/entity/ConferenceOption.java` (`syncFrom`, `deactivate`)
- `domain/payment/entity/Payment.java`, `dto/PaymentRequest.java`, `dto/PaymentResponse.java`
- `domain/payment/service/PaymentService.java`
- `common/exception/ErrorCode.java` (`ACCOMPANYING_NAME_REQUIRED`)
### 프론트엔드 (수정)
- `types/index.ts`, `pages/RegistrationPage.tsx`
- `components/StepRegistrationType.tsx`, `StepAdditionalOptions.tsx`,
  `StepSummary.tsx`, `Step3Payment.tsx`

## 아키텍처 결정 (ADR)
- 등록비 카테고리 잠금은 백엔드 필터링이 아닌 프론트엔드에서 처리 — 모든 카테고리를
  노출해야 하므로 등록비 옵션의 `allowedMemberType` 을 null 로 두었다.
- Gala Dinner는 가격·정원이 회원 유형별로 달라 단일 옵션으로 표현 불가 → 일반/YE 2개
  옵션으로 분리하고 YE 옵션은 `allowedMemberType=YOUNG_ENGINEER` 로 필터링.
- Accompanying Person 요금이 등록 기간에 연동되므로 등록비와 동일하게 3개 기간 옵션으로 구성.
- 등록비/옵션 시드를 기동 시 항상 동기화 — 가격이 시드 기준으로 관리되며 별도 관리자
  편집 UI가 없으므로 시드를 단일 출처(source of truth)로 삼았다. 판매 수량은 보존한다.

## 추가 작업 (동일 세션)
### 회원가입 — 식단 요구사항
- `DietaryRequirement` enum(NONE/VEGETARIAN/HALAL/OTHER) 추가
- `User` 에 `dietaryRequirement`·`dietaryNote` 컬럼 추가 (`assignDietaryRequirement`)
- `SignupRequest`·`AuthResponse` 에 필드 추가, OTHER 선택 시 상세 내용 필수 검증
- 회원가입 폼 Personal Details 섹션에 라디오 그룹 + "Other" 상세 입력칸 추가

### 취소·환불 규정 동의
- 결제 단계(`Step3Payment`)에 취소·환불 규정 전문 표시
- "I have read and agree to the Cancellation and Refund Policy" 체크박스 추가
- 동의 체크 전에는 결제 버튼 비활성화 (프론트엔드 게이트)

### 변경 파일 (추가분)
- 백엔드 신규: `domain/user/entity/DietaryRequirement.java`
- 백엔드 수정: `domain/user/entity/User.java`, `dto/SignupRequest.java`,
  `dto/AuthResponse.java`, `service/AuthService.java`
- 프론트엔드 수정: `types/index.ts`, `pages/SignupPage.tsx`, `components/Step3Payment.tsx`

## 참고 — 옵션 ID
- 등록비: `OPT-REG-PRE-*`, `OPT-REG-EARLY-*`, `OPT-REG-*` (MEMBER/NM/NMP/YE/EXH)
- 옵션비: `OPT-WELCOME`, `OPT-GALA-DINNER`, `OPT-GALA-DINNER-YE`,
  `OPT-TECH-TOUR-1/2/3`, `OPT-ACCOMP-PRE/EARLY/REGULAR`, `OPT-VISA`
