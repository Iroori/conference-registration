# IABSE INCHEON 2026 — Progress Log (2026-06-01)

## 1. 세션 요구사항 (Session Requirements)
- **계정생성 페이지(SignupPage.tsx) 개편**:
  - `Personal Details` 섹션에서는 `Dietary Requirements` 항목까지만 입력받고 필수 처리.
  - 기존에 `Personal Details` 섹션에 존재하던 `Country` 선택 필드를 완전히 제거.
  - `Personal Details` 바로 아래에 `[Billing Address]` 섹션을 배치하고 항상 노출되도록 구현 (기존의 동일 주소 체크박스 `billingSame` 토글 및 조건부 렌더링 제거).
  - `[Billing Address]` 섹션의 입력 항목 배치 및 필수 여부 설정:
    - **필수 (*)**: `University/Organization`, `Street name and number`, `Postcode`, `City`, `Country` (기존 Personal Details에서 옮겨온 필드).
    - **선택**: `VAT/CIF/NIF/ other ref.`, `PO number or other purchase identification`, `Additional address information`, `PO Box number`.
  - `Paper Presenter` & `Paper Information` 컴포넌트를 `[Billing Address]` 섹션 아래로 이동 배치 (Optional).
- **데이터베이스/백엔드 정합성**:
  - DB와 백엔드는 이미 `SignupRequest` DTO 및 `User` 엔티티 내에 청구 주소 9종 칼럼과 가입 국가 `country` 칼럼이 완비되어 있는 구조임.
  - 프론트엔드에서 회원가입 요청 시, 백엔드 필수 칼럼 스펙에 맞춰 `country` 필드 값으로 사용자가 선택한 `billingCountry` 값을 매핑하여 안전하게 전달하도록 구현.

## 2. 구현 결과 (Implementation Results)
- **`SignupPage.tsx` UI/UX 개편 완료**:
  - 폼에서 `Country` 선택 필드를 `Personal Details`에서 완전히 제거하고 `[Billing Address]` 섹션 내부로 이동 배치.
  - `billingSame` 체크박스 및 conditional rendering (`!form.billingSame`)을 완전히 제거하여 청구지 주소 9종 필드가 항상 화면에 렌더링되도록 단순화.
  - `University/Organization`, `Street name and number`, `Postcode`, `City`, `Country` 5가지 청구 주소 필수 항목에 HTML Native `required` 속성과 붉은색 별표(`*`) 표기 강제.
  - `Paper Presenter` 및 `Paper Information` 영역을 `[Billing Address]` 밑으로 온전하게 이동 배치.
  - 회원가입 API 전송 시, 백엔드 회원 테이블의 필수 스펙인 `country` 칼럼에 `form.billingCountry` 값을 매핑하여 전송함으로써 데이터 불일치 및 가입 API 오류 전면 예방.
- **빌드 및 컴파일 확인**:
  - 프론트엔드 빌드(`npm run build` : `tsc && vite build`) 결과 린트 및 컴파일 100% 통과 및 번들 생성 성공.

## 3. 변경 파일 목록 (Modified Files)
- **프론트엔드**:
  - `front/src/pages/SignupPage.tsx` (수정) : 폼 레이아웃 순서 변경 및 조건부 UI 제거, 필수 속성 고정.

## 4. 아키텍처 결정 사항 (ADR)
- **Billing Country와 Country의 통합**:
  - 이번 요구사항에 따라 회원의 가입 국가(`country`)와 청구지 주소의 국가(`billingCountry`)가 일원화되는 방향성을 보임. 따라서 백엔드 회원 테이블 스키마에 정의된 필수 `country` 제약 조건을 안전하게 준수하기 위해, 가입 요청 시 `country: form.billingCountry`로 맵핑하여 데이터베이스 영속성을 완벽히 만족시킴.
- **폼 입력 간소화 및 가시성 극대화**:
  - 동일 체크박스(`billingSame`)를 탈거하고 청구지 주소 입력을 폼 상에서 무조건 거치도록 강제함으로써, 학회 참가 등록 시 청구지 주소 데이터가 안전하게 100% 수집되도록 보장함.

## 5. 테스트 및 배포 준비
- 프론트엔드 및 백엔드 로컬 컴파일 완료 후 main 브랜치 커밋 및 푸시 준비 완료.
