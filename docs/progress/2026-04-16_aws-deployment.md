# 2026-04-16 — AWS 배포 인프라 구축

## 작업 브랜치
- `main` (인프라 설정 + CI/CD 파이프라인)

## 요구사항 (원문)
- AWS Lightsail에 프로젝트 빌드 및 배포 자동화
- 고정 IP 필수 (동적 IP 불가)
- 도메인 구매 및 연결 (iabse-inc2026-registration.com)
- MSSQL (SQL Server) 설치 — H2 → MSSQL 전환
- GitHub Actions CI/CD 파이프라인
- AWS SES 이메일 서비스 전환 (Gmail → SES)
- SSL/HTTPS 적용

## 완료 항목

### 1. Lightsail 인스턴스 생성
- **인스턴스명**: `kssc2026-server`
- **리전**: `ap-northeast-2` (서울)
- **사양**: Ubuntu 22.04 LTS / 4GB RAM / 2vCPU / 80GB SSD (`medium_3_0`)
- **고정 IP**: `52.79.209.95` (`kssc2026-static-ip`)
- **방화벽**: 22(SSH), 80(HTTP), 443(HTTPS) 오픈

### 2. 서버 환경 구성
- **Java 17** (OpenJDK 17.0.18) 설치 완료
- **Nginx 1.18.0** 설치 + 리버스 프록시 설정 완료
  - `/api/*` → Spring Boot :8080
  - `/` → React 정적 파일 (/var/www/kssc2026)
  - SPA 라우팅 (try_files → index.html)
- **Certbot** 설치 완료 (도메인 연결 후 SSL 발급 예정)
- **SQL Server 2022 Express** 설치 + 설정 완료
  - SA 비밀번호 설정 완료
  - DB 생성: `kssc2026`
  - 앱 전용 계정: `kssc_app` (db_owner)
- **systemd 서비스** 등록: `kssc2026.service`
  - 환경변수: `/opt/kssc2026/.env`
  - JAR 경로: `/opt/kssc2026/app.jar`

### 3. 프로젝트 코드 수정
- `application.yaml` prod 프로파일:
  - MSSQL 연결 설정 (`kssc2026` DB, `trustServerCertificate=true`)
  - AWS SES SMTP 엔드포인트로 변경
  - CORS 도메인 업데이트 (`iabse-inc2026-registration.com`)
  - `dev-mode: false` 명시
- `EmailConfig.java` — 주석을 SES 기준으로 업데이트

### 4. GitHub Actions CI/CD 파이프라인
- `.github/workflows/deploy.yml` 생성
- main 브랜치 push 시 자동 배포 + 수동 실행(workflow_dispatch) 지원
- 빌드: Maven (백엔드) + Vite (프론트엔드)
- 배포: SCP/rsync → systemd 재시작 → 헬스체크

### 5. 도메인 등록
- `iabse-inc2026-registration.com` Route 53에서 등록 요청 ($15/년)
- **상태**: IN_PROGRESS (등록 처리 중)
- Privacy Protection 활성화

### 6. 도메인 연결 + SSL
- **도메인**: `iabse-inc2026-registration.com` → Route 53 등록 완료
- A 레코드: `@` + `www` → `52.79.209.95`
- SSL: Let's Encrypt 인증서 발급 + Nginx 자동 적용 (만료: 2026-07-15, 자동 갱신)

### 7. SES 이메일 설정
- 도메인 인증: **완료** (DKIM SUCCESS)
- SMTP 자격증명 발급 → 서버 `.env`에 반영 완료
- **Sandbox 해제**: 요청 제출됨 (AWS 검토 중, 24시간 이내 승인 예상)

### 8. GitHub Secrets 등록
- [x] `LIGHTSAIL_HOST` → `52.79.209.95`
- [x] `LIGHTSAIL_SSH_KEY` → SSH Private Key

## 미완료 항목 (남은 작업)

### 첫 배포 + 검증
- [ ] 첫 배포 실행 (main push 또는 workflow_dispatch)
- [ ] JPA ddl-auto: 초기 한번 `update`로 스키마 생성 필요 (이후 `validate`로 복원)
- [ ] 테스트 계정 시드 데이터 생성
- [ ] 전체 플로우 테스트 (회원가입 → 이메일 인증 → 로그인 → 결제)

### SES Sandbox 해제 대기
- [ ] AWS 검토 완료 대기 (24시간 이내)
- [ ] 해제 전: 검증된 이메일(ruri.lee0223@gmail.com)로만 발송 가능
- [ ] 해제 후: 모든 수신자에게 발송 가능

### 서버 운영 설정
- [ ] 로그 로테이션 설정 (journald / Nginx)
- [ ] MSSQL 자동 백업 스크립트

## 서버 접속 정보

| 항목 | 값 |
|------|---|
| 고정 IP | `52.79.209.95` |
| SSH 접속 | `ssh -i ~/.ssh/kssc2026-lightsail.pem ubuntu@52.79.209.95` |
| SSH 키 위치 (로컬) | `C:\Users\vivobook\.ssh\kssc2026-lightsail.pem` |
| 앱 디렉토리 | `/opt/kssc2026/` |
| 환경변수 파일 | `/opt/kssc2026/.env` |
| 프론트엔드 경로 | `/var/www/kssc2026/` |
| Nginx 설정 | `/etc/nginx/sites-available/kssc2026` |
| systemd 서비스 | `sudo systemctl {start|stop|status} kssc2026` |

## DB 접속 정보

| 항목 | 값 |
|------|---|
| 엔진 | SQL Server 2022 Express |
| 포트 | 1433 |
| SA 비밀번호 | `Kssc2026!Prod#DB` |
| 앱 DB명 | `kssc2026` |
| 앱 계정 | `kssc_app` / `Kssc2026!App#User` |

## 비용 요약

| 항목 | 비용 |
|------|------|
| Lightsail (4GB) | $24/월 |
| 고정 IP | 무료 |
| 도메인 (.com) | $15/년 |
| Route 53 호스팅 | $0.50/월 |
| SSL (Let's Encrypt) | 무료 |
| SES (월 3,000건) | 무료 |
| MSSQL Express | 무료 |
| **합계** | **약 $25/월 + $15/년** |

## 변경 파일 목록

### 신규
- `.github/workflows/deploy.yml` — CI/CD 파이프라인
- `docs/aws-deployment-plan.md` — 배포 설계서
- `docs/progress/2026-04-16_aws-deployment.md` — 본 문서

### 수정
- `back/src/main/resources/application.yaml` — prod MSSQL + SES + 도메인 설정
- `back/src/main/java/com/roo/payment/config/EmailConfig.java` — SES 주석 업데이트
