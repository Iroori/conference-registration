# [2026-03-31] 등록·결제 플로우 전면 재설계 및 보안 강화

> **브랜치**: `claude/priceless-clarke`
> **커밋**: `5d38e8f` (기능) → `9f5032c` (보안)
> **PR**: https://github.com/Iroori/conference-registration/pull/new/claude/priceless-clarke
> **작업자**: Claude Sonnet 4.6

---

## 1. 세션 요구사항 (작업 전 원문)

### 1-1. 회원가입 페이지

| # | 요구사항 | 상세 |
|---|----------|------|
| R-01 | **개인정보 수집·이용 동의** 섹션 삽입 | 내용은 비워두고 항목(테이블 레이아웃)만 사전 구성 |
| R-02 | **국가 선택 드롭다운** 추가 | 영문 국가명 목록 (60개국+) |
| R-03 | **논문 발표자 여부** 체크박스 추가 | "I am presenting a paper at KSSC 2026" |

### 1-2. 결제 화면 (전면 재설계)

| # | 요구사항 | 상세 |
|---|----------|------|
| R-04 | **등록 유형 3단계** (시기별 가격 상이) | 사전등록 / 얼리버드 / 일반등록 |
| R-05 | **회원 구분별 가격** | Member · Non-Member · Non-Member Plus · Young Engineer |
| R-06 | Member 기준 | IABSE 등록 이메일 일치 시 |
| R-07 | Young Engineer 기준 | 만 36세 미만 |
| R-08 | **추가 옵션 수량 선택** (6종) | Welcome Reception · Congress Dinner · Technical Tour · Young Engineers Program · Accompanying Person · Workshop |
| R-09 | **Invitation Letter 필요 여부** | 결제 옵션 선택 후 팝업 형태 |
| R-10 | **정보 요약 및 최종 결제 금액 안내 페이지** | 이전 입력 정보 Edit 기능 포함 |
| R-11 | **모든 페이지 영어 작성** | UI 문구 전체 |

### 1-3. 보안 (별도 요청)

| # | 요구사항 | 상세 |
|---|----------|------|
| R-12 | **/login payload 비밀번호 평문 전송 차단** | 브라우저 Network 탭에서 비밀번호 노출 방지 |

---

## 2. 구현 결과 (완료)

### 2-1. 완료 항목

| # | 요구사항 | 상태 | 구현 내용 |
|---|----------|------|----------|
| R-01 | 개인정보 동의 섹션 | ✅ 완료 | 4개 항목 테이블 레이아웃 + 동의 체크박스, 미동의 시 가입 불가 처리 |
| R-02 | 국가 선택 드롭다운 | ✅ 완료 | 64개국 영문명 목록, 기본값 `South Korea` |
| R-03 | 논문 발표자 체크박스 | ✅ 완료 | `isPresenter` 필드 프론트+백엔드 전체 연동 |
| R-04 | 등록 유형 3단계 | ✅ 완료 | Pre-Registration(~Apr 30) / Early Bird(~Jul 31) / Regular(~Oct 31) |
| R-05 | 회원 구분별 가격표 | ✅ 완료 | 3×3 가격 비교표 표시, 현재 사용자 행 하이라이트 |
| R-06 | Member 기준 | ✅ 완료 | 기존 IABSE 멤버십 체크 로직 그대로 유지 |
| R-07 | Young Engineer 기준 | ✅ 완료 | 만 35세 이하 = NON_MEMBER, `isYoungEngineer` 표시 |
| R-08 | 추가 옵션 수량 선택 | ✅ 완료 | 6종 +/- 스테퍼, 잔여 정원 표시, 소계 실시간 계산 |
| R-09 | Invitation Letter 선택 | ✅ 완료 | Yes/No 선택 카드, 선택 전 다음 단계 이동 불가 |
| R-10 | 요약 페이지 + Edit | ✅ 완료 | 등록패키지·추가옵션·초청장 각 섹션 Edit 버튼 (해당 단계로 복귀) |
| R-11 | UI 영어 전환 | ✅ 완료 | SignupPage·RegistrationPage·모든 컴포넌트·PaymentHistory 전체 영어화 |
| R-12 | 비밀번호 평문 전송 차단 | ✅ 완료 | 클라이언트 SHA-256 해싱 후 전송, 백엔드 BCrypt 저장 |

### 2-2. 미완료 / 향후 과제

| # | 항목 | 사유 |
|---|------|------|
| - | 개인정보 동의 내용 문안 | 법무 검토 후 삽입 필요 (레이아웃만 구성) |
| - | 결제 PG 실제 연동 | 현재 즉시 COMPLETED 처리 (PG사 미결정) |
| - | 결제 수량 정보 영수증 반영 | Payment 엔티티에 quantity 컬럼 추가 필요 |
| - | 운영 환경 HTTPS 설정 | SHA-256 + HTTPS 함께 적용 필요 |
| - | 4번째 회원유형 'Non-Member' | 백엔드 MemberType 확장 시 추가 (현재 3종) |

---

## 3. 변경 파일 목록

### 신규 생성

| 파일 | 설명 |
|------|------|
| `front/src/components/StepRegistrationType.tsx` | 등록 티어 선택 (Step 1) |
| `front/src/components/StepAdditionalOptions.tsx` | 추가 옵션 수량 선택 (Step 2) |
| `front/src/components/StepInvitationLetter.tsx` | 초청장 선택 (Step 3) |
| `front/src/components/StepSummary.tsx` | 요약·확인 + Edit (Step 4) |

### 수정

| 파일 | 주요 변경 내용 |
|------|--------------|
| `CLAUDE.md` | Section 10 영어 UI 규칙 추가, Section 4-3 비밀번호 정책 업데이트 |
| `front/src/types/index.ts` | `RegistrationTierKey`, `REG_TIER_CONFIG`, `ADDITIONAL_OPTION_IDS`, `INVITATION_OPTION_ID`, `quantities` 필드 추가 |
| `front/src/pages/SignupPage.tsx` | 전체 영어화, 개인정보 동의, 발표자 체크, 국가 드롭다운 |
| `front/src/pages/RegistrationPage.tsx` | 6단계 플로우 (REG_TYPE→ADD_OPTIONS→INVITATION→SUMMARY→PAYMENT→COMPLETE) |
| `front/src/components/Shared.tsx` | `StepProgress` 라벨 props화, 영어 상태 레이블 |
| `front/src/components/Step3Payment.tsx` | 결제 수단 선택만 담당하도록 축소, 영어화, quantities 전달 |
| `front/src/components/PaymentHistory.tsx` | 전체 영어화 |
| `front/src/lib/api.ts` | `hashPassword()` (SHA-256), `apiLogin`·`apiSignup` 해싱 적용 |
| `back/.../SignupRequest.java` | `isPresenter` 추가, `@StrongPassword` → `@Size(64,64)` |
| `back/.../User.java` | `presenter` 컬럼 추가, 오버로드 생성자 |
| `back/.../AuthService.java` | `isPresenter` 값 User 생성 시 반영 |
| `back/.../AuthResponse.java` | `isPresenter` 필드 추가 |
| `back/.../PaymentRequest.java` | `Map<String, Integer> quantities` 추가 |
| `back/.../PaymentService.java` | 수량 기반 가격 계산·정원 검증·차감 |
| `back/.../DataInitializer.java` | 3티어×3회원유형=9개 등록 옵션, 6개 소셜 이벤트 옵션, SHA-256 테스트 비밀번호 |

---

## 4. 아키텍처 결정 사항 (ADR)

### ADR-01: 클라이언트 SHA-256 비밀번호 해싱

- **결정**: 브라우저 `crypto.subtle.digest('SHA-256')` 로 해싱 후 전송
- **이유**: 네트워크 탭에서 비밀번호 원문 노출 방지
- **트레이드오프**:
  - ✅ 평문 비밀번호가 네트워크에 나가지 않음
  - ✅ 외부 라이브러리 불필요 (브라우저 내장)
  - ⚠️ HTTPS 없으면 해시 재전송 공격 가능 → **운영 환경 HTTPS 필수**
  - ⚠️ `@StrongPassword` 백엔드 검증 불가 → 프론트엔드에서만 검증

### ADR-02: 등록 티어 ID 명명 규칙

```
OPT-REG-PRE-{MEMBER|NM|NMP}    # 사전등록
OPT-REG-EARLY-{MEMBER|NM|NMP}  # 얼리버드
OPT-REG-{MEMBER|NONMEMBER|NONMEMBER-PLUS}  # 일반 (기존 ID 유지)
```
- 모든 ID는 30자 이내 (`@Column(length = 30)` 제약)

### ADR-03: PaymentRequest quantities 설계

- 기존 `selectedOptionIds: List<String>`는 unique IDs만 포함
- `quantities: Map<String, Integer>` 추가로 수량 표현 (없으면 기본값 1)
- 백엔드는 `findAllById(uniqueIds)`로 중복 없이 조회 후 수량 계산

---

## 5. 테스트 계정 (개발용)

| 이메일 | 비밀번호 (입력값) | 전송 값 | 회원 유형 |
|--------|-----------------|---------|----------|
| member@test.com | `Test1234!` | SHA-256 해시 | MEMBER |
| young@test.com | `Test1234!` | SHA-256 해시 | NON_MEMBER (YE) |
| senior@test.com | `Test1234!` | SHA-256 해시 | NON_MEMBER_PLUS |

> DB 저장 값: `BCrypt(SHA-256("Test1234!"))` — `DataInitializer.sha256()` 참조

---

## 6. 등록 옵션 ID 전체 목록 (현재 시드)

### 등록 패키지 (REGISTRATION)

| ID | 회원유형 | 티어 | 가격 |
|----|---------|------|------|
| OPT-REG-PRE-MEMBER | MEMBER | Pre-Registration | ₩500,000 |
| OPT-REG-PRE-NM | NON_MEMBER | Pre-Registration | ₩350,000 |
| OPT-REG-PRE-NMP | NON_MEMBER_PLUS | Pre-Registration | ₩700,000 |
| OPT-REG-EARLY-MEMBER | MEMBER | Early Bird | ₩600,000 |
| OPT-REG-EARLY-NM | NON_MEMBER | Early Bird | ₩450,000 |
| OPT-REG-EARLY-NMP | NON_MEMBER_PLUS | Early Bird | ₩850,000 |
| OPT-REG-MEMBER | MEMBER | Regular | ₩700,000 |
| OPT-REG-NONMEMBER | NON_MEMBER | Regular | ₩550,000 |
| OPT-REG-NONMEMBER-PLUS | NON_MEMBER_PLUS | Regular | ₩950,000 |

### 추가 프로그램 (PROGRAM)

| ID | 설명 | 가격 | 정원 |
|----|------|------|------|
| OPT-WELCOME | Welcome Reception | ₩80,000 | 200 |
| OPT-CONGRESS-DINNER | Congress Dinner | ₩120,000 | 150 |
| OPT-TECH-TOUR | Technical Tour Program | ₩60,000 | 40 |
| OPT-YEP | Young Engineers Program | ₩30,000 | 무제한 |
| OPT-ACCOMPANYING | Accompanying Person | ₩150,000 | 무제한 |
| OPT-WORKSHOP | Workshop | ₩50,000 | 60 |

### 행정 서비스 (ADMIN)

| ID | 설명 | 가격 |
|----|------|------|
| OPT-VISA | Official Invitation Letter (Visa) | 무료 |
| OPT-PROCEEDINGS | Printed Proceedings | ₩20,000 |
