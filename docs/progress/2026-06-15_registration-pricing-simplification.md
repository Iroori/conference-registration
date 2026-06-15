# Progress Log — Registration Pricing Simplification (2026-06-15)

## 작업 정보
- **작업 브랜치**: `main`
- **커밋 해시**: N/A
- **PR 링크**: N/A

## 세션 요구사항 (작업 전 원문)
기간별로 결제금액이 다르게되어있었는데 지금 default 값이 현장등록 금액인거같아. 이에따라 네트워크가느린환경에서는 사전결제 돈이 안보이는현상이 있어서 그냥 금액을 기간별로나누지말고 하나로 고정하려고해 지금 사전금액 으로 하려고하는데 각각 기간별 금액 나한테 먼저 알려주고 니가 제대로 이해했는지 나한테 설명해봐

무조건 한 기간에 해당하는 값만 남아야해 Pre-Registration 에 해당하는 값만남겨 내가 바꿔야할때 직접 바꿀게

## 구현 결과
- **완료**:
  - 백엔드 DB 시드(`DataInitializer.java`)에서 `PRE_REGISTRATION` 및 `OPT-ACCOMP-PRE`를 제외한 모든 등록비 및 동반자 추가 옵션(일반등록/현장등록 등 총 12종)을 비활성화(`active = false`) 처리하도록 옵션 목록 정리.
  - 이로써 기존 실결제 이력 데이터의 무결성(FK 관계)을 그대로 유지하면서 신규 가입 프로세스 상의 요금을 사전등록 요금으로 완전히 단일 고정 완료.
  - 프론트엔드(`StepRegistrationType.tsx`)의 기간 판정 함수 `getCurrentTier`가 항상 `'PRE_REGISTRATION'`을 즉시 반환하도록 변경하여 네트워크 로딩 경합이나 API 딜레이에 관계없이 항상 사전등록 금액이 고정 노출되도록 개선.
  - 미사용 변수 및 미사용 임포트 린트 청소 완료.

## 변경 파일 목록

### Backend
- **수정**:
  - `back/src/main/java/com/roo/payment/config/DataInitializer.java` (EARLY 및 REGULAR 옵션 제거)

### Frontend
- **수정**:
  - `front/src/components/StepRegistrationType.tsx` (getCurrentTier 고정 및 미사용 코드 제거)

## 아키텍처 결정 사항 (ADR)
- **등록비 요율 단일화**: 네트워크 지연 및 API 로딩 경합에 의한 결제액 노출 오작동 문제를 원천 차단하기 위해 기간 인상 체계를 제거하고 사전등록(Early Bird) 금액 단일 요율로 고정함. 제거된 기존 옵션들은 DB 무결성 유지를 위해 비활성화(deactivate) 처리하여 과거 거래 영수증 조회 기능을 그대로 유지함.

## 테스트 계정 정보 및 옵션 ID 참조
- **테스트 계정**: `member@test.com` / `Test1234!`
- **적용 요금 정보**:
  - IABSE Member: 1,300,000 KRW
  - Non-IABSE Member: 1,400,000 KRW
  - Non-Member Plus: 1,500,000 KRW
  - Young Engineer: 800,000 KRW
  - Exhibitors (추가 배지): 500,000 KRW
  - Accompanying Person: 400,000 KRW
