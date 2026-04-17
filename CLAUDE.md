# KSSC 2026 — 개발 지침서 (CLAUDE.md)

이 파일은 Claude Code가 이 프로젝트에서 세션을 시작할 때 **자동으로 읽히는 규칙서**입니다.
코드 생성, 수정, 리뷰 등 모든 작업에서 아래 규칙을 반드시 준수하세요.

---

## 1. 프로젝트 개요

**KSSC 2026 Annual Conference** 참가 등록 및 결제 시스템.

| 항목 | 값 |
|------|---|
| 백엔드 패키지 | `com.roo.payment` |
| 백엔드 포트 | 8080 |
| 프론트엔드 포트 | 5173 (Vite → `/api` 프록시 → 8080) |
| 주요 도메인 | `user`, `iasbse`, `option`, `payment` |

---

## 2. 기술 스택

### Backend
- **Java 17** / **Spring Boot 4.0.3** / Jakarta EE 10 namespace (`jakarta.*`)
- **Spring Security 6** — Stateless, JWT 기반
- **jjwt 0.12.6** — HMAC-SHA Access Token
- **JPA / Hibernate** — H2 (dev) / SQL Server (prod)
- **Apache POI 5** — IASBSE Excel 벌크 임포트
- **JavaMailSender** — 이메일 인증 (dev: 콘솔 출력)
- **Maven** — 빌드 도구

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS 3** — 디자인 시스템
- **@tanstack/react-query v5** — 서버 상태 관리
- **Axios** + 커스텀 `apiClient` — API 통신
- **react-router-dom v6** — 라우팅

---

## 3. 백엔드 아키텍처 규칙

### 3-1. 패키지 구조
도메인 기반 패키지 구조를 **반드시** 따릅니다.

```
com.roo.payment/
├── common/
│   ├── entity/BaseEntity.java          # 공통 엔티티 (createdAt, updatedAt)
│   ├── exception/BusinessException.java
│   ├── exception/ErrorCode.java
│   ├── exception/GlobalExceptionHandler.java
│   └── response/ApiResponse.java
├── config/
│   ├── AppProperties.java              # app.* 설정 바인딩
│   ├── SecurityConfig.java
│   ├── AsyncConfig.java
│   ├── DataInitializer.java
│   └── JpaConfig.java
├── domain/
│   ├── {도메인}/
│   │   ├── controller/
│   │   ├── dto/
│   │   ├── entity/
│   │   ├── repository/
│   │   └── service/
│   └── dev/DevController.java          # 개발 전용 헬퍼
└── security/
    ├── JwtTokenProvider.java
    ├── JwtAuthFilter.java
    ├── UserDetailsServiceImpl.java
    ├── SecurityAuditService.java
    └── validator/
```

새 도메인 추가 시 위 구조를 동일하게 사용합니다.

### 3-2. 레이어 규칙

| 레이어 | 역할 | 금지 사항 |
|--------|------|----------|
| Controller | HTTP 매핑, `@Valid` 검증, `ApiResponse` 래핑 | 비즈니스 로직 직접 작성 금지 |
| Service | 트랜잭션, 비즈니스 로직 | HTTP 관련 객체(`HttpServletRequest` 등) 사용 금지 |
| Repository | JPA 쿼리 | 비즈니스 로직 금지 |
| Entity | 상태 변경 메서드 포함 | DTO 의존 금지 |

### 3-3. Service 트랜잭션 패턴

```java
@Service
@Transactional(readOnly = true)   // 클래스 기본값: 읽기 전용
public class SomeService {

    @Transactional                // 쓰기 메서드만 오버라이드
    public void create(SomeRequest req) { ... }

    public SomeResponse findById(Long id) { ... }  // readOnly 상속
}
```

### 3-4. DTO 규칙
- 요청 DTO: **Java Record** 사용 (`public record SomeRequest(...)`)
- 응답 DTO: Record 또는 `static of()` 팩토리 메서드 포함
- **절대 Entity를 Controller에서 직접 반환하지 않습니다**
- 모든 요청 DTO에 `@Valid` 및 Bean Validation 애노테이션 적용

```java
// 올바른 패턴
public record CreateOptionRequest(
    @NotBlank @Size(max = 100) String nameKr,
    @NotNull @Positive Integer price
) {}
```

### 3-5. API 응답 규칙
모든 API는 `ApiResponse<T>` 래퍼를 사용합니다.

```java
// 성공
return ResponseEntity.ok(ApiResponse.ok(data));
return ResponseEntity.ok(ApiResponse.ok("메시지", data));

// 실패 → GlobalExceptionHandler가 자동 처리
throw new BusinessException(ErrorCode.USER_NOT_FOUND);
```

응답에 **비밀번호, 토큰, 개인 식별 정보**를 포함하지 않습니다.

### 3-6. 에러 처리 규칙
- 비즈니스 오류는 반드시 `BusinessException(ErrorCode.XXX)` 사용
- 새 에러 코드는 `ErrorCode.java`에 추가 (HTTP 상태코드 + 한국어 메시지)
- `GlobalExceptionHandler`에서 처리되지 않는 예외 타입은 추가 핸들러 등록

### 3-7. 설정 값 규칙
- 모든 커스텀 설정은 `AppProperties.java`의 `app.*` 네임스페이스 사용
- **하드코딩 금지** — 매직 넘버/문자열은 상수 또는 설정으로 추출
- 운영 환경 민감값은 반드시 환경변수 (`${ENV_VAR}`)로 주입

---

## 4. 보안 규칙 (필수 준수)

### 4-1. 인증 흐름
```
로그인 → Access JWT (단기) + Refresh Token (DB 저장, UUID)
만료 시 → POST /api/auth/refresh → Token Rotation
로그아웃 → POST /api/auth/logout → DB에서 Refresh Token 삭제
```

### 4-2. JWT 규칙
- Access Token 생성: `JwtTokenProvider.generateToken(email, memberType)` 만 사용
- 검증: `JwtTokenProvider.validateAccessToken(token)` 사용
- JWT에 **비밀번호 절대 포함 금지**
- JWT payload에 `issuer=kssc2026`, `tokenType=access` 클레임 포함 (이미 설정됨)

### 4-3. 비밀번호 규칙

**전송 방식 (2026-03-31 변경)**
- 클라이언트: 평문 비밀번호를 `crypto.subtle.digest('SHA-256')`으로 해싱 → 64자 hex 문자열 전송
- 서버: 수신한 SHA-256 hex를 `BCryptPasswordEncoder`로 다시 해싱하여 DB 저장/비교
- 결과: 네트워크(Network 탭)에 평문 비밀번호가 절대 노출되지 않음

```
클라이언트        →  SHA-256("Test1234!")  →  서버(BCrypt)  →  DB
"Test1234!"  hash→  "a665a459..."(64자)  encode→  "$2a$10$..."
```

**백엔드 검증**
- `SignupRequest.password`: `@Size(min=64, max=64)` — SHA-256 hex 길이 검증
- `@StrongPassword`는 SHA-256 해시에 적용 불가 (hex 문자=소문자+숫자뿐) → **프론트엔드에서만 강도 검증**
- 프론트엔드 강도 규칙: 대문자 1자 이상, 소문자 1자 이상, 숫자 1자 이상, 특수문자 1자 이상

**기타**
- 평문 비밀번호는 로그, 응답, DB에 **절대 기록 금지**
- 운영 환경에서 반드시 HTTPS 적용 (SHA-256 해시 재전송 공격 방지)
- 개발용 테스트 계정 초기화: `DataInitializer.sha256()` 헬퍼로 `BCrypt(SHA256("Test1234!"))` 저장

### 4-4. 로그 보안 규칙
- 감사 이벤트는 `SecurityAuditService.log()` 사용 (이메일 자동 마스킹)
- 로그에 비밀번호, 토큰, 카드번호 등 민감 정보 **절대 기록 금지**
- 일반 로그: `LoggerFactory.getLogger(ClassName.class)` 사용

### 4-5. JwtAuthFilter 규칙
- **DB 조회 금지** — JWT 클레임에서 직접 인증 객체 생성 (현재 구현 유지)
- `UserDetailsService`는 `AuthenticationManager`(로그인 시)에서만 사용

---

## 5. 회원 유형 로직

**회원가입 시점에 결정, 이후 변경 불가**

```
이메일이 iasbse_members 테이블에 존재?
  ├── YES → MemberType.MEMBER
  └── NO  → 만 나이 ≤ 35 → MemberType.NON_MEMBER  (Young Engineer)
            만 나이 > 35 → MemberType.NON_MEMBER_PLUS
```

- 결제 옵션 필터링: `allowedMemberType` 필드로 DB 쿼리에서 제한
- IASBSE 실시간 확인: `GET /api/iasbse/check?email=` (인증 불필요)

---

## 6. 프론트엔드 규칙

### 6-1. 디자인 시스템 (Tailwind CSS)

| 역할 | 클래스 |
|------|--------|
| Primary 색상 | `teal-500` / hover: `teal-600` / focus ring: `teal-100` |
| 배경 | `bg-slate-50` |
| 카드 | `bg-white rounded-2xl border border-slate-100 shadow-sm` |
| 헤더 | `bg-slate-800` (dark) + `text-teal-400` accent |
| 폰트 | DM Sans (400/500/600) |
| 기본 버튼 | `.btn-primary` (index.css 유틸리티 클래스) |
| 보조 버튼 | `.btn-secondary` |
| 인풋 | `.input-base` |

**커스텀 클래스 추가 시** `front/src/index.css`의 `@layer components`에 등록합니다.

### 6-2. 파일 구조

```
src/
├── components/   # 재사용 UI 컴포넌트
├── context/      # React Context (AuthContext)
├── hooks/        # 커스텀 훅
├── lib/
│   ├── api.ts        # API 함수 모음 (apiXxx 네이밍)
│   └── apiClient.ts  # Axios 인스턴스 (인터셉터 포함)
├── pages/        # 라우트 단위 페이지 컴포넌트
└── types/        # TypeScript 타입 정의 (index.ts)
```

### 6-3. API 호출 규칙
- 모든 API 함수는 `front/src/lib/api.ts`에 정의 (`apiLogin`, `apiCreatePayment` 형식)
- Axios 인스턴스는 `apiClient`만 사용 (직접 `axios.get()` 호출 금지)
- 401 응답 시 `apiClient` 인터셉터가 자동으로 토큰 갱신 처리 (직접 구현 금지)

### 6-4. 인증 상태 관리
- `useAuth()` 훅을 통해서만 인증 상태 접근
- `localStorage` 직접 접근 금지 — `AuthContext`의 `login()` / `logout()` 사용
- 보호된 라우트는 `ProtectedRoute` 컴포넌트 사용

### 6-5. TypeScript 규칙
- `any` 타입 사용 금지 — 불명확한 경우 `unknown` 사용 후 타입 가드 적용
- API 응답 타입은 `front/src/types/index.ts`에 정의
- 컴포넌트 props는 `interface Props {}` 또는 인라인 타입으로 명시

---

## 7. 데이터베이스 규칙

### 7-1. 엔티티 규칙
- 모든 엔티티는 `BaseEntity`를 상속 (`createdAt`, `updatedAt` 자동 관리)
- `@Table` 명 snake_case 소문자: `@Table(name = "refresh_tokens")`
- 인덱스는 `@Index` 애노테이션으로 엔티티에 정의

### 7-2. 환경별 DDL 전략

| 환경 | ddl-auto | 설명 |
|------|----------|------|
| dev | `create-drop` | 서버 시작 시 초기화, 종료 시 삭제 |
| prod | `validate` | 스키마 변경 금지, 검증만 수행 |

운영 DB 스키마 변경 시 **Flyway/Liquibase 마이그레이션 스크립트** 작성 필요.

### 7-3. 쿼리 규칙
- 단순 조회: Spring Data JPA 메서드 쿼리 사용
- 복잡한 쿼리: `@Query(JPQL)` 사용 (native query 최소화)
- N+1 방지: 필요 시 `@EntityGraph` 또는 fetch join 사용

---

## 8. 개발 환경 설정

### 8-1. 로컬 실행

```bash
# 백엔드 (H2 인메모리 DB 자동 사용)
cd back && ./mvnw spring-boot:run

# 프론트엔드
cd front && npm run dev
```

### 8-2. 사전 시드 계정 (dev 프로파일 자동 생성)

| 이메일 | 비밀번호 | 회원 유형 |
|--------|----------|----------|
| member@test.com | Test1234! | MEMBER |
| young@test.com | Test1234! | NON_MEMBER (YE) |
| senior@test.com | Test1234! | NON_MEMBER_PLUS |

### 8-3. 이메일 인증 (로컬 SMTP 없음)

```bash
# 방법 1: 콘솔 로그에서 6자리 코드 확인
# 방법 2: API 직접 호출
GET  /api/dev/code?email={email}    # 코드 조회
POST /api/dev/verify?email={email}  # 강제 인증 완료
```

> ⚠️ `/api/dev/**` 엔드포인트는 `app.dev-mode=false` 시 자동 비활성화됩니다.

### 8-4. 환경변수 (prod 프로파일 필수)

```bash
JWT_SECRET=<최소 256bit 이상 랜덤 문자열>
DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD
ADMIN_SECRET=<관리자 키>
CORS_ORIGINS=https://kssc2026.org
```

---

## 9. Git / PR 규칙

### 9-1. 브랜치 전략
- `main` — 배포 기준 브랜치 (직접 push 금지)
- `claude/feature-name` — Claude 작업 브랜치
- 기능 단위로 브랜치를 분리하고 PR을 통해 main에 병합

### 9-2. 커밋 메시지 형식

```
feat: 새 기능 추가
fix: 버그 수정
refactor: 코드 리팩토링 (기능 변경 없음)
security: 보안 관련 변경
chore: 빌드, 설정, 의존성 변경
docs: 문서 수정
```

### 9-3. PR 생성 규칙
- 커밋 후 반드시 브랜치 push → GitHub PR 생성
- `main`에 직접 merge 금지 (로컬 포함)
- PR 설명에 Summary, Test Plan 포함

---

## 10. UI 언어 규칙 (Language Rules)

모든 UI 텍스트는 **영어**로 작성해야 합니다.

- 버튼, 레이블, 플레이스홀더, 에러 메시지, 안내 문구 등 사용자에게 표시되는 모든 문구는 영어
- 한국어는 데이터베이스 `nameKr` 필드, 내부 코드 주석에만 허용
- 개발용 시드 데이터의 이름(nameKr)은 한국어 유지 가능
- 모든 신규 컴포넌트 및 페이지는 반드시 영어로 작성

```tsx
// ✓ 올바른 예
<button>Register Now</button>
<label>Date of Birth</label>
<p>Please enter your email address.</p>

// ✗ 잘못된 예
<button>등록하기</button>
<label>생년월일</label>
```

---

## 11. 세션 작업 이력 (Progress Log)

작업 이력은 세션 단위로 `docs/progress/` 폴더에 Markdown 파일로 기록합니다.

```
docs/
└── progress/
    └── YYYY-MM-DD_짧은-설명.md   # 예: 2026-03-31_registration-payment-redesign.md
```

### 파일 포함 내용
- 작업 브랜치 / 커밋 해시 / PR 링크
- 세션 요구사항 (작업 전 원문)
- 구현 결과 (완료 / 미완료)
- 변경 파일 목록 (신규 / 수정)
- 아키텍처 결정 사항 (ADR)
- 테스트 계정 정보 및 옵션 ID 참조

### 누적 이력

| 날짜 | 파일 | 주요 내용 |
|------|------|----------|
| 2026-03-31 | [registration-payment-redesign.md](docs/progress/2026-03-31_registration-payment-redesign.md) | 회원가입 개선(국가·발표자·개인정보동의) + 결제 플로우 전면 재설계(3티어×3유형) + 영어 UI 전환 + 비밀번호 평문 전송 차단(SHA-256) |
| 2026-04-16 | [aws-deployment.md](docs/progress/2026-04-16_aws-deployment.md) | AWS Lightsail 인프라 구성 + MSSQL + SES + GitHub Actions CI/CD + 도메인/SSL 설정 |
| 2026-04-17 | [iabse-incheon-redesign.md](docs/progress/2026-04-17_iabse-incheon-redesign.md) | KSSC→IABSE 리브랜딩 + SES 발신주소 변경 + 회원 4분류(YOUNG_ENGINEER) + 기간 설정 기반 관리 + 관리자 계정/ROLE_ADMIN + 옵션 수량UI 제거 + 잔여티켓 관리자 전용 |

> 새 세션에서 기능을 추가·변경할 때마다 해당 날짜의 progress 파일을 생성하거나 업데이트합니다.

---

## 12. 운영 서버 정보 (AWS 배포)

> **보안 주의**: 비밀번호·키는 이 파일에 기록하지 않습니다. 실제 값은 서버 `/opt/kssc2026/.env` 및 GitHub Secrets에서 관리합니다.

### 12-1. 인프라 현황

| 항목 | 값 |
|------|---|
| 클라우드 | AWS Lightsail (ap-northeast-2, 서울) |
| 인스턴스명 | `kssc2026-server` (Ubuntu 22.04 / 4GB RAM / 80GB) |
| 고정 IP | `52.79.209.95` |
| 도메인 | `iabse-inc2026-registration.com` (Route 53) |
| HTTPS | Let's Encrypt (만료 2026-07-15, 자동갱신) |
| DB | SQL Server 2022 Express — `kssc2026` (prod) / `kssc2026_dev` (dev) |
| 이메일 | AWS SES (DKIM 인증 완료, Sandbox 해제 신청 완료) |

### 12-2. SSH 접속

```bash
# SSH 키 위치 (Windows)
C:\Users\vivobook\.ssh\kssc2026-lightsail.pem

# 접속 명령
ssh -i ~/.ssh/kssc2026-lightsail.pem ubuntu@52.79.209.95
```

### 12-3. 서버 디렉토리 구조

```
/opt/kssc2026/
├── app.jar        # Spring Boot 실행 JAR
└── .env           # 운영 환경변수 (chmod 600)

/var/www/kssc2026/ # React 빌드 결과물 (Nginx 서빙)
/etc/nginx/sites-available/kssc2026  # Nginx 설정
/etc/systemd/system/kssc2026.service # systemd 서비스
```

### 12-4. 서버 관리 명령

```bash
# 서비스 상태 확인
sudo systemctl status kssc2026

# 서비스 재시작
sudo systemctl restart kssc2026

# 실시간 로그
sudo journalctl -u kssc2026 -f

# Nginx 재로드
sudo systemctl reload nginx

# DB 접속 (SQL Server)
export PATH="$PATH:/opt/mssql-tools18/bin"
sqlcmd -S localhost -U kssc_app -P '<비밀번호>' -C -d kssc2026
```

### 12-5. 배포 방법

**자동 배포 (GitHub Actions):**
```
main 브랜치에 push → 자동 빌드 + 서버 배포 + 헬스체크
```

**수동 배포 (긴급 시):**
```bash
# 1. 백엔드 빌드
cd back && ./mvnw clean package -DskipTests -q

# 2. 프론트엔드 빌드
cd front && npm run build

# 3. JAR 업로드 + 서비스 재시작
scp -i ~/.ssh/kssc2026-lightsail.pem back/target/*.jar ubuntu@52.79.209.95:/opt/kssc2026/app.jar
ssh -i ~/.ssh/kssc2026-lightsail.pem ubuntu@52.79.209.95 "sudo systemctl restart kssc2026"

# 4. 프론트엔드 업로드
scp -r front/dist/. ubuntu@52.79.209.95:/var/www/kssc2026/

# 5. 헬스체크
curl https://iabse-inc2026-registration.com/api/health
```

### 12-6. GitHub Secrets 목록

| Secret 이름 | 용도 |
|-------------|------|
| `LIGHTSAIL_HOST` | 서버 IP (`52.79.209.95`) |
| `LIGHTSAIL_SSH_KEY` | SSH Private Key (PEM 전체) |
| `VITE_PAYGATE_MID_DOMESTIC` | 국내 결제 MID |
| `VITE_PAYGATE_MID_OVERSEAS` | 국외 결제 MID |
| `VITE_PAYGATE_METHOD` | 결제수단 코드 |

### 12-7. 서버 환경변수 (.env 항목)

```
JWT_SECRET, DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD
ADMIN_SECRET, CORS_ORIGINS
```

---

## 13. 금지 사항 (하지 말아야 할 것)

| 금지 | 대안 |
|------|------|
| Entity를 API 응답으로 직접 반환 | DTO + `of()` 팩토리 사용 |
| `System.out.println()` 디버깅 | SLF4J Logger 사용 |
| 비밀번호 평문 저장/로깅 | BCrypt 해시 저장, 로그 제외 |
| 로그에 토큰/민감정보 출력 | `SecurityAuditService` 마스킹 사용 |
| `any` 타입 (TypeScript) | 명시적 타입 또는 `unknown` |
| `localStorage` 직접 접근 (프론트) | `useAuth()` 훅 사용 |
| `axios` 직접 호출 (프론트) | `apiClient` 인스턴스 사용 |
| `@Transactional` 클래스 기본값 없이 쓰기 메서드만 선언 | 클래스에 `readOnly=true` 기본값 설정 |
| 운영 환경 설정값 하드코딩 | 환경변수 `${ENV_VAR}` 주입 |
| 결제(PG) 및 외부 연동 파라미터 단일 하드코딩 | 로컬(데모)과 실서버가 구분되도록 환경변수(`.env`, `import.meta.env`)로 분리 |
| main 브랜치 직접 push/merge | PR을 통한 병합 |
