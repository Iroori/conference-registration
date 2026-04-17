# IABSE Congress Incheon 2026 — Registration System Redesign

**작성일**: 2026-04-17
**기반 문서**: `docs/requirements/example/등록페이지_내용 260417.pptx`
**상태**: 분석 완료, 구현 전 확인 필요 항목 있음

---

## 1. 개요

클라이언트 요청으로 기존 "KSSC 2026 Annual Conference" 등록 시스템을 **IABSE Congress Incheon 2026** 공식 디자인 가이드라인에 맞춰 재구성합니다. 주요 변경은 브랜딩, 등록비 구조, 개인정보 동의 문구, 옵션 구성, 비자레터/숙박 안내, 완료 페이지입니다.

---

## 2. 변경 항목 (페이지별)

### 2-1. 로그인 페이지 (`front/src/pages/LoginPage.tsx`)

| 항목 | 현재 상태 | 요구사항 |
|------|----------|---------|
| 브랜드 라벨 | `IABSE 2026` | **로고 이미지 삽입** + `IABSE Congress Incheon 2026` |
| 부제 | `로그인` / `Annual Conference 참가 등록` (한글) | 제거 또는 영문화 — 로고만으로 표시 |
| Email 레이블 | `이메일` | `Email address` |
| Password 레이블 | `비밀번호` | `Password` |
| 로그인 버튼 | `로그인` | `Login` |
| 회원가입 안내 | `계정이 없으신가요? 회원가입` | `Create a new user account` |
| 문의 | `iabse2026@kibse.or.kr` ✅ 완료 | `Contact: iabse2026@kibse.or.kr` |
| 에러 메시지 | 한국어 (`로그인에 실패했습니다` 등) | 영문화 |

**액션**
- [ ] `front/public/logo.png` 에 로고 이미지 배치 (사용자 제공 예정)
- [ ] 페이지 전체 영문화
- [ ] 로고 이미지 컴포넌트화

---

### 2-2. 회원가입 - 개인정보 동의 (`front/src/pages/SignupPage.tsx`)

| 항목 | 현재 상태 | 요구사항 |
|------|----------|---------|
| 동의 섹션 제목 | `Personal Data Collection & Use` (표 형식) | `Data Processing Consent` |
| 본문 | 수집 항목 표 + 보유기간 | **IABSE 표준 문구로 교체** (아래 전문) |
| 동의 방식 | 단일 체크박스 (`I agree...`) | **라디오 2개 선택지**: `I give consent` / `I do not consent` |
| 거부 시 동작 | — | `I do not consent` 선택 시 Submit 비활성화 + 안내 문구 표시 |

**IABSE 표준 문구 (교체 대상)**
> By registering for the IABSE Congress Incheon 2026, you (the delegate) agree that your personal data will be processed for registration and handling purposes, as well as to provide you with information related to the congress. All personal data will be processed in accordance with applicable data protection legislation and will not be disclosed to a third party without the delegate's written consent. Please tick the box below to provide your consent. Please note that if you do not agree to the terms, you will not be able to complete your registration.

---

### 2-3. 등록비 구조 (`front/src/components/StepRegistrationType.tsx` + `DataInitializer.java`)

#### 현재 가격표 (3 × 3 = 9개 옵션)

| Category | Pre | Early | Regular |
|----------|-----|-------|---------|
| IABSE Member | ₩500,000 | ₩600,000 | ₩700,000 |
| Young Engineer (NON_MEMBER) | ₩350,000 | ₩450,000 | ₩550,000 |
| Non-Member Plus | ₩700,000 | ₩850,000 | ₩950,000 |

#### PDF 요구 가격 (Pre-Registration 기준만 명시)

| Category | Pre-Registration |
|----------|------------------|
| Member | ₩1,200,000 |
| Non-member | ₩1,400,000 |
| Non-member plus | ₩1,500,000 |
| Young Engineer | ₩700,000 |

**⚠️ 확인 필요 사항 (Open Questions)**
1. **회원 카테고리 4개로 확장?** — PDF에 `Member / Non-member / Non-member plus / Young Engineer` 4개 분류. 현재 코드는 3개 분류 (`MEMBER / NON_MEMBER = YE / NON_MEMBER_PLUS`).
   - 현재 `NON_MEMBER` = IASBSE 비회원 & 만 35세 이하 (Young Engineer)
   - `NON_MEMBER_PLUS` = IASBSE 비회원 & 만 36세 이상
   - PDF의 "Non-member"는 "Non-member plus"와 별개로 보임 → **추가 카테고리 도입 여부 확인 필요**
   - 또는 현재의 `NON_MEMBER_PLUS`가 PDF의 `Non-member`에 해당하고, `NON_MEMBER` = Young Engineer이며 `Non-member plus`가 새로운 카테고리일 가능성

2. **Early Bird / Regular 가격** — PDF에 명시 안 됨. 기존 가격 유지? 아니면 Pre-Registration 비율에 맞춰 재조정?

3. **Pre-registration 기간** — "5/30 ~ 7월까지 (날짜 미정)" 로 표기됨. 현재 deadline 은 April 30, 2026. **실제 시작/종료일 확정 필요**.

**액션 (확정 후)**
- [ ] `DataInitializer.java` — 9개 REGISTRATION 옵션 가격 업데이트 (또는 12개로 확장)
- [ ] `front/src/types/index.ts` — `REG_TIER_CONFIG`의 deadline 날짜 업데이트
- [ ] 카테고리 확장 시 `MemberType` enum 수정 + 회원 유형 로직 재검토

#### 네비게이션 라벨

| 현재 | PDF 요구 |
|------|---------|
| `Package – Add-ons – Invitation – Review – Payment` | `Select – Option – Option2 – Summary – Payment` |

**액션**
- [ ] `RegistrationPage.tsx`의 스텝 라벨 변경

---

### 2-4. Additional Programs (`front/src/components/StepAdditionalOptions.tsx` + `DataInitializer.java`)

#### 옵션 목록 변경

| # | 현재 옵션 | PDF 요구 | 비고 |
|---|-----------|---------|------|
| 1 | Welcome Reception ₩80,000 (200명) | **Welcome Reception (9/16) — 무료** | 가격 변경: 80K → 0 |
| 2 | Congress Dinner ₩120,000 (150명) | **Gala Dinner (9/17) — ₩200,000, 230명 제한** | 명칭, 가격, 수용인원 모두 변경 |
| 3 | Technical Tour ₩60,000 (40명) | **Technical Tour (9/19) — ₩100,000, 40명 제한** | 가격 변경 |
| 4 | Young Engineers Program ₩30,000 | **삭제** 또는 유지? | PDF 미언급 → **확인 필요** |
| 5 | Accompanying Person ₩150,000 | **Accompanying persons walking tour — 날짜/금액 미정** | 금액 TBD |
| 6 | Workshop ₩50,000 (60명) | **Pre-workshop — 날짜/금액 미정** | 명칭/금액 TBD |

#### UI 변경

| 항목 | 현재 | 요구사항 |
|------|------|---------|
| 잔여 티켓 표시 | 사용자 UI에 노출 (`230 spots left`) | **관리자만 확인** — 사용자 UI에서 제거 |
| 각 옵션 하단 세부 설명 | `Day 1 evening · Welcome drinks...` 등 | **제거** |
| 오른쪽 사이드바 버튼 | `Continue to Invitation Letter` | `Continue to registration` |

**⚠️ 확인 필요**
- Young Engineers Program (OPT-YEP) 유지/삭제 여부
- Accompanying persons / Pre-workshop 실제 가격 확정 전까지 해당 옵션 **비활성화 처리**(available=false) vs. 숨김 처리

**액션**
- [ ] `DataInitializer.java` — 옵션 가격/수용인원 업데이트
- [ ] `StepAdditionalOptions.tsx` — `remainingCapacity` 배지 제거
- [ ] `StepAdditionalOptions.tsx` — `opt.description` 렌더링 제거 또는 조건부 숨김
- [ ] 버튼 레이블 변경

---

### 2-5. Invitation Letter + Accommodation (`front/src/components/StepInvitationLetter.tsx`)

#### 비자레터 섹션

| 항목 | 현재 | 요구사항 |
|------|------|---------|
| 정책 문구 | `About the Official Invitation Letter` 커스텀 | **IABSE 표준 문구로 교체** (아래 전문) |
| 선택 방식 | 체크박스 (Need letter?) | **라디오 2개**: `Yes, I need an invitation letter` / `No, I do not need one` |

**IABSE 표준 문구**
> **Letter of Invitation**
> Invitation Letter for Visa Application: If you require an official Letter of Invitation to apply for a visa to enter the Republic of Korea, please indicate this during the registration process.
>
> Please note that:
> - The letter will only be issued to **fully registered and paid** delegates.
> - The letter of invitation does not guarantee the granting of a visa.
> - Participants are responsible for their own visa application process and costs.

#### 숙박정보 섹션 (신규 추가)

비자레터 섹션 **아래에** 별도 카드로 추가:

> **Accommodation Information**
> For the convenience of IABSE Congress Incheon 2026 participants, we are pleased to provide information on accommodation options near the venue. Detailed information regarding hotels and rates can be found at the link below:
>
> • **Link**: https://iabse2026.mice.link/
>
> Please note that this information is provided for your reference only. Booking through this link is **entirely optional**, and participants are free to arrange their own accommodations according to their preferences.

**액션**
- [ ] 비자레터 안내 문구 교체
- [ ] 라디오 2선택 UI로 전환
- [ ] 숙박정보 카드 신규 추가 (외부 링크 포함)

---

### 2-6. Summary / Review (`front/src/components/StepSummary.tsx`)

| 항목 | 현재 | 요구사항 |
|------|------|---------|
| 개인정보 섹션 헤더 | `REGISTRANT` | `Personal Details` |
| 기타 | 구조 유지 | 그대로 |

**액션**
- [ ] 헤더 문자열 1곳 변경

---

### 2-7. 결제 완료 페이지 (신규/교체)

#### 현재
결제 완료 시 별도 "Thank You" 화면 없음 (PaymentHistory로 이동 추정).

#### 요구사항
결제 완료 직후 아래 화면 표시:

> **Thank You for Registering**
>
> Thank you for registering for the IABSE Congress Incheon 2026. Once your payment is fully processed, you will receive a confirmation email containing your registration details and a receipt. We look forward to seeing you in Incheon.

**액션**
- [ ] 결제 성공 콜백 라우팅 경로에 `PaymentCompletePage` 또는 `Step6ThankYou` 신규 컴포넌트 추가
- [ ] Step3Payment에서 PayGate 성공 응답 수신 후 해당 페이지로 이동

---

## 3. 전역 변경 사항

| 항목 | 요구사항 |
|------|---------|
| 헤더 브랜딩 | 모든 페이지 상단에 **공식 로고 이미지** 노출 (`front/public/logo.png`) |
| 행사명 표기 | `IABSE 2026` → `IABSE Congress Incheon 2026` (PDF 요구) |
| UI 언어 | 전부 영어 (기존 CLAUDE.md 규칙 재확인) |
| 문의 이메일 | `iabse2026@kibse.or.kr` ✅ 적용 완료 |

---

## 4. 백엔드 영향도

| 파일 | 수정 내용 |
|------|----------|
| `DataInitializer.java` | 9개 REGISTRATION 옵션 가격 업데이트; PROGRAM 옵션 가격/명칭/수용인원 업데이트 |
| `ConferenceOption` 엔티티 | **잔여티켓 노출 필드** — 사용자 API 응답에서 `maxCapacity`/`currentCount`를 **관리자 전용으로 제한** (일반 사용자에게는 `available` boolean만 반환) |
| `MemberType.java` (조건부) | 4번째 카테고리 도입 시 enum 확장 + 회원 유형 결정 로직 수정 |
| 운영 DB 마이그레이션 | `DataInitializer`는 `count()==0`일 때만 시드함 → 운영 DB는 별도 **마이그레이션 스크립트** 또는 관리자 API로 가격 변경 필요 |

---

## 5. 구현 순서 (제안)

1. **Phase 1 — 문구/라벨 (저위험)**
   - 로그인 페이지 영문화
   - 회원가입 동의 문구 교체 + 라디오 전환
   - Summary 헤더 변경 (`REGISTRANT` → `Personal Details`)
   - 스텝 네비게이션 라벨 변경
   - 행사명 표기 통일 (`IABSE Congress Incheon 2026`)

2. **Phase 2 — 로고 이미지 삽입**
   - 로고 자산 수령 후 `front/public/logo.png` 배치
   - 공통 Header 컴포넌트에 로고 img 추가

3. **Phase 3 — 옵션 페이지 UI 정리**
   - 잔여티켓 표시 제거 (사용자 UI)
   - 옵션 하단 description 숨김
   - Continue 버튼 레이블 변경

4. **Phase 4 — 비자레터 + 숙박정보**
   - 문구 교체 + 라디오 전환
   - 숙박정보 카드 추가

5. **Phase 5 — 결제 완료 페이지**
   - `PaymentCompletePage` 추가 + 라우팅 연결

6. **Phase 6 — 가격/카테고리 (사용자 확인 후)**
   - 회원 카테고리 확장 여부 결정
   - 등록비 가격 업데이트
   - 옵션 가격/수용인원 업데이트

---

## 6. 사용자 확인 필요 항목 (Open Questions)

다음 항목은 **클라이언트 의사결정 전 구현 보류**:

1. 회원 카테고리 분류 — 현재 3개(MEMBER/NON_MEMBER=YE/NON_MEMBER_PLUS) 유지인지, 4개로 확장인지?
2. Early Bird / Regular 티어 가격 — PDF 미언급. 기존 가격 유지? 재조정?
3. Pre-registration 기간 시작/종료일 확정 (`5/30 ~ 7월까지`)
4. Young Engineers Program (OPT-YEP) 유지/삭제
5. Accompanying persons walking tour 금액/날짜
6. Pre-workshop 금액/날짜
7. 프린트 논문집(OPT-PROCEEDINGS) 유지/삭제 — PDF에 미언급
8. 잔여티켓 관리자 조회 기능 — 별도 어드민 페이지 필요? 아니면 DB 직접 조회로 충분?

---

## 7. 리스크 / 참고

- **운영 DB에는 이미 옵션 데이터가 있을 가능성** → `DataInitializer`만 수정하면 신규 환경에만 적용됨. 운영 반영 시 별도 SQL 업데이트 스크립트 필요
- **결제 완료 페이지 신규** — PayGate 리턴 URL 구조 확인 필요 (현재 Step3Payment의 성공 응답 처리 경로 파악 후 구현)
- **라디오로 Consent/Invitation 전환** — 기존 체크박스 대비 UI 변경이라 기존 로직(`privacyAgreed` boolean) 유지는 가능하지만 UX 일관성을 위해 `'I_CONSENT' | 'I_DO_NOT_CONSENT' | null` 같은 상태 타입으로 리팩토링 권장
