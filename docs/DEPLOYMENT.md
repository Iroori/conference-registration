# IABSE INCHEON 2026 — 운영 및 배포 가이드 (DEPLOYMENT.md)

이 문서는 AWS Lightsail 클라우드 환경의 운영 서버 설정, 배포 인프라 구성, 그리고 관리를 위한 가이드라인입니다.

> ⚠️ **보안 주의**: 실서버의 실제 비밀번호, 비밀 키, API Key 등 민감값은 이 문서에 기록하지 않으며, 서버 내의 환경설정 파일(`.env`)과 GitHub Repository Secrets를 통해서만 주입 및 관리합니다.

---

## 1. 인프라 정보 (AWS Lightsail)

| 항목 | 상세 정보 |
|------|-----------|
| **클라우드 플랫폼** | AWS Lightsail (ap-northeast-2 서울 리전) |
| **운영서버 인스턴스**| `kssc2026-server` (Ubuntu 22.04 LTS, 4GB RAM, 80GB SSD) |
| **퍼블릭 고정 IP** | `52.79.209.95` |
| **공식 도메인** | `iabse-inc2026-registration.com` (Route 53 연동) |
| **HTTPS 인증서** | Let's Encrypt SSL (자동 갱신 크론탭 활성화됨) |
| **데이터베이스** | SQL Server 2022 Express — `kssc2026` (prod) / `kssc2026_dev` (dev) |
| **이메일 솔루션** | AWS SES (DKIM 인증 및 발신 한도 승인 완료) |

---

## 2. 서버 내 디렉토리 구조

실서버 내 백엔드 및 프론트엔드의 배치 구조는 다음과 같습니다.

```bash
/opt/kssc2026/
├── app.jar        # Spring Boot 빌드 결과물 (JAR)
└── .env           # 실서버 필수 환경변수 파일 (보안을 위해 chmod 600 설정)

/var/www/kssc2026/ # React 프론트엔드 Vite 빌드 결과 정적 파일 (Nginx 서빙 대상)

/etc/nginx/sites-available/kssc2026  # Nginx 가상 호스트 설정 파일
/etc/systemd/system/kssc2026.service # 백엔드 구동용 systemd 서비스 유닛 파일
```

---

## 3. 운영 환경 필수 환경변수 (`prod` 프로파일용)

운영서버에서 정상 구동을 위해 `/opt/kssc2026/.env`에 반드시 지정되어야 하는 환경변수 리스트입니다.

```bash
# JWT 서명용 비밀키 (최소 256bit 이상 랜덤 문자열)
JWT_SECRET=your_jwt_strong_secret_key_here

# SQL Server DB 접속 정보
DB_HOST=localhost
DB_PORT=1433
DB_NAME=kssc2026
DB_USERNAME=sa
DB_PASSWORD=your_secure_db_password

# AWS SES 이메일 발신 SMTP 정보
MAIL_HOST=email-smtp.ap-northeast-2.amazonaws.com
MAIL_PORT=587
MAIL_USERNAME=your_ses_smtp_username
MAIL_PASSWORD=your_ses_smtp_password

# 관리자 및 CORS 설정
ADMIN_SECRET=your_admin_access_secret_key
CORS_ORIGINS=https://kssc2026.org
```

---

## 4. 서버 관리 및 배포 제어 명령어

서버 터미널에 SSH 접속 후 백엔드 서비스 및 Nginx 서버를 관리하기 위한 명령어 세트입니다.

### 백엔드 Spring Boot 서비스 관리
```bash
# 서비스 구동 상태 확인
sudo systemctl status kssc2026

# 백엔드 서비스 재시작
sudo systemctl restart kssc2026

# 백엔드 서비스 기동 및 중지
sudo systemctl start kssc2026
sudo systemctl stop kssc2026

# 실시간 애플리케이션 콘솔 로그 스트리밍
sudo journalctl -u kssc2026 -f
```

### Nginx 웹 서버 관리
```bash
# Nginx 설정 문법 검사
sudo nginx -t

# Nginx 서비스 재로드 (무중단 설정 적용)
sudo systemctl reload nginx

# Nginx 서비스 재시작
sudo systemctl restart nginx
```

---

## 5. CI/CD 자동 배포 흐름

1. **코드 머지**: 로컬에서 검증을 마친 기능 브랜치를 `main` 브랜치로 Pull Request 및 Merge 합니다.
2. **GitHub Actions 기동**: `main` 브랜치에 Push가 발생하면 CI/CD 워크플로우가 자동으로 수행됩니다.
3. **빌드 & 패키징**: Maven 빌드 및 Vite 프론트엔드 빌드를 수행합니다.
4. **전송**: 빌드 결과물(`app.jar` 및 `dist/` 폴더)을 SCP/rsync 프로토콜로 `52.79.209.95` 서버로 전송합니다.
5. **무중단 적용**: 서버 내 서비스(`kssc2026.service`)를 재시작하고 헬스체크 API를 검증하여 배포를 종료합니다.
