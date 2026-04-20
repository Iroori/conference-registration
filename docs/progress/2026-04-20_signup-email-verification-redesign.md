# 회원가입 이메일 인증 플로우 개선 — 요구사항 명세서

| 항목 | 값 |
|------|---|
| 작성일 | 2026-04-20 |
| 작업 브랜치 | `claude/musing-agnesi-4a8f08` |
| 작성자 | Claude Code (요청자: ruri.lee0223@gmail.com) |
| 문서 유형 | 요구사항 명세서 (SRS) — 구현 전 검토 단계 |
| 대상 기능 | 회원가입 이메일 인증 (SignupPage + EmailService) |

---

## 1. 배경 (Background)

### 1-1. 현재 플로우의 문제점
현재 회원가입은 **2단계 네비게이션** 방식으로 동작한다.

```
[FORM 단계]              [VERIFY_EMAIL 단계]
회원정보 전체 입력   →   페이지 전환 후 6자리 코드 입력
"Create Account"           "Verify Email"
버튼 클릭 (=가입)          버튼 클릭 (=인증)
```

발생하는 문제:
1. **가짜/오타 이메일로도 가입이 성사됨** — 인증 전에 이미 `User` 레코드가 DB에 저장되어 있어, 이메일을 입력 실수한 사용자는 중복 가입 차단(`EMAIL_ALREADY_EXISTS`)에 막혀 재가입 불가.
2. **인증 코드 입력 단계에서 뒤로가기 시 UX 혼란** — 이메일 입력 필드로 되돌아갈 방법이 없다.
3. **이메일 소유권 검증이 "가입 후 확인" 순서** — 본래 "소유권 확인 후 가입 완료"가 되어야 하는데 순서가 반대.

### 1-2. IABSE 회원 연동 상태
현재 `GET /api/iasbse/check?email=` 엔드포인트로 **실시간 조회**하여 `MEMBER` / `NON_MEMBER` 배지를 즉시 표시하고 있다. 그러나 요청자의 지침에 따르면 **IABSE 회원 데이터 연동은 "추후 제공"**될 예정이며, 현 단계에서는 **안내 문구만** 유지하면 된다.

### 1-3. 타임아웃 관련 현황
- `application.yaml`의 `app.email-verification.expiration-minutes` = **10분** (이미 설정됨)
- `EmailService.CodeEntry`는 `Instant.now().plusSeconds(expMin * 60)`로 만료시간 계산
- `verifyCode()` 호출 시 `isExpired()`로 체크 → `VERIFICATION_CODE_EXPIRED` 에러 반환
- **현재 저장소**: 인메모리 `ConcurrentHashMap` (서버 재시작 시 소실 + 멀티 인스턴스 불가)
- **클라이언트 측 카운트다운 UI 없음** — 사용자는 만료시간을 알 수 없음

---

## 2. 요구사항 범위 (Scope)

### 2-1. IN-SCOPE (이번 작업에 포함)

| # | 요구사항 | 우선순위 |
|---|---------|--------|
| REQ-1 | 이메일 필드 옆에 **[Verify] 버튼** 배치 → 클릭 시 코드 발송 + 코드 입력 필드 노출 | P0 |
| REQ-2 | 이메일 인증을 **회원가입 폼 내부에서 완료**하도록 변경 (별도 페이지 전환 제거) | P0 |
| REQ-3 | 인증 성공 전에는 "Create Account" 버튼 **비활성화** | P0 |
| REQ-4 | IABSE 실시간 조회 UI 및 안내 문구 **완전 제거** (추후 관리자 Excel 업로드 시 자동 승격 예정) | P0 |
| REQ-5 | 인증 코드 **10분 타임아웃** 동작 검증 (서버 + 클라이언트) | P0 |
| REQ-6 | 클라이언트 측 **카운트다운 타이머** (mm:ss 표시, 만료 시 입력 필드 비활성화) | P0 |
| REQ-7 | pa1168@naver.com, ruri.lee0223@gmail.com 으로 **실제 수신 테스트** | P0 |
| REQ-8 | **인증코드 재발급 기능** — 원하는 만큼 재발급 가능, 매번 최신 코드만 유효 | P0 |
| REQ-9 | "Resend Code" 버튼 **30초 쿨다운** (연타 방지) | P1 |
| REQ-10 | 이메일 형식 검증 후에만 [Verify] 버튼 활성화 | P1 |
| REQ-11 | `@Async` 재발급 경합 조건 제거 (동기 저장 + 비동기 발송 분리) | P0 |

### 2-2. OUT-OF-SCOPE (이번 작업에서 제외)

- Redis 도입 (멀티 인스턴스 저장소) — 별도 세션에서 처리
- 비밀번호 이중 해싱(SHA-256 → BCrypt) 변경 — CLAUDE.md §4-3에 고정 정책으로 명시됨
- Brute-force 방어 (N회 실패 시 잠금) — P2, 별도 세션
- IABSE 회원 데이터 연동 (추후 Excel 업로드) — "추후 제공" 범위
- EmailVerification DB 엔티티 활용 전환 — 별도 세션

---

## 3. 기능 요구사항 (Functional Requirements)

### 3-1. REQ-1/2/3: 이메일 인증 UI 재배치

#### 현재 UI
```
[회원가입 폼]
 └ Email Address: [_______________]
    └ IABSE 실시간 조회 결과 배지
 └ Password: [______]
 └ … (나머지 필드)
 └ [Create Account & Get Verification Code]  ← 클릭 시 VERIFY_EMAIL 페이지로 전환

[VERIFY_EMAIL 페이지 (별도 라우팅 없이 state 전환)]
 └ 6-digit code: [______]
 └ [Verify Email]  [Resend Code]
```

#### 목표 UI (단일 페이지 인라인 인증)
```
[회원가입 폼]
 └ Email Address: [_______________] [Verify] ← 클릭 시 코드 발송
    └ "A 6-digit code was sent to your@email.com"
    └ Verification Code: [______] [Confirm]  ← 인증 성공 시 ✓ 표시
                          (남은 시간 09:23)     [Resend]
 └ Password: [______]
 └ … (나머지 필드)
 └ [Create Account] ← 이메일 인증 완료 후에만 활성화
```

**상세 동작:**
1. 사용자가 이메일을 입력하면 형식 검증 후 `[Verify]` 버튼 활성화 (REQ-9)
2. `[Verify]` 클릭 → `POST /api/auth/send-code` (신규 엔드포인트) 호출 → 코드 입력 필드 표시 + 10:00 카운트다운 시작
3. 사용자가 6자리 코드 입력 → `[Confirm]` 클릭 → `POST /api/auth/verify-code` 호출
4. 인증 성공 시 이메일 필드 readonly + ✓ 체크마크 표시 + 코드 UI 축소 (또는 success 배지로 대체)
5. 인증 성공 전까지 `[Create Account]` 버튼 `disabled`
6. 이메일 필드가 변경되면 인증 상태 초기화 (재인증 필요)

**신규 백엔드 엔드포인트 설계:**
| 메서드 | 경로 | 요청 | 응답 | 설명 |
|--------|------|------|------|------|
| POST | `/api/auth/send-code` | `{ email }` | `200 OK` | 회원가입 전 코드 발송 (User 레코드 생성하지 않음) |
| POST | `/api/auth/verify-code` | `{ email, code }` | `200 OK` + `{ verified: true }` | 코드 검증만 수행 (User 업데이트하지 않음) |

**기존 `POST /api/auth/signup` 변경:**
- 가입 요청 시 서버에서 **해당 이메일이 최근 20분 내 인증 성공**했는지 확인 (사용자 확정)
- 미인증 시 `ErrorCode.EMAIL_NOT_VERIFIED` 반환
- 인증 성공 기록은 `EmailService`에 `verifiedEmails: ConcurrentHashMap<String, Instant>` 추가 (TTL 20분)
- 가입 성공 시 `verifiedEmails`에서 해당 이메일 제거 (일회성 사용)

> 참고: 이 방식은 "인증 선행 → 가입 성사" 순서로 흐름을 뒤집는 변경. `User.emailVerified`를 가입 시점에 `true`로 바로 세팅 가능.

### 3-2. REQ-4: IABSE UI 완전 제거 (확정)

#### 제거 대상 (프론트엔드)
- `handleEmailChange`의 debounce + `apiCheckIasbse` 실시간 호출 (SignupPage.tsx:86-105)
- `iasbseResult` 관련 배지 표시 UI (SignupPage.tsx:231-246)
- `checkingIasbse` 로딩 텍스트
- `iasbseResult`, `checkingIasbse` state, `emailCheckTimer` ref
- `import type { IasbseCheckResponse }`

#### 신규 안내 문구 → **추가하지 않음** (사용자 지시)
- 회원가입 페이지에는 IABSE 관련 문구를 **일절 표시하지 않는다**
- 기존 `Registration Rate Guide` 섹션(MEMBER/YOUNG ENGINEER/NON-MEMBER PLUS 배지 설명)만 유지

#### 백엔드 처리
- `GET /api/iasbse/check` 엔드포인트는 **유지** (추후 연동 대비)
- `AuthService.signup()` 의 `MemberType` 결정 로직은 **유지** (IABSE 미등록 시 기본 NON_MEMBER / YOUNG_ENGINEER 분기)
- 관리자가 이후에 IABSE Excel을 업로드하면 자동으로 MEMBER 승격되도록 **별도 배치 설계 필요** (out-of-scope, 추후 과제 기록만)

### 3-3. REQ-5/6: 10분 타임아웃 검증 + 카운트다운 UI

#### 서버 측 (검증만, 코드 변경 없음)
- `EmailService.sendAndStoreCode`: 현재 10분으로 저장 ✓
- `EmailService.verifyCode`: `isExpired()` 체크 존재 ✓
- **테스트 케이스**: 10분 이후 verify 호출 시 `VERIFICATION_CODE_EXPIRED` 반환 확인

#### 클라이언트 측 (신규 구현)
```typescript
const [codeSentAt, setCodeSentAt] = useState<number | null>(null);
const [timeLeft, setTimeLeft] = useState<number>(0);

useEffect(() => {
  if (codeSentAt == null) return;
  const interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - codeSentAt) / 1000);
    const remaining = Math.max(0, 600 - elapsed); // 10분
    setTimeLeft(remaining);
    if (remaining === 0) clearInterval(interval);
  }, 1000);
  return () => clearInterval(interval);
}, [codeSentAt]);
```

- 표시 형식: `09:23` (mm:ss)
- `timeLeft === 0` 시점: 코드 입력 필드 + Confirm 버튼 `disabled`, 안내 "Code expired — please resend"
- 표시 색상: `timeLeft > 60`이면 slate, `<= 60`이면 amber, `== 0`이면 red

### 3-4-bis. REQ-8/11: 인증코드 재발급 기능 (상세)

#### 현재 재발급 구현 현황
- 엔드포인트: `POST /api/auth/resend-code?email=xxx`
- 서비스: `AuthService.sendVerificationCode(email)` → `EmailService.sendAndStoreCode(email)` 호출
- 저장 방식: `codeStore.put(key, new CodeEntry(code, 10))` — **기존 코드 덮어쓰기** 방식

#### 기능적 결론 — "다시 받지 못하는" 직접적인 버그는 없음
`codeStore.put`은 덮어쓰기라서 재발급을 호출하면 이전 코드는 즉시 무효화되고 새 코드가 저장된다. **즉 "Resend 클릭 → 메일 안 옴"** 같은 차단 로직은 존재하지 않는다.

#### 그러나 발견된 **6가지 잠재/실존 버그** (아래 §7에서 상세 기술):
1. 🐛 **BUG-A (P0)** — `@Async` 스레드 경합으로 재발급 코드가 오래된 코드로 "덮어써지는" 역전 현상 가능 → 사용자가 **새 메일은 받았으나 입력 시 Invalid**
2. 🐛 **BUG-B (P0 / 보안)** — 미가입 이메일에도 무제한 코드 발송 가능 → 이메일 스팸 악용
3. 🐛 **BUG-C (P1)** — 이미 인증 완료된 이메일에 Resend 호출 시 코드는 발송되지만 검증 불가
4. 🐛 **BUG-D (P1)** — 쿨다운 부재로 동일 이메일에 1초 내 수백 번 호출 가능
5. 🐛 **BUG-E (P2 / UX)** — 재발급 후 기존에 수신한 메일의 코드 입력 시 "Invalid" 표시 (사용자는 왜 틀렸는지 모름)
6. 🐛 **BUG-F (P2)** — `getStoredCode`(dev 전용)가 만료된 엔트리를 삭제하지 않아 `codeStore` 메모리 누수 가능

#### 재발급 기능의 요구 동작

| 시나리오 | 기대 동작 |
|---------|---------|
| 이메일 입력 후 [Verify] 첫 클릭 | 코드 생성 + 발송 + 저장 + 10분 카운트다운 시작 |
| 30초 내 [Resend] 클릭 | 쿨다운 안내 `"Please wait 12s"` + 버튼 비활성 |
| 30초 후 [Resend] 클릭 | **기존 코드 즉시 무효화** + 새 코드 생성/발송/저장 + 카운트다운 **재시작** (10:00부터) |
| 재발급 직후 이전 코드 입력 | `VERIFICATION_CODE_INVALID` 반환 (보안 ✓) |
| 카운트다운 00:00 도달 후 [Resend] | 정상 재발급 (쿨다운 종료돼 있음) |
| 이메일 필드 수정 후 [Resend] | 인증 상태 초기화 → 재발급 대신 처음부터 [Verify] 흐름 |
| 이미 인증 완료된 이메일에 재발급 요청 | `400 EMAIL_ALREADY_VERIFIED` 반환 (BUG-C 해결) |
| 미가입/가입 예정 이메일에 재발급 요청 | 새 플로우에선 허용 (가입 전 인증이 정상) — 단, **rate limit 필수** |

#### 재발급 시 UI 흐름
```
[AWAITING_CODE 상태]
 ├ 코드 입력 필드: [______]  ← 이전 코드 입력돼 있을 수 있음
 ├ 카운트다운:     09:23
 ├ [Confirm]       (enabled)
 └ [Resend (13s)]  ← 쿨다운 표시

[사용자 Resend 클릭]
 ├ 코드 입력 필드: [______]  ← 비워짐 (이전 입력값 클리어)
 ├ 카운트다운:     10:00     ← 재시작
 ├ "A new verification code was sent to your@email.com"  안내 토스트
 └ [Resend (30s)]  ← 쿨다운 리셋
```

### 3-5-a. REQ-7: 실수신 테스트

#### 테스트 대상
| 수신자 | 메일 공급자 | 예상 결과 |
|--------|---------|---------|
| pa1168@naver.com | Naver (수동 노트: 사용자가 "naver"로만 썼으나 도메인은 `.com` 보정) | 스팸함 체크 필요 |
| ruri.lee0223@gmail.com | Gmail | 정상 수신 예상 |

#### 검증 항목
1. 메일 수신 여부 (받은편지함/스팸함)
2. 제목: `[IABSE 2026] Email Verification Code`
3. 발신: `iabse2026@kibse.or.kr`
4. 본문 내 6자리 코드 표시 및 만료 시간(10분) 안내
5. 발송 후 10분 이내 코드 입력 시 인증 성공
6. **발송 후 10분 1초 경과** 시 `VERIFICATION_CODE_EXPIRED` 에러 발생 확인

#### 선행 조건 (테스트 실행 전 확인)
- **dev 모드에서는 실메일이 발송되지 않음** (`app.dev-mode: true` → 콘솔 출력만)
- 실메일 발송을 테스트하려면 다음 중 하나 필요:
  - (A) 운영 서버(`iabse-inc2026-registration.com`)에 배포 후 테스트
  - (B) 로컬에서 `app.dev-mode: false` + AWS SES SMTP 자격증명(`MAIL_USERNAME`, `MAIL_PASSWORD`) 환경변수로 주입
  - (C) dev 프로파일에서도 SES 사용하도록 일시적으로 설정 변경
- **질문**: 이번 테스트는 어느 환경에서 수행하는지? (로컬 dev? 운영 서버? SES 자격증명 보유 여부?)

### 3-5. REQ-8: Resend 쿨다운

```typescript
const [resendCooldown, setResendCooldown] = useState(0);
// Resend 클릭 시 setResendCooldown(30), 1초마다 -1
```

- 쿨다운 중: `[Resend (12s)]` 표시, 버튼 disabled
- 기본 대기: 30초

### 3-6. REQ-10: [Verify] 버튼 활성화 조건
- 이메일 정규식 `^[^\s@]+@[^\s@]+\.[^\s@]+$` 통과
- 현재 인증 진행 중(`isSending`)이 아님
- 이미 인증 완료된 상태가 아님

---

## 4. 비기능 요구사항 (Non-Functional Requirements)

| # | 항목 | 요구사항 |
|---|------|---------|
| NFR-1 | 보안 | 인증 코드 1회 사용 후 즉시 파기 (현재 로직 유지) |
| NFR-2 | 보안 | 가입 전 인증 완료 이력은 20분 내 유효 (확정) |
| NFR-3 | 성능 | 메일 발송은 `@Async` 유지, API 응답 200ms 이내 반환 |
| NFR-4 | UX | 카운트다운 1초 단위 갱신, UI 끊김 없이 자연스럽게 업데이트 |
| NFR-5 | 언어 | CLAUDE.md §10에 따라 모든 UI 텍스트는 영어 |
| NFR-6 | 로깅 | 코드/비밀번호는 절대 로그에 평문 출력 금지 (기존 `SecurityAuditService` 사용) |

---

## 5. 수정 대상 파일 목록

### 프론트엔드
| 파일 | 변경 유형 | 변경 내용 |
|------|---------|---------|
| `front/src/pages/SignupPage.tsx` | 큰 수정 | 2단계 → 단일 페이지 인라인 인증으로 구조 변경, IABSE 배지 제거, 카운트다운 추가 |
| `front/src/lib/api.ts` | 추가 | `apiSendCode(email)`, `apiVerifyCode(email, code)` 함수 추가 (기존 `apiResendCode` / `apiVerifyEmail`는 유지 또는 리팩토링) |
| `front/src/types/index.ts` | 검토 | 새 API 응답 타입 정의 필요 시 추가 |

### 백엔드
| 파일 | 변경 유형 | 변경 내용 |
|------|---------|---------|
| `back/src/main/java/com/roo/payment/domain/user/controller/AuthController.java` | 추가 | `POST /auth/send-code`, `POST /auth/verify-code` 엔드포인트 신규 |
| `back/src/main/java/com/roo/payment/domain/user/service/AuthService.java` | 수정 | `signup()` 진입 시 "최근 10분 내 인증 완료" 체크 추가 |
| `back/src/main/java/com/roo/payment/domain/user/service/EmailService.java` | 수정 | `verifiedEmails` 맵 추가, `markVerified(email)` / `isRecentlyVerified(email)` 메서드 추가 |
| `back/src/main/java/com/roo/payment/common/exception/ErrorCode.java` | 추가 | `EMAIL_NOT_VERIFIED`("이메일 인증을 먼저 완료해주세요") 추가 |
| `back/src/main/java/com/roo/payment/security/SecurityConfig.java` | 수정 | `/auth/send-code`, `/auth/verify-code` permitAll 경로 등록 |
| `back/src/main/java/com/roo/payment/domain/user/dto/SendCodeRequest.java` | 신규 | `public record SendCodeRequest(@Email String email)` |
| `back/src/main/java/com/roo/payment/domain/user/dto/VerifyCodeRequest.java` | 신규 | `public record VerifyCodeRequest(@Email String email, @Size(min=6,max=6) String code)` |

---

## 6. API 변경 상세

### 6-1. 신규: `POST /api/auth/send-code`
**요청:**
```json
{ "email": "user@example.com" }
```
**처리:**
1. 이메일 중복 검증 (`EMAIL_ALREADY_EXISTS` 사전 체크)
2. `EmailService.sendAndStoreCode(email)` 호출
3. 10분 TTL로 코드 저장 + 메일 발송

**응답:**
```json
{ "success": true, "message": "Verification code sent" }
```

**에러:**
- `400 EMAIL_ALREADY_EXISTS`: 이미 가입된 이메일

### 6-2. 신규: `POST /api/auth/verify-code`
**요청:**
```json
{ "email": "user@example.com", "code": "123456" }
```
**처리:**
1. `EmailService.verifyCode(email, code)` 호출
2. 성공 시 `EmailService.markVerified(email)` — 30분 TTL로 인증 완료 이력 저장

**응답:**
```json
{ "success": true, "message": "Email verified" }
```

**에러:**
- `400 VERIFICATION_CODE_INVALID`: 코드 불일치 또는 존재 X
- `400 VERIFICATION_CODE_EXPIRED`: 10분 초과

### 6-3. 변경: `POST /api/auth/signup`
**추가 사전 체크:**
```java
if (!emailService.isRecentlyVerified(req.email())) {
    throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
}
```
- 기존 `emailService.sendAndStoreCode()` 호출 **제거**
- `User.emailVerified`를 가입 시 바로 `true`로 설정

### 6-4. Deprecated 예정 (하위 호환 유지, 단계적 제거)
- `POST /api/auth/resend-code` → 신규 `send-code`로 대체 가능하므로 내부적으로 재사용
- `POST /api/auth/verify-email` → 신규 `verify-code`로 대체

---

## 7. UX 상태 머신 (State Machine)

```
[IDLE]
  └ 이메일 미입력 or 형식 X
  └ [Verify] 버튼: disabled

[READY]
  └ 이메일 형식 OK
  └ [Verify] 버튼: enabled

[SENDING]
  └ send-code API 진행중
  └ 모든 버튼: disabled, "Sending..."

[AWAITING_CODE]
  └ 코드 발송 완료, 사용자가 코드 입력 대기
  └ 카운트다운 10:00 → 00:00
  └ [Confirm] 버튼: 코드 6자리 입력 시 enabled
  └ [Resend] 버튼: 30초 쿨다운 후 enabled

[EXPIRED]
  └ 카운트다운 0 도달
  └ 코드 입력 필드: disabled
  └ "Code expired" 메시지 표시
  └ [Resend] 버튼으로 복귀

[VERIFYING]
  └ verify-code API 진행중

[VERIFIED]
  └ 인증 성공
  └ 이메일 필드: readonly + ✓ 표시
  └ 인증 UI 축소 또는 success 배지로 변환
  └ [Create Account] 버튼: enabled (다른 필드 조건 충족 시)

[EMAIL_CHANGED] (AWAITING_CODE 이후 이메일 수정 시)
  └ 상태 초기화 → IDLE
  └ 사용자에게 "Email changed, verify again" 안내
```

---

## 7-A. 재발급 로직 버그 분석 (Deep-dive)

사용자 질문 — **"이메일로 한 번 인증코드를 받았을 때 인증이 완료된 게 아닌데 다시 못 받게 되는 버그가 있는지?"**

### 결론 (TL;DR)
**직접적으로 "다시 못 받는" 로직은 없습니다.** `codeStore.put(key, ...)`는 덮어쓰기 방식이라 호출할 때마다 새 코드로 교체되고 메일도 매번 발송됩니다. 그러나 **간접적으로 재발급이 무력화되는 6가지 문제**를 발견했습니다.

---

### 🐛 BUG-A (P0, 심각) — `@Async` 스레드 경합으로 인한 코드 역전

**재현 조건:**
1. 사용자가 [Verify] 클릭 → 서버: `emailService.sendAndStoreCode(email)` @Async 호출 → 스레드 T1이 큐잉
2. 1초 후 사용자가 [Resend] 클릭 → 스레드 T2가 큐잉

**AsyncConfig 현황** ([AsyncConfig.java:10](back/src/main/java/com/roo/payment/config/AsyncConfig.java:10)):
```java
@Configuration @EnableAsync @EnableScheduling
public class AsyncConfig {}  // ← 커스텀 TaskExecutor 없음 → 기본값은 SimpleAsyncTaskExecutor
```

Spring의 기본 `SimpleAsyncTaskExecutor`는 **매 호출마다 새 스레드를 만들고 순서를 보장하지 않습니다.**

**경합 시나리오** (실제 운영 시 발생 가능):
```
Thread T1 (첫 Verify): 코드 A 생성 → 스레드 스케줄러 대기
Thread T2 (Resend):    코드 B 생성 → CPU 먼저 점유 → codeStore.put(B) → 메일 B 발송
Thread T1 (재개):      codeStore.put(A)  ← B를 A로 덮어씀 → 메일 A 발송 (T2보다 늦게 도착)
```

**사용자 경험:**
- 받은편지함: A 메일, B 메일 두 개 (발송 순서는 뒤죽박죽)
- 사용자가 **가장 최근에 받은 B 메일의 코드를 입력**
- codeStore에는 A만 저장됨 → `VERIFICATION_CODE_INVALID` 반환
- 사용자: "분명 새 코드 받았는데 왜 틀렸다고 하지?" → **재발급이 효력을 잃는 것처럼 보임**

**해결 방안:**
1. `codeStore.put`을 `@Async` 메서드 밖에서 **동기 실행**하도록 분리
   ```java
   public void sendAndStoreCode(String email) {
       String key = email.toLowerCase().trim();
       String code = generate6Digit();
       codeStore.put(key, new CodeEntry(code, expMin));  // 동기 저장 ← 호출 순서 보장
       sendCodeEmailAsync(key, code, expMin);  // 비동기 발송만
   }

   @Async
   protected void sendCodeEmailAsync(String to, String code, int expMin) { ... }
   ```
2. 또는 `AsyncConfig`에 단일 스레드 `ThreadPoolTaskExecutor` 설정 (재발급 순서 보장)

---

### 🐛 BUG-B (P0, 보안 취약점) — 미가입 이메일에도 무제한 코드 발송

**현재 구현** ([AuthService.java:99-102](back/src/main/java/com/roo/payment/domain/user/service/AuthService.java:99)):
```java
@Transactional
public void sendVerificationCode(String email) {
    emailService.sendAndStoreCode(email);  // User 존재 여부 검증 없음
}
```

**악용 시나리오:**
- 공격자가 `curl -X POST 'https://.../api/auth/resend-code?email=victim@gmail.com'`을 1000번 호출
- 피해자는 IABSE 2026 명의의 인증 코드 메일을 **1000통** 수신
- 서비스 명의 이메일 스팸/피싱 유포에 악용 가능
- SES 발송량 급증 → 비용 증가 + SES 평판 하락 → 전체 시스템 메일 발송 차단 위험

**해결 방안 (새 플로우에서 통합):**
- `POST /api/auth/send-code` 엔드포인트에 **IP 기준 rate limit** 적용 (예: IP당 분당 3회)
- 동일 이메일 기준 쿨다운 30초 (서버에서도 강제)
- 추가: 가입 예정이 아닌 이미 가입된 이메일에는 `EMAIL_ALREADY_EXISTS` 반환

---

### 🐛 BUG-C (P1, UX) — 이미 인증 완료된 이메일에도 발송

**현재 동작:**
- `emailVerified=true`인 유저가 [Resend] 호출 → 코드 발송 성공 (200 OK)
- 사용자가 그 코드로 `/api/auth/verify-email` 호출 → `EMAIL_ALREADY_VERIFIED` 에러

**문제:**
- 메일은 발송됐지만 사용되지 못함 → 사용자 혼란 + 불필요한 메일 비용

**해결 방안:**
- `sendVerificationCode` 진입부에 `user.isEmailVerified()` 체크 추가
- 이미 인증된 경우 `EMAIL_ALREADY_VERIFIED` 반환 (단, 새 플로우에선 이 체크 자체가 불필요 — 가입 전 인증 플로우로 바뀌므로)

---

### 🐛 BUG-D (P1, 남용 가능성) — 쿨다운 부재

**현재:** 클라이언트와 서버 모두 재발급 호출 횟수/빈도 제한 없음

**영향:**
- 사용자가 [Resend] 버튼을 10번 클릭 → 메일 10통 발송 + BUG-A 경합 가능성 증폭
- AWS SES 발송 비용 낭비 + 전송 속도 할당량 소진

**해결 방안:**
- 클라이언트: 30초 쿨다운 (UI disabled + 카운트 표시)
- 서버: `verifiedEmails`와 유사한 `lastSentAt: Map<String, Instant>` 추가 → 30초 내 재호출 시 `TOO_MANY_REQUESTS`

---

### 🐛 BUG-E (P2, UX) — 재발급 후 이전 코드 입력 시 혼란스러운 에러

**시나리오:**
1. 사용자 [Verify] → 메일 A 수신, 아직 입력 X
2. 사용자 [Resend] → 메일 B 수신, A는 무효화됨
3. 사용자가 실수로 **A 메일을 다시 열어 A 코드 입력**
4. 서버 반환: `VERIFICATION_CODE_INVALID`
5. 사용자: "어? 어제 분명 맞는 코드 받았는데?"

**해결 방안:**
- 재발급 시 프론트엔드에서 코드 입력 필드 **자동 클리어** + 토스트 안내
  ```
  "A new code was sent. Please use the most recent email."
  ```
- 메일 본문에 발송 타임스탬프 추가 (선택)

---

### 🐛 BUG-F (P2, 메모리 누수) — 만료 코드가 자동 정리되지 않음

**현재 구현** ([EmailService.java:95-111](back/src/main/java/com/roo/payment/domain/user/service/EmailService.java:95)):
```java
public void verifyCode(String email, String inputCode) {
    CodeEntry entry = codeStore.get(key);
    if (entry.isExpired()) {
        codeStore.remove(key);  // ← 사용자가 "만료 후 조회"할 때만 삭제됨
        throw new BusinessException(ErrorCode.VERIFICATION_CODE_EXPIRED);
    }
    ...
}
```

**문제:**
- 코드가 발송됐지만 사용자가 verify를 호출하지 않으면 `codeStore`에 **영원히 남음**
- 장기 운영 시 힙 메모리 누수 가능

**해결 방안:**
- `@Scheduled(fixedRate = 600000)`으로 10분마다 만료 엔트리 일괄 삭제
  ```java
  @Scheduled(fixedRate = 600_000)
  public void purgeExpiredCodes() {
      codeStore.entrySet().removeIf(e -> e.getValue().isExpired());
  }
  ```

---

### 요약표

| 버그 | 우선순위 | 증상 | 이번 작업 처리 여부 |
|------|---------|------|----------------|
| BUG-A: @Async 경합 | P0 | 재발급해도 이전 코드가 유효한 것처럼 보임 | ✅ 동기 저장 분리 |
| BUG-B: 미가입 이메일 발송 | P0 (보안) | 이메일 스팸 악용 가능 | ✅ rate limit + 중복 검증 |
| BUG-C: 인증 완료자 재발송 | P1 | 메일 발송되지만 검증 불가 | ✅ 사전 체크 추가 |
| BUG-D: 쿨다운 부재 | P1 | 폭주 호출 가능 | ✅ 30초 쿨다운 (프론트+서버) |
| BUG-E: 이전 코드 혼동 | P2 | 사용자 혼란 | ✅ UI 클리어 + 안내 |
| BUG-F: 만료 코드 누수 | P2 | 메모리 증가 | ⏸️ 후속 (Redis 전환 시 자동 해결) |

---

## 8. 리스크 및 개선 권장사항

### 8-1. 리스크

| 리스크 | 영향 | 완화책 |
|-------|------|------|
| 인메모리 `verifiedEmails` 저장소 → 서버 재시작 시 인증 이력 소실 | 사용자 재인증 요구 | 30분 TTL 감안 시 허용 가능, 추후 Redis 전환 |
| Naver 메일 스팸 처리 가능성 | 사용자 수신 실패 | 수신자에게 스팸함 확인 안내, SPF/DKIM 완료 여부 재검증 |
| 인증 후 이메일 필드 수정 허용 시 우회 가능 | 보안 | 이메일 변경 감지 시 인증 상태 강제 초기화 (구현 포함) |
| IABSE 실시간 조회 제거 후 이후 MEMBER 승격 미반영 | 가격 정책 오류 | 관리자 Excel 업로드 시 기존 사용자 `MemberType` 재계산 배치 필요 (추후 과제) |
| dev 모드에서 실메일 발송 테스트 불가 | 테스트 환경 미비 | 운영 배포 또는 SES 자격증명으로 전환 필요 (§3-4 선행조건) |

### 8-2. 추후 개선사항 (별도 과제로 분리)

1. **Redis 전환** — `codeStore`, `verifiedEmails` 모두 Redis로 이관 (멀티 인스턴스 + 재시작 안전성)
2. **Brute-force 방어** — 동일 이메일 3회 실패 시 30분 잠금
3. **IABSE 승격 배치** — Excel 업로드 시 기존 User들의 `MemberType` 재계산
4. **클라이언트 비밀번호 강도 시각화** — 체크리스트 UI (대소문자/숫자/특수문자 실시간 표시)
5. **EmailVerification DB 엔티티 활용** — 감사 로그 + 회복 가능성 (현재 미사용 상태)

---

## 9. 테스트 계획 (Test Plan)

### 9-1. 유닛 테스트 (백엔드)
- `EmailService.verifyCode` — 만료 시간 10분 + 1초 경과 시 `VERIFICATION_CODE_EXPIRED` 반환
- `EmailService.verifyCode` — 잘못된 코드 입력 시 `VERIFICATION_CODE_INVALID` 반환
- `EmailService.isRecentlyVerified` — 30분 경과 시 false 반환
- `AuthService.signup` — 미인증 이메일 가입 시도 시 `EMAIL_NOT_VERIFIED` 반환

### 9-2. 통합 테스트 (E2E, 수동)
1. 브라우저에서 `/signup` 접속
2. 이메일 입력 → [Verify] 클릭 → 코드 수신 확인 (콘솔 or 메일함)
3. 코드 입력 → [Confirm] 클릭 → 성공 배지 확인
4. 나머지 필드 입력 → [Create Account] → 로그인 페이지로 이동
5. 재접속하여 로그인 성공 확인

### 9-3. 실메일 수신 테스트 (§3-4)
- **환경**: 운영 서버 또는 SES 자격증명 보유 로컬 환경
- **수신 주소**:
  - pa1168@naver.com
  - ruri.lee0223@gmail.com
- **검증 항목**:
  - [ ] 받은편지함 수신 (또는 스팸함 확인)
  - [ ] 제목: `[IABSE 2026] Email Verification Code`
  - [ ] 본문에 6자리 코드 포함
  - [ ] 본문에 "expires in 10 min" 안내
  - [ ] 발신: `iabse2026@kibse.or.kr`
  - [ ] **10분 이내 입력 시 인증 성공**
  - [ ] **10분 초과 후 입력 시 `VERIFICATION_CODE_EXPIRED` 에러**

---

## 10. 사용자 확정 사항 (Confirmed Decisions — 2026-04-20)

| 항목 | 확정 답변 |
|------|---------|
| 1. 실메일 테스트 환경 | **선택지 A** — 운영 서버 배포 후 테스트 (테스트 방법은 §12에 상세 기술) |
| 2. pa1168@naver 도메인 | **`pa1168@naver.com`** 으로 보정 |
| 3. IABSE 안내 문구 | **포함하지 않음** — 회원가입 페이지에서 IABSE 관련 UI 완전 제거 |
| 4. 인증 완료 이력 TTL | **20분** |
| 5. 미인증 User 데이터 처리 | **옵션 B** — `emailVerified=false`인 User 일괄 삭제. 신규 플로우에서는 **인증 + 필수 정보 입력을 모두 완료**해야만 `User` 레코드가 생성됨 (현재의 "가입 → 인증" 순서는 틀린 구조이며 교정 대상) |

### 10-1. 핵심 아키텍처 변경점 (#5 확정에 따른 수정)

현재 플로우:
```
[FORM 제출] → User INSERT (emailVerified=false) → 코드 발송 → [VERIFY 단계] → user.emailVerified=true
          ↑ 이 시점에 이미 레코드가 생성되는 것이 문제
```

새 플로우 (확정):
```
[Verify 클릭] → 코드 발송 (User 레코드 없음) → [Confirm] → verifiedEmails에 이메일만 기록
     → [나머지 필수 정보 입력 + Create Account 클릭] → **이 시점에 비로소 User INSERT** (emailVerified=true)
```

즉 `User` 엔티티는 **인증 완료 + 모든 필수 정보 입력 + Create Account 버튼 클릭**의 3요소가 충족된 후에만 생성된다.

### 10-2. 기존 미인증 User 데이터 삭제 (Option B)

**운영 DB** (`kssc2026`):
```sql
-- 삭제 전 개수 확인
SELECT COUNT(*) FROM users WHERE email_verified = 0;

-- 관련 리프레시 토큰 먼저 제거
DELETE rt FROM refresh_tokens rt
 INNER JOIN users u ON u.email = rt.user_email
 WHERE u.email_verified = 0;

-- 미인증 User 삭제
DELETE FROM users WHERE email_verified = 0;
```

**dev 환경**: `ddl-auto: create-drop`이므로 서버 재시작 시 자동 초기화됨 → 별도 작업 불필요.

---

## 11. 승인 및 착수

요청자(ruri.lee0223@gmail.com)의 위 질문에 대한 답변 및 승인 후 다음 순서로 구현 진행:

1. 백엔드 — DTO + ErrorCode + EmailService 메서드 추가
2. 백엔드 — Controller + SecurityConfig + AuthService 수정
3. 프론트엔드 — `api.ts` 함수 추가
4. 프론트엔드 — `SignupPage.tsx` UI 재구성 (인라인 인증 + 카운트다운)
5. 로컬 빌드/타입체크/수동 E2E 확인
6. PR 생성 → 리뷰 → merge → 운영 배포
7. 실메일 수신 테스트 (pa1168@naver.com, ruri.lee0223@gmail.com)
8. 10분 타임아웃 검증 (수동)

---

## 12. 실메일 수신 테스트 절차 (Real Email Test — 운영 배포 후)

운영 서버(`https://iabse-inc2026-registration.com`)에 배포 후 아래 절차로 검증.

### 12-1. 사전 준비
- PR 병합 → GitHub Actions 자동 배포 완료 확인
- 헬스체크: `curl https://iabse-inc2026-registration.com/api/health` → `200 OK`
- 운영 DB에서 **기존 미인증 User 레코드 삭제 선행** (필요 시)
  ```bash
  ssh -i ~/.ssh/kssc2026-lightsail.pem ubuntu@52.79.209.95
  sudo -u postgres sqlcmd -S localhost -U kssc_app -P '<pw>' -C -d kssc2026 \
    -Q "SELECT COUNT(*) FROM users WHERE email_verified = 0;"
  # 개수 확인 후 삭제 (옵션 B)
  ```

### 12-2. 테스트 시나리오 A — 정상 수신 & 인증

**대상 수신자**: `ruri.lee0223@gmail.com`, `pa1168@naver.com`

1. 브라우저에서 `https://iabse-inc2026-registration.com/signup` 접속
2. 이메일 입력: `ruri.lee0223@gmail.com`
3. `[Verify]` 버튼 클릭
4. **검증 체크리스트**:
   - [ ] 받은편지함 수신 확인 (스팸함도 체크)
   - [ ] 제목: `[IABSE 2026] Email Verification Code`
   - [ ] 발신: `iabse2026@kibse.or.kr`
   - [ ] 6자리 숫자 코드 표시
   - [ ] `This code expires in 10 minutes.` 문구 포함
5. 코드 복사 → 화면의 코드 입력 필드에 붙여넣기 → `[Confirm]` 클릭
6. 이메일 필드에 ✓ `Verified` 배지 표시 확인
7. 나머지 필수 필드 입력 → `[Create Account]` 클릭
8. 로그인 페이지(`/login?verified=1`)로 리다이렉트 확인
9. 방금 만든 계정으로 로그인 성공 확인
10. `pa1168@naver.com` 으로도 1–9 단계 반복 (스팸 분류 여부 주목)

### 12-3. 테스트 시나리오 B — 10분 타임아웃 검증

1. 이메일 입력 후 `[Verify]` 클릭 → 카운트다운 시작 (`10:00` → `00:00`)
2. **절대 코드를 입력하지 않고 10분 대기**
3. **검증 체크리스트**:
   - [ ] 카운트다운이 `00:00` 도달 시 빨간색 `Expired` 표시
   - [ ] 코드 입력 필드 비활성화
   - [ ] `[Confirm]` 버튼 비활성화
   - [ ] 안내 메시지: "Code expired. Please resend."
4. 만료된 코드(수신 메일에서 복사)를 개발자 도구로 강제 입력 후 `[Confirm]` 호출:
   - [ ] 서버 응답: `VERIFICATION_CODE_EXPIRED` (HTTP 400)
   - [ ] 화면 에러: "인증 코드가 만료되었습니다."
5. `[Resend Code]` 클릭 → 새 카운트다운 10:00 시작 + 새 코드 수신

### 12-4. 테스트 시나리오 C — 재발급 플로우 (BUG-A 해결 확인)

1. 이메일 입력 후 `[Verify]` 클릭 → 메일 A 수신
2. 30초 이내 `[Resend Code]` 클릭 시도 → 버튼 disabled, `Resend (Ns)` 표시
3. 30초 경과 후 `[Resend Code]` 클릭 → 메일 B 수신
4. **검증 체크리스트**:
   - [ ] 메일 A의 코드 입력 → `Confirm` → `VERIFICATION_CODE_INVALID` 반환 (이전 코드 무효화 확인)
   - [ ] 메일 B의 코드 입력 → `Confirm` → 인증 성공
   - [ ] 카운트다운 10:00 으로 재시작됨

### 12-5. 테스트 시나리오 D — 중복 가입 차단

1. 기존에 가입한 이메일(예: `ruri.lee0223@gmail.com`)로 다시 가입 시도
2. 이메일 입력 후 `[Verify]` 클릭
3. **검증 체크리스트**:
   - [ ] 서버 응답: `EMAIL_ALREADY_EXISTS` (HTTP 409)
   - [ ] 화면 에러: "이미 사용 중인 이메일입니다."
   - [ ] **이메일이 발송되지 않음** (스팸 악용 방지 BUG-B 확인)

### 12-6. 테스트 시나리오 E — 인증 없이 가입 시도

개발자 도구 콘솔에서 직접 호출:
```javascript
fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'never-verified@example.com',
    password: '<64자 sha256 hex>',
    nameKr: '홍길동', nameEn: 'Hong', affiliation: 'Test',
    position: 'Test', country: 'South Korea', birthDate: '1990-01-01',
    isPresenter: false
  })
})
```

**검증**:
- [ ] 서버 응답: `EMAIL_NOT_VERIFIED` (HTTP 403)
- [ ] 메시지: "이메일 인증이 필요합니다."
- [ ] DB에 User 레코드가 **생성되지 않음** 확인

### 12-7. 테스트 로그 수집

실패 시 다음 정보 수집:
```bash
# 서버 로그
ssh ... "sudo journalctl -u kssc2026 -n 200 | grep -E '(Email|VERIFICATION|EMAIL_)'"

# 이메일 발송 로그 (AWS SES 콘솔 → Sending statistics)
# - Delivery / Bounce / Complaint 건수

# 클라이언트 네트워크 탭에서 실패한 요청의 status/body 스크린샷
```

### 12-8. 문제 발생 시 체크포인트

| 증상 | 원인 | 해결 |
|------|------|------|
| 메일 안 옴 (Gmail) | SES Sandbox | AWS SES 콘솔에서 Sandbox 해제 신청 / 인증된 수신자 확인 |
| 스팸함으로 감 (Naver) | SPF/DKIM | `dig TXT iabse2026@kibse.or.kr` 로 DKIM 레코드 확인 |
| 코드 입력했는데 401/403 | 인증 이력 TTL 20분 초과 | 다시 `[Verify]` → 새 코드 → 가입 빠르게 진행 |
| `Verify` 버튼 눌러도 응답 없음 | CORS/Network | 개발자 도구 Network 탭 확인, `/api/auth/send-code` 응답 상태 확인 |

---

## 13. 개발 환경 (Dev) 테스트 절차

실메일 발송 없이 로컬에서 플로우 동작만 확인할 때:

```bash
# 백엔드 실행
cd back && ./mvnw spring-boot:run

# 프론트엔드 실행
cd front && npm run dev
```

1. `http://localhost:5173/signup` 접속
2. 이메일 입력 + `[Verify]` 클릭
3. 백엔드 콘솔에서 코드 확인:
   ```
   ╔══════════════════════════════════════════════╗
   ║  [DEV] Email Verification Code
   ║  To: test@example.com
   ║  Code: 123456  (expires in 10 min)
   ╚══════════════════════════════════════════════╝
   ```
4. 또는 API 호출: `curl 'http://localhost:8080/api/dev/code?email=test@example.com'`
5. 코드 입력 → `[Confirm]` → 나머지 필드 입력 → `[Create Account]`

---

**문서 버전**: 1.1
**최종 수정**: 2026-04-20 (구현 완료 반영)
