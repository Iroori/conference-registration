# 2026-06-10 International Paymethod 101 Change

## 세션 요구사항
1. 해외 결제 실패(DCC 차단 및 카드 거부) 문제 진단을 위해 AWS CLI로 운영 서버 로그 확인
2. 해외 결제용 PayGate `paymethod` 설정을 `104`에서 `101` (BASIC_AUTH)로 변경 적용 및 Git 커밋/푸시

---

## 구현 결과

### 1. 해외 결제 실패 원인 분석 (완료)
- **로그 및 DB 분석:**
  - `pay924` (유효기간 만료) 및 `9805` (사용자 팝업 닫기 취소) 외에 해외 사용자의 대다수 에러가 `pay901` (Transaction error. Please contact your bank.)로 수집됨.
  - 이는 해외 카드 사용 시 발생하는 **DCC (Dynamic Currency Conversion) Block / 해외 원화 결제 차단**에 의해 카드 발급 은행에서 한국 가맹점으로의 KRW(Won) 결제를 차단한 것이 주요 원인으로 규명됨.

### 2. 결제 연동 파라미터 변경 (완료)
- **[Step3Payment.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/Step3Payment.tsx):**
  - 해외 카드의 `paymethod` 파라미터 값을 기존 `104` (해외 신용카드)에서 `101` (BASIC_AUTH)로 변경.
  - 가맹점 MID(`kibse0us`)의 우회 연동 규격에 맞게 결제 흐름 조정.

---

## 변경 파일 목록

### Frontend
- **[MODIFY]** [Step3Payment.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/Step3Payment.tsx) (수정)

---

## 테스트 및 검증 결과
- **GitHub Actions 자동 배포 성공:** 
  - `main` 브랜치 푸시 후 GitHub Actions 배포 워크플로(Run #119)가 정상 실행 및 성공적으로 종료됨.
  - 운영 서버(`/var/www/kssc2026/`)의 정적 파일 갱신 및 백엔드 애플리케이션 서비스 재기동 헬스체크 완료.
