# 2026-06-02 Social Programme (Option Step 2) UI Redesign and PechaKucha Addition

## 세션 요구사항
1. **Welcome reception (9월 16일)**
   - 수량 카운터(`[-] [ 0 ] [+]`)와 거절 체크박스(`I will not attend...`)가 공존하도록 레이아웃 설계.
   - 수량이 1 이상이면 참(True)으로 설정되며 거절 체크가 해제되고, 거절을 누르면 수량이 0으로 자동 리셋되는 상호작용 반영.
   - 매진 시 기존 체크박스 대기자 신청(`Please add me to the waitlist`)이 깔끔하게 표시되도록 지원.
2. **Young Engineers programme (9월 16일)**
   - 모든 가입자 유형에 노출 및 선택 가능하도록 설정.
   - 체크박스 2개 수집:
     - `I will attent the Young Engineer Programme social networking event.` (옵션 ID: `OPT-YE-PROGRAM` 연동)
     - `I would like to present in the Pechakucha session.` (새로운 옵션 ID: `OPT-PECHAKUCHA` 신설 및 연동)
   - 하단에 PechaKucha 세션 전형 및 이메일 세부 안내 텍스트 2줄 추가.
3. **Gala dinner (9월 17일)**
   - 수량 카운터(`[-] [ 0 ] [+]`)와 거절 체크박스(`I will not attend...`)가 공존하도록 Welcome reception과 동일한 레이아웃 설계.
   - 가격: 1장당 25만원(250,000 KRW)으로 적용하되, **영 엔지니어용 갈라 디너(`OPT-GALA-DINNER-YE`)는 0원(무료, Free)**으로 정책 변경을 전면 수용.
   - 수량 무제한 선택 가능 및 수량 곱 연산 총액 반영.
   - 매진 시 대기자 신청(`Please add me to the waitlist`) 인터랙션 제공.

---

## 구현 결과

### 1. 백엔드 (Backend)
- **옵션 시드 갱신 (`DataInitializer.java`)**:
  - `OPT-YE-PROGRAM` 옵션 설명(description)을 `I will attend the Young Engineer Programme social networking event.`로 변경.
  - 신규 0원 옵션 `OPT-PECHAKUCHA`("Pechakucha Session Presentation")를 추가하여 스키마 변경 없는 유연한 결제 목록 관리 구축.
  - `OPT-GALA-DINNER-YE` 가격을 `250,000L` -> `0L`로 변경 및 `isFree` 필드를 `true`로 설정하여 영 엔지니어 무료화 완벽 동기화.

### 2. 프론트엔드 (Frontend)
- **타입 및 옵션 확장 (`types/index.ts`)**:
  - `programOptionIds` 목록에 `OPT-YE-PROGRAM` 및 `OPT-PECHAKUCHA`를 추가하여 두 옵션이 모두 올바르게 렌더링되도록 정의.
- **컴포넌트 개편 (`StepAdditionalOptions.tsx`)**:
  - 기존의 일률적인 목록 매핑 대신, 웰컴 리셉션, YE 프로그램, 갈라 디너, 동반인 각각의 섹션에 대해 이미지의 요구사항과 100% 매치되는 전용 특화 카드 마크업 설계.
  - 영 엔지니어용 갈라 디너(`OPT-GALA-DINNER-YE`)인 경우에는 요금을 `Free`로 렌더링하고 제목 역시 `Gala dinner on 17th September (Free for Young Engineer)` 로 자연스럽게 표시되도록 조건부 마크업 분기 처리.
  - 카운터 증감에 따라 비선택(Not attend) 체크박스가 즉시 연동되는 동적 UI 이벤트 바인딩 완료.

---

## 변경 파일 목록

### Backend
- `back/src/main/java/com/roo/payment/config/DataInitializer.java` (수정)

### Frontend
- `front/src/types/index.ts` (수정)
- `front/src/components/StepAdditionalOptions.tsx` (수정)

---

## 테스트 및 검증 결과
- **타입 검사 및 빌드 무결성**: 프론트엔드 의존성 및 타입 일관성 검사 성공.
- **백엔드 빌드 무결성**: Java 코드 변경점 및 옵션 시딩 로직 컴파일 이상 없음.
