# KSSC 2026 — AWS 배포 설계서

> 작성일: 2026-04-16  
> 대상: Spring Boot 4 + React + MSSQL 컨퍼런스 등록/결제 시스템  
> 예상 규모: 총 사용자 600명 / 최대 동시 트래픽 100~200명/일

---

## 1. 아키텍처 개요

```
인터넷
  │
  ├── Route 53 (도메인 + DNS)
  │     └── kssc2026.org → Lightsail 고정 IP
  │
  └── Lightsail Instance (ap-northeast-2, 서울)
        ├── Nginx (리버스 프록시 + SSL 종료)
        │     ├── HTTPS :443 → Spring Boot :8080
        │     └── HTTP  :80  → HTTPS 리다이렉트
        ├── Spring Boot JAR (백엔드)
        ├── React 빌드 결과물 (Nginx가 정적 파일 서빙)
        └── SQL Server (MSSQL) — 동일 인스턴스 설치
```

### 왜 Lightsail 단일 인스턴스인가?
- 600명 / 100~200명/일 규모는 단일 서버로 충분
- RDS SQL Server는 최소 $50+/월 → 과도한 비용
- Lightsail은 고정 IP 무료 제공 → 동적 IP 문제 없음
- 도메인은 Route 53에서 구매 가능

---

## 2. 비용 예산 (월 기준)

| 항목 | 사양 | 예상 비용 |
|------|------|----------|
| Lightsail Instance | 4GB RAM / 2vCPU / 80GB SSD | $20/월 |
| Lightsail 고정 IP | 인스턴스에 연결 시 | **무료** |
| Route 53 도메인 | .org 기준 | $11~14/년 |
| Route 53 호스팅 영역 | 월 고정 | $0.50/월 |
| SSL 인증서 | Let's Encrypt (Certbot) | **무료** |
| **합계** | | **약 $21/월 + 도메인** |

> MSSQL: SQL Server Express Edition 무료 (DB 10GB 제한 / 600명 규모 충분)

---

## 3. 구현 단계 (순서대로)

### Phase 1 — AWS 인프라 구성
- [ ] Route 53에서 도메인 구매 (`kssc2026.org` 또는 원하는 도메인)
- [ ] Route 53 호스팅 영역 생성
- [ ] Lightsail 인스턴스 생성 (Ubuntu 22.04 LTS)
- [ ] Lightsail 고정 IP 발급 → 인스턴스에 연결
- [ ] Route 53 A 레코드 등록 (도메인 → 고정 IP)

### Phase 2 — 서버 환경 구성
- [ ] Java 17 설치
- [ ] MSSQL (SQL Server Express) 설치 및 DB/계정 생성
- [ ] Nginx 설치 + 리버스 프록시 설정
- [ ] Certbot으로 Let's Encrypt SSL 발급
- [ ] systemd 서비스 등록 (Spring Boot 자동 시작)

### Phase 3 — 프로젝트 설정 변경
- [ ] `application-prod.yml` 작성 (MSSQL 연결 설정)
- [ ] H2 → MSSQL 스키마 초기화 스크립트 작성
- [ ] 환경변수 목록 정리 (JWT_SECRET, DB 접속정보, MAIL 등)
- [ ] `.env.production` 프론트엔드 환경변수 설정

### Phase 4 — 배포 자동화 (CI/CD)
- [ ] GitHub Actions 워크플로 작성
- [ ] Lightsail SSH 키 → GitHub Secrets 등록
- [ ] 자동 배포 파이프라인 구성 (아래 상세 설명)

### Phase 5 — 검증
- [ ] HTTPS 접속 확인
- [ ] 회원가입 / 로그인 / 결제 플로우 전체 테스트
- [ ] 관리자 계정 초기 세팅

---

## 4. GitHub Actions 자동 배포 파이프라인

```
main 브랜치 push
  │
  ├── [Backend] Maven 빌드 → .jar 생성
  ├── [Frontend] npm build → dist/ 생성
  │
  └── SSH로 Lightsail 접속
        ├── JAR 파일 업로드 (scp)
        ├── dist/ 파일 업로드 (scp → Nginx 서빙 경로)
        └── systemd 서비스 재시작
```

### `.github/workflows/deploy.yml` 구조 (예시)
```yaml
name: Deploy to AWS Lightsail

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # 백엔드 빌드
      - name: Build Backend
        run: cd back && ./mvnw clean package -DskipTests -Pprod

      # 프론트엔드 빌드
      - name: Build Frontend
        run: cd front && npm ci && npm run build

      # 서버 배포 (SSH)
      - name: Deploy to Lightsail
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.LIGHTSAIL_HOST }}
          username: ubuntu
          key: ${{ secrets.LIGHTSAIL_SSH_KEY }}
          script: |
            # JAR 교체 및 재시작
            sudo systemctl stop kssc2026
            # (파일 전송 후)
            sudo systemctl start kssc2026
```

---

## 5. MSSQL 마이그레이션 계획

### H2 → SQL Server Express 전환
- `ddl-auto: validate` (prod 프로파일)
- 초기 스키마는 `schema.sql` 스크립트로 수동 실행
- 기존 H2 시드 데이터는 `DataInitializer`가 prod에서도 동작하도록 조건 처리

### application-prod.yml 핵심 설정 (예시)
```yaml
spring:
  datasource:
    url: jdbc:sqlserver://${DB_HOST}:${DB_PORT};databaseName=${DB_NAME};encrypt=true;trustServerCertificate=true
    driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    database-platform: org.hibernate.dialect.SQLServerDialect
```

---

## 6. 도메인 설정 흐름

```
Route 53 도메인 구매
  └── 자동으로 호스팅 영역 생성
        └── A 레코드 추가
              ├── @ → Lightsail 고정 IP  (kssc2026.org)
              └── www → Lightsail 고정 IP  (www.kssc2026.org)
```

SSL 인증서 발급:
```bash
sudo certbot --nginx -d kssc2026.org -d www.kssc2026.org
```

---

## 7. Nginx 설정 구조

```nginx
server {
    listen 80;
    server_name kssc2026.org www.kssc2026.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name kssc2026.org www.kssc2026.org;

    # SSL (Certbot 자동 설정)
    ssl_certificate /etc/letsencrypt/live/kssc2026.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kssc2026.org/privkey.pem;

    # React 정적 파일
    root /var/www/kssc2026;
    index index.html;

    # API → Spring Boot
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA 라우팅
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 8. 환경변수 목록 (GitHub Secrets 등록 필요)

### 서버 접속
| Secret 이름 | 내용 |
|-------------|------|
| `LIGHTSAIL_HOST` | Lightsail 고정 IP |
| `LIGHTSAIL_SSH_KEY` | SSH 개인키 (PEM 내용 전체) |

### Spring Boot prod 환경변수 (서버에 .env 파일로 관리)
| 변수명 | 내용 |
|--------|------|
| `JWT_SECRET` | 256bit 이상 랜덤 문자열 |
| `DB_HOST` | localhost (같은 서버) |
| `DB_PORT` | 1433 |
| `DB_NAME` | kssc2026 |
| `DB_USERNAME` | DB 계정 |
| `DB_PASSWORD` | DB 비밀번호 |
| `MAIL_HOST` | SMTP 서버 호스트 |
| `MAIL_PORT` | SMTP 포트 |
| `MAIL_USERNAME` | 발송 이메일 주소 |
| `MAIL_PASSWORD` | SMTP 앱 비밀번호 |
| `ADMIN_SECRET` | 관리자 가입 키 |
| `CORS_ORIGINS` | https://kssc2026.org |

### 프론트엔드 (.env.production)
| 변수명 | 내용 |
|--------|------|
| `VITE_API_BASE_URL` | https://kssc2026.org |
| PG 관련 환경변수 | 기존 .env 파일에서 관리 (별도 설정 불필요) |

---

## 9. 추가로 제공해주셔야 할 정보

설계를 완성하고 실제 구현으로 넘어가려면 아래 항목이 필요합니다:

### 필수
- [ ] **구매할 도메인 이름** (예: kssc2026.org, kssc2026.com 등) — 추후 연결 가능, 우선 IP로 진행
- [ ] **SES Sandbox 해제 신청** — AWS 콘솔에서 직접 신청 필요 (1~2일 소요)

### 선택
- [ ] **관리자 이메일 계정** — 초기 admin 계정 이메일
- [ ] **로고/파비콘 파일** — 있으면 배포 시 포함
- [ ] **GitHub 저장소 공개/비공개 여부** — Actions 무료 사용 한도 관련

---

## 10. 진행 순서 요약

```
1. 도메인 이름 결정 → Route 53에서 구매
2. Lightsail 인스턴스 생성 + 고정 IP 연결
3. 서버 환경 구성 (Java, MSSQL, Nginx, Certbot)
4. application-prod.yml + 환경변수 설정
5. GitHub Actions CI/CD 구성
6. 첫 배포 + 도메인 연결 확인
7. 전체 플로우 테스트
```
