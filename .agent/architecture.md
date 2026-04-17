# Project Architecture Quick Reference
# Auto-loaded by Antigravity agent for rapid context building

## Directory Map

```
conference-registration/
├── CLAUDE.md                    # Claude Code 지침서
├── GEMINI.md                    # Gemini 지침서
├── .agent/                      # Antigravity agent 설정
│   ├── config.yaml              # 메인 설정
│   ├── system_prompt.md         # 시스템 프롬프트
│   └── architecture.md          # 이 파일 (아키텍처 참조)
│
├── back/                        # Spring Boot 백엔드
│   ├── pom.xml                  # Maven 의존성 (Java 17, Spring Boot 4.0.3)
│   ├── mvnw / mvnw.cmd          # Maven wrapper (macOS / Windows)
│   └── src/main/java/com/roo/payment/
│       ├── PaymentServiceApplication.java
│       ├── common/
│       │   ├── entity/BaseEntity.java
│       │   ├── exception/{BusinessException, ErrorCode, GlobalExceptionHandler}
│       │   └── response/ApiResponse.java
│       ├── config/
│       │   ├── AppProperties.java         # app.* 설정 바인딩
│       │   ├── SecurityConfig.java        # Spring Security 설정
│       │   ├── AsyncConfig.java
│       │   ├── DataInitializer.java       # dev 시드 데이터
│       │   └── JpaConfig.java
│       ├── domain/
│       │   ├── user/        # 회원 (가입, 로그인, 프로필)
│       │   ├── iasbse/      # IASBSE 회원 DB (Excel 임포트)
│       │   ├── option/      # 등록 옵션 (가격, 유형별 필터)
│       │   ├── payment/     # 결제 처리
│       │   ├── config/      # 앱 설정 (기간, 관리)
│       │   └── dev/         # 개발 전용 (이메일 인증 우회 등)
│       └── security/
│           ├── JwtTokenProvider.java
│           ├── JwtAuthFilter.java
│           ├── UserDetailsServiceImpl.java
│           ├── SecurityAuditService.java
│           └── validator/
│
├── front/                       # React + TypeScript 프론트엔드
│   ├── package.json             # React 18, Vite 5, Tailwind 3
│   ├── vite.config.ts           # /api → localhost:8080 프록시
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx              # 라우터 설정
│       ├── main.tsx             # 엔트리포인트
│       ├── index.css            # Tailwind + 커스텀 유틸리티
│       ├── components/          # 재사용 UI 컴포넌트
│       │   ├── StepRegistrationType.tsx
│       │   ├── Step2Options.tsx
│       │   ├── Step3Payment.tsx
│       │   ├── StepAdditionalOptions.tsx
│       │   ├── StepInvitationLetter.tsx
│       │   ├── StepSummary.tsx
│       │   ├── PaymentHistory.tsx
│       │   └── Shared.tsx
│       ├── context/             # AuthContext
│       ├── hooks/               # 커스텀 훅 (useAuth 등)
│       ├── lib/
│       │   ├── api.ts           # API 함수 (apiLogin, apiSignup, ...)
│       │   └── apiClient.ts     # Axios 인스턴스 (인터셉터)
│       ├── pages/               # 라우트별 페이지
│       │   ├── LoginPage.tsx
│       │   ├── SignupPage.tsx
│       │   └── RegistrationPage.tsx
│       └── types/
│           └── index.ts         # TypeScript 타입 정의
│
├── docs/
│   ├── aws-deployment-plan.md
│   ├── payment/                 # 결제 관련 문서
│   ├── progress/                # 세션별 작업 이력 ★
│   └── requirements/            # 요구사항 문서
│
└── .github/workflows/
    └── deploy.yml               # main push → AWS 자동 배포
```

## Key Patterns

### API Response Wrapper
```java
ApiResponse.ok(data)           // 성공
ApiResponse.ok("msg", data)    // 성공 + 메시지
throw new BusinessException(ErrorCode.XXX)  // 실패
```

### Password Flow
```
Client: SHA-256(plaintext) → 64-char hex → Server: BCrypt(hex) → DB
```

### Member Types
```
MEMBER          = IASBSE 회원
NON_MEMBER      = 비회원 (Young Engineer, 만 나이 ≤ 35)
NON_MEMBER_PLUS = 비회원 (만 나이 > 35)
ADMIN           = 관리자
```

### Frontend API Call Pattern
```typescript
// lib/api.ts
export const apiSomething = async (data: SomeRequest): Promise<SomeResponse> => {
  const res = await apiClient.post<ApiResponse<SomeResponse>>('/api/something', data);
  return res.data.data;
};
```

### Test Accounts (dev only)
| Email | Password | Type |
|-------|----------|------|
| member@test.com | Test1234! | MEMBER |
| young@test.com | Test1234! | NON_MEMBER |
| senior@test.com | Test1234! | NON_MEMBER_PLUS |
