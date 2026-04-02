# KSSC 2026 결제 연동 프로세스 프로세스 및 환경 관리

결제 연동(Paygate) 시, 테스트(데모) 환경과 상용(실서버) 환경의 파라미터와 동작이 다르기 때문에 **소스 코드 내 하드코딩을 엄격히 금지**하며, 환경변수를 통해 분리합니다.

## 1. 프론트엔드 환경변수 적용 (.env)
프론트엔드 애플리케이션(Vite)에서는 루트 디렉토리의 `.env` 파일에 결제 파라미터를 등록하여 사용합니다. `import.meta.env` 문법을 사용합니다.

**✅ 올바른 구현 (환경변수 주입)**
```tsx
<input type="hidden" name="mid" value={import.meta.env.VITE_PAYGATE_MID} />
<input type="hidden" name="paymethod" value={import.meta.env.VITE_PAYGATE_METHOD} />
```

### 테스트/로컬 환경 (`.env.local` 또는 로컬 `.env`)
```env
VITE_PAYGATE_MID=paygatekr   # 데모용 상점 아이디
VITE_PAYGATE_METHOD=9        # 데모 전용 카드결제 메소드 값
```

### 운영/상용 환경 (빌드 또는 서버 환경 변수)
```env
VITE_PAYGATE_MID=realmerchantid  # 정식 계약 후 받은 프로덕션 상점 아이디
VITE_PAYGATE_METHOD=card         # 실제 카드 결제 분기 메소드 ('card', '100' 등)
```

## 2. 백엔드 연동 환경 분리 (application.yml)
Java 백엔드(Spring Boot)에서도 결제 서버 검증 API 등을 호출할 때 로컬/운영의 프로필을 분리해서 운영해야 합니다. 
만약 페이게이트의 API 인증 키(실서버 보안용)가 배포될 경우 `application.yml`의 `${ENV_VAR}` 변수로 분리하여 주입받습니다.

```yml
app:
  paygate:
    verify-url: https://service.paygate.net/admin/settle/verifyReceived.jsp
    api-key: ${PAYGATE_API_KEY:default-test-key} 
```

## 3. 전체 결제 프로세스 요약
안전한 결제를 위해 반드시 프론트(인가) -> 백엔드(최종 검증)의 2-Step 프로세스를 따릅니다.

1. **[Front] 폼 정보 세팅 및 전송**
   - 상점 ID(`mid`), 통화 단위(`goodcurrency`), 이용 금액(`unitprice`) 등을 `PGIOForm` 하위 요소에 숨김 필드(hidden)로 세팅
   - `doTransaction(document.PGIOForm)` 호출을 통해 팝업/인앱 창 호출
2. **[Front] 페이게이트 통신 및 tid 획득**
   - 사용자가 카드번호 입력 및 인증 진행 후 페이게이트로부터 결과를 받음
   - Javascript 콜백 함수 `window.getPGIOresult` 가 호출됨
   - 정상 완료 (`replycode === "0000"`) 시 넘겨받은 고유 거래 번호(`tid`)를 백엔드 컨트롤러로 전송
3. **[Back] Server-to-Server 거래 상태 검증**
   - 클라이언트에서 넘겨받은 `tid` (및 변조 방지를 위한 금액, 통화, 해시값 등)를 통해 페이게이트 API와 한 번 더 백채널 통신 시도 (`verifyReceived.jsp` 호출)
   - 통신 결과가 정상 (HTTP 200 OK 및 무결성 입증) 일 경우 내부 비즈니스 로직(DB Insert, 수량 차감, 완료 메일 전송) 처리 확정
   - 실패 시 예외를 던지고 `[PAYGATE_VERIFICATION_FAILED]` 발생 (필요 시 망취소(Cancel) 로직 연계)

## 4. 클로드 에이전트 지침
* 향후 결제 관련 기능과 외부 모듈을 구현 및 수정할 때는 **반드시** 이 가이드를 우선 파악하고 파라미터를 추가해야 합니다.
* 상용 스크립트 도메인이나 키를 임의로 코드에 문자열로 삽입해서는 안 됩니다.
