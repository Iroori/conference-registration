# 페이게이트 신용카드 결제 API 연동 가이드

본 문서는 `api_kr.pdf` 매뉴얼의 신용카드 결제 API(OpenPayAPI) 연동 부분을 분석 및 요약한 내용입니다.

## 1. OpenPayAPI 기본 개념
웹 표준 UI를 기반으로 동작하며, 별도 플러그인(ActiveX 등) 설치 없이 자바스크립트의 비동기 호출을 이용하여 연동하는 결제 방식입니다. 

### 연동 필수 요소 (5가지 핵심 개념)
1. **API 스크립트 포함**: HTML `<head>` 위치에 API를 포함시킵니다.
   ```html
   <script src="https://api.paygate.net/ajax/common/OpenPayAPI.js"></script>
   ```
2. **PGIOForm 폼 태그**: 결제 데이터 입출력을 위한 폼. 이름 속성은 반드시 `PGIOForm`으로 정적으로 지정해야 합니다. 결제 요청 파라미터를 이 폼에 채우며, 완료 시 결과 데이터가 API에 의해 이 폼 요소들에 다시 들어옵니다.
3. **`doTransaction()` 호출**: 상점 페이지에서 결제를 시작할 때 호출하는 주요 내부 API 함수.
   `doTransaction(document.PGIOForm);`
4. **PGIOscreen 레이어 (DIV)**: 결제 진행 상태 및 안내 화면 등 페이게이트의 결제창 UI가 띄워질 DOM 영역. 필수로 존재해야 합니다.
   ```html
   <div id="PGIOscreen"></div>
   ```
5. **`getPGIOresult()` 함수 구현**: 결제 절차가 모두 종료되면 **API 내부에서 자동으로 호출하는 콜백 상점 함수**입니다. 상점 페이지에 이 함수를 선언해두고, 결과 코드(`replycode`) 등을 검사하여 이후 주문 완료/실패 프로세스를 이어가도록 구현해야 합니다.

---

## 2. 결제 흐름 (Sequence)
1. 상점 주문 페이지 로딩 (OpenPayAPI.js 포함)
2. 고객이 폼 항목 확인 후 **"지불/결제" 버튼 클릭**
3. 상점 스크립트에서 `doTransaction()` 실행 
4. `<div id="PGIOscreen">`을 통해 결제 및 인증 UI 진행 (페이게이트 ↔ 카드사 인증)
5. 인증 밎 승인 절차 완료 후 API가 결과를 `PGIOForm` 내부 변수에 할당
6. API에서 상점 페이지의 `getPGIOresult()` 함수 마지막 호출
7. 구동 완료된 결과 데이터로 검증 단계 및 클라이언트/서버 후속 주문 처리

---

## 3. PGIOForm 주요 파라미터

### 요청 파라미터 (Input)
| 파라미터명 | 최대길이 | 설명 | 입력 예시 |
| -------- | --- | --- | ------- |
| `mid` | 20 | 상점 ID (페이게이트에서 할당 발급) | `paygatekr` |
| `paymethod` | 11 | 결제수단 코드. `card` 문자열 입력 시 구 인증 / 3D 등을 자동 매핑. | `card`, `103`, `102` |
| `goodname` | 100 | 상품명 | `Test Goods` |
| `unitprice` | 10 | 상품가격. 부분 단가가 아닌 총 결제 요청 화폐 합. | `1000` |
| `goodcurrency`| 6 | 화폐단위 | `WON`, `USD` 등 |
| `langcode` | 2 | 화면 언어. KR(한국어), JP(일본어), CN(중국어) | `KR` |
| `cardquota` | 2 | 카드 할부기간. `00`은 일시불. `02`~`12` 가능. | `00` |
| `mb_serial_no` | 40 | 상점 발급 자체 주문 고유번호 (여러 tid를 묶는 단위) | `A32Q4324` |
| `receipttoname`| 20 | 구매 고객 성명 (선택) | `홍길동` |
| `receipttoemail`| 100 | 구매 고객 이메일 주소 (선택) | `user@test.com` |
| `receipttotel` | 20 | 구매 고객 휴대폰 번호 (선택) | `01012345678` |

### 응답 반환 파라미터 (Output)
| 파라미터명 | 타입 | 설명 | 반환 예시 |
| -------- | --- | --- | ------- |
| `replycode` | 6 | 결제 결과 응답코드. **`0000` 인 경우에만 정상 완료**입니다. | `0000` |
| `replyMsg` | - | 응답 코드에 따른 결과 메시지 | `정상결제` |
| `tid` | 40 | **페이게이트 고유 거래번호** (사후 추적 및 거래검증 시 필수) | `paygateshop_xxxx.xxxx` |
| `cardauthcode`| 8 | 신용카드 실제 승인번호 | `12312312` |
| `cardtype`   | 6 | 결제된 신용카드 종류 매핑 코드 | `301510` (비자 등) |
| `cardnumber` | 21 | 마스킹 처리된 카드 번호 | `425312**********` |

---

## 4. 지원 신용카드 결제 수단별 특징
*   **인증방식 자동선택 (`paymethod: card`)**: 가장 권장되는 매핑 방식으로, 국내 신용카드 결제 진행 시 ISP 계열(국민, 비씨 등) 혹은 안심클릭(삼성, 현대, 신한 등)을 자동으로 분기 감지하여 결제 인증을 진행합니다.
*   **신용카드 안심클릭 (`103`)**: 비자, 마스타에서 제시한 3D Secure를 한국화 한 것으로 MPI/XMPI를 거칩니다.
*   **신용카드 ISP 결제 (`102`)**: 국민/비씨 카드 전용으로 윈도우 환경에서 동작합니다.
*   **해외 신용카드 3D 인증결제**: `unitprice`/`goodcurrency` 요청에 따라 달러 결제, 해외 MCP/MCA 다중 통화 결제 등의 방식을 지원합니다.

---

## 5. 결제 연동 예시 (Javascript Html)

```html
<html>
<head>
    <script src="https://api.paygate.net/ajax/common/OpenPayAPI.js"></script>
    <script type="text/javascript">
        // 1) 결제를 시작하는 상점 호출부
        function startPayment() {
            // 필수 인풋들의 유효성을 클라이언트단에서 1차 검증한 이후 아래 함수를 실행합니다.
            doTransaction(document.PGIOForm);
        }

        // 2) OpenPayAPI 처리 완료 후 역참조되는 콜백 함수 설계
        function getPGIOresult() {
            var replycode = document.PGIOForm.elements['replycode'].value;
            var replyMsg = document.PGIOForm.elements['replyMsg'].value;
            
            if(replycode == "0000") {
                // 결제 성공 
                alert("결제 성공 하였습니다. 승인번호: " + document.PGIOForm.elements['cardauthcode'].value);
                
                // 이후 상점 백엔드(서버) 로 데이터 전달 후, 
                // DB 기록 및 추가 해쉬 거래검증(Server-to-Server 확인) 처리를 이어서 진행
                document.PGIOForm.action = "/api/payment/complete";
                document.PGIOForm.method = "POST";
                document.PGIOForm.submit();
            } else {
                // 결제 실패 
                alert("결제 실패: [" + replycode + "] " + replyMsg);
                // 화면 초기화 또는 오류 안내 
            }
        }
    </script>
</head>
<body>
    
    <!-- 필수 영역: 결제 창 UI가 랜더링 될 DIV 컨테이너. 위치는 자유롭게 배치 가능. -->
    <div id="PGIOscreen"></div>
    
    <!-- 결제 파라미터 폼 (name 고정) -->
    <form name="PGIOForm">
        <!-- 상점 세팅 파라미터들 (Hidden or Visible input) -->
        <input type="hidden" name="mid" value="paygateshop" />
        <input type="hidden" name="paymethod" value="card" />
        <input type="hidden" name="goodname" value="온라인 학술 참가 등록비" />
        <input type="hidden" name="unitprice" value="230000" />
        <input type="hidden" name="goodcurrency" value="WON" />
        <input type="hidden" name="langcode" value="KR" /> <!-- 화면 언어 처리 가능 -->
        <input type="hidden" name="cardquota" value="00" />

        <!-- API 가 리턴 결과를 바인딩 할 곳 -->
        <input type="hidden" name="replycode" value="" />
        <input type="hidden" name="replyMsg" value="" />
        <input type="hidden" name="tid" value="" />
        <input type="hidden" name="cardauthcode" value="" />
        <input type="hidden" name="cardtype" value="" />
        <input type="hidden" name="cardnumber" value="" />
        
        <button type="button" onclick="startPayment();">신용카드 결제하기</button>
    </form>
    
</body>
</html>
```
