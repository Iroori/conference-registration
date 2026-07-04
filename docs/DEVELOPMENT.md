# IABSE INCHEON 2026 — 로컬 개발 환경 가이드 (DEVELOPMENT.md)

이 문서는 프로젝트의 로컬 개발 설정 및 운영 환경 구성을 지원하기 위한 가이드라인입니다.

---

## 1. 로컬 개발 환경 실행

로컬 환경에서는 백엔드 구동 시 H2 인메모리 데이터베이스를 자동으로 사용합니다.

```bash
# 1. 백엔드 실행 (H2 DB 자동 적용)
cd back && ./mvnw spring-boot:run        # macOS / Linux
cd back && mvnw.cmd spring-boot:run      # Windows

# 2. 프론트엔드 실행 (Vite dev server)
cd front && npm run dev
```

---

## 2. 사전 시드 계정 (dev 프로파일 전용)

로컬 실행 시 `dev` 프로파일(기본값)로 동작하면 데이터베이스에 아래와 같은 테스트 계정이 자동으로 시딩됩니다.

| 이메일 | 비밀번호 | 회원 유형 |
|--------|----------|----------|
| `member@test.com` | `Test1234!` | MEMBER (학회 회원) |
| `young@test.com` | `Test1234!` | NON_MEMBER (YE) (35세 이하 비회원) |
| `senior@test.com` | `Test1234!` | NON_MEMBER (35세 초과 비회원) |

---

## 3. 이메일 인증 우회 및 확인 (로컬 환경)

로컬 개발 환경에는 외부 SMTP 서버(AWS SES 등) 연동이 활성화되지 않으므로, 다음 방법 중 하나를 선택해 이메일 인증을 통과할 수 있습니다.

### 방법 1: 백엔드 콘솔 로그 확인
이메일 인증을 요청하면 백엔드 터미널 콘솔 로그에 발급된 **6자리 인증 코드**가 출력됩니다.

### 방법 2: 개발자 전용 API 직접 호출
콘솔을 보지 않고 다음 API 엔드포인트를 호출하여 검증할 수 있습니다.
- **인증 코드 조회**: `GET /api/dev/code?email={email}`
- **강제 인증 완료**: `POST /api/dev/verify?email={email}`

> ⚠️ 이 개발자 전용 API(`com.roo.payment.domain.dev.DevController`)는 백엔드 설정 파일 내 `app.dev-mode=false`일 때 자동으로 비활성화됩니다.

---

## 4. 로컬 환경 변수 설정 (.env)

프론트엔드(`front/.env` 등) 및 로컬 환경에서 사용하는 주요 변수 정보입니다.

```bash
# front/.env (Vite 개발용)
VITE_API_URL=http://localhost:8080
```

---

## 5. 크로스 플랫폼 개발 참고사항

개발진이 macOS와 Windows를 동시에 사용할 때 발생하는 호환성 이슈를 방지하기 위한 제약 사항입니다.

| 항목 | macOS | Windows |
|------|-------|---------|
| **Maven Wrapper** | `./mvnw` | `mvnw.cmd` |
| **Shell 터미널** | `zsh` / `bash` | `PowerShell` / `CMD` |
| **줄바꿈 (Line End)** | `LF` | `CRLF` (Git config에 의해 `text=auto` 처리됨) |
| **SSH Key 기본 경로** | `~/.ssh/kssc2026-lightsail.pem` | `C:\Users\<사용자>\.ssh\kssc2026-lightsail.pem` |

- **쉘 스크립트 작성 시 주의**: `.sh` 파일을 수정할 때는 Windows 에디터에서 강제로 `CRLF`로 저장하지 않도록 줄바꿈을 `LF`로 고정하십시오.
- **Git Attributes 설정**: 프로젝트 루트의 `.gitattributes` 설정에 따라 텍스트 파일은 자동으로 시스템 환경에 맞추어 변환됩니다.
