# 2026-04-17 — IABSE Congress Incheon 2026 리브랜딩 + 등록 시스템 재구성

## 작업 브랜치
- `claude/iabse-2026-branding-email-fix` → PR #9 → main 병합 완료
- `main` 직접 커밋: SSH 경로 수정 (055482d), 이후 변경사항 아직 미push

---

## 세션 요구사항 (원문)

1. 이메일 발신 주소 `iabse2026@kibse.or.kr` 로 변경, 문의 메일도 동일하게
2. 이메일 인증코드 메일 미수신 문제 확인
3. `KSSC 2026` → `IABSE 2026` 전체 변경
4. UI 비입력 텍스트 클릭 시 caret 깜빡임 CSS 수정
5. AWS SES 설정 완료 (`iabse2026@kibse.or.kr` Verified)
6. PDF(`등록페이지_내용 260417.pptx`) 분석 → 요구사항 정의
7. 회원 4분류 변경, 가격 업데이트, pre-registration 기간 settings 관리, 관리자 계정, 잔여티켓 관리자 전용, 옵션 수량 UI 제거

---

## 완료된 작업

### PR #9 (병합 완료)
- `KSSC 2026` → `IABSE 2026` 전체 변경 (LoginPage, SignupPage, RegistrationPage, Step3Payment, StepInvitationLetter, index.html, EmailService)
- 이메일 발신/문의 주소 → `iabse2026@kibse.or.kr`
- `index.css` caret 방어 규칙: `body { caret-color: transparent }` + input/textarea only override
- GitHub Actions SSH 경로 `~` → `/home/runner` 절대경로 수정

### AWS SES
- `iabse2026@kibse.or.kr` Verified Identity 등록 완료
- 이메일 미수신 원인: 기존 `noreply@kssc2026.org` 미등록 도메인 → 554 거부
- **SES Sandbox 미해제** — Production access 신청 필요 (AWS Support Center)

### 백엔드 변경 (미push, 로컬만)
| 파일 | 변경 내용 |
|------|----------|
| `MemberType.java` | YOUNG_ENGINEER 추가 → 4분류 |
| `AuthService.java` | 비회원 ≤35세 → YOUNG_ENGINEER, >35세 → NON_MEMBER |
| `User.java` | `admin` boolean 필드 추가 |
| `JwtTokenProvider.java` | JWT에 `admin` 클레임 포함 |
| `JwtAuthFilter.java` | admin=true 시 ROLE_ADMIN 부여 |
| `AppProperties.java` | `Registration` 내부 클래스 추가 (기간 설정) |
| `application.yaml` | `app.registration.*` 기간 설정 추가 (ENV 변수로 재정의 가능) |
| `DataInitializer.java` | 12개 등록 옵션 + 프로그램 옵션 재구성 + **관리자 계정** 시드 |
| `ConferenceOptionResponse` | `maxCapacity/currentCount` 제거 (일반 사용자) |
| `AdminConferenceOptionResponse` (신규) | 잔여 좌석 포함 관리자 전용 DTO |
| `AdminOptionController` (신규) | `GET /api/admin/options` ROLE_ADMIN 전용 |
| `SecurityConfig.java` | `/api/admin/**` ROLE_ADMIN 요구, `/api/config/**` 공개, `@EnableMethodSecurity` |
| `ConfigController` (신규) | `GET /api/config/registration-periods` |
| `RegistrationPeriodsResponse` (신규) | 기간 응답 DTO |

### 프론트엔드 변경 (미push, 로컬만)
| 파일 | 변경 내용 |
|------|----------|
| `types/index.ts` | MemberType 4분류, REG_TIER_CONFIG optionIds 확장, deadline 필드 제거, RegistrationPeriods 타입 추가 |
| `Shared.tsx` | MemberTypePill에 YOUNG_ENGINEER (amber) 스타일 |
| `api.ts` | `apiFetchRegistrationPeriods` 추가 |
| `useRegistration.ts` | `useRegistrationPeriods` 훅 추가 |
| `StepRegistrationType.tsx` | 서버 기간 기반 활성 티어 판정, 4카테고리 비교 테이블 |
| `StepAdditionalOptions.tsx` | 수량 스테퍼 삭제 → 체크박스 토글, 잔여티켓/설명 제거, 버튼명 변경 |
| `Step2Options.tsx` | YOUNG_ENGINEER optionId 추가 (미사용 컴포넌트) |
| `StepSummary.tsx` | deadline 참조 제거 |

---

## 임시 가격 (확정 필요)

| 티어 | Member | Non-Member | Non-Member Plus | Young Engineer |
|------|--------|-----------|-----------------|----------------|
| Pre-Registration | ₩1,200,000 | ₩1,400,000 | ₩1,500,000 | ₩700,000 |
| Early Bird (+20% 임의) | ₩1,440,000 | ₩1,680,000 | ₩1,800,000 | ₩840,000 |
| Regular (+40% 임의) | ₩1,680,000 | ₩1,960,000 | ₩2,100,000 | ₩980,000 |

---

## 관리자 계정
- **이메일**: `admin@kibse.or.kr`
- **비밀번호**: `Admin2026!` (SHA-256 해시 후 BCrypt 저장)
- **권한**: JWT `admin: true` → ROLE_ADMIN → `/api/admin/**` 접근 가능
- **주의**: 운영 DB에 반영 시 DataInitializer가 `count()==0`일 때만 시드하므로 별도 SQL INSERT 필요

---

## 기간 설정 ENV 변수 (서버 .env에 추가 필요)
```
REG_PRE_START=2026-05-30
REG_PRE_END=2026-07-31
REG_EARLY_START=2026-08-01
REG_EARLY_END=2026-08-31
REG_REGULAR_START=2026-09-01
REG_REGULAR_END=2026-10-31
```

---

## 다음 세션에서 할 일 (PDF 요구사항 잔여분)

### 1순위 — 즉시 가능
- [ ] **git commit & push** — 위 모든 로컬 변경사항 PR 생성 후 main 배포
- [ ] **서버 .env에 기간 ENV 변수 추가** (`REG_PRE_START` 등)
- [ ] **운영 DB 관리자 계정 INSERT** (DataInitializer는 이미 데이터 있으면 스킵)

### 2순위 — 코드 변경 필요 (로그인/회원가입 UI)
- [ ] `LoginPage.tsx` 전체 영문화 (이메일/비밀번호/버튼/에러 메시지)
- [ ] 로그인/등록 페이지 상단 로고 이미지 삽입 (`front/public/logo.png` 수령 후)

### 3순위 — 회원가입 동의 문구 교체
- [ ] 기존 테이블 형식 → IABSE 표준 문구 (`By registering for the IABSE Congress Incheon 2026...`)
- [ ] 체크박스 1개 → 라디오 2개 (`I give consent` / `I do not consent`)

### 4순위 — 비자레터 + 숙박정보 (StepInvitationLetter)
- [ ] 비자레터 안내 문구 IABSE 표준으로 교체
- [ ] 라디오 전환 (`Yes, I need...` / `No, I do not need one`)
- [ ] 숙박정보 카드 추가 (링크: https://iabse2026.mice.link/)

### 5순위 — Summary + 완료 페이지
- [ ] `StepSummary.tsx`: `REGISTRANT` → `Personal Details`
- [ ] 결제 완료 후 Thank-You 페이지 신규 추가

### 6순위 — 미정 항목 확정 후
- [ ] Early Bird / Regular 실제 가격 확정 → DataInitializer 업데이트
- [ ] Accompanying persons walking tour 날짜/금액 확정
- [ ] Pre-workshop 날짜/금액 확정
- [ ] Pre-registration 정확한 기간 확정 (`5/30~7월` 중)
- [ ] SES Sandbox 해제 (AWS Support Center 신청)

---

## 참고
- 요구사항 상세: `docs/requirements/2026-04-17_iabse-incheon-redesign-requirements.md`
- 관련 PPT 원본: `docs/requirements/example/등록페이지_내용 260417.pptx`
- 관리자 잔여 티켓 조회: `GET /api/admin/options` (ROLE_ADMIN 필요)
- 기간 설정 조회: `GET /api/config/registration-periods` (인증 불필요)
