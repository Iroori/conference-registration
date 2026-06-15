# 2026-06-15 Passport Datepicker and Summary Date of Birth Update

## 작업 브랜치
- `main`

## 요구사항
1. 여권 정보 입력 후 결제 전 최종 확인 단계(Summary Step)의 여권 정보 카드에 생년월일(Date of Birth)도 함께 표시되도록 수정하여 최종 확인이 가능하도록 개선.
2. 비자 신청서 단계 및 마이 프로필 탭의 여권 정보 내 생년월일 입력을 기존처럼 달력(calendar date picker)으로 처리하되, 브라우저 로케일에 따른 한글("연, 월, 일") 표시 문제를 차단하기 위해 `YYYY MM DD` 포맷의 읽기 전용 텍스트 인풋과 아이콘을 배치하고 클릭 시 보이지 않는 네이티브 date input의 `showPicker()`를 호출하여 날짜를 선택하도록 리디자인.

---

## 구현 결과

### 1. 결제 직전 확인(Summary) 단계 여권 정보 내 생년월일 추가 (완료)
- **대상 파일:** [StepSummary.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepSummary.tsx)
- **변경 사항:**
  - `StepSummary` 내 Passport Details 카드 하단에 **Date of Birth** 필드를 추가하고, 입력된 `birthDate` 값을 공백 분리형 포맷(`YYYY MM DD`)으로 렌더링되도록 구현했습니다.

### 2. 여권 생년월일 입력창 커스텀 캘린더 피커 연동 (완료)
- **대상 파일:** [StepInvitationLetter.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepInvitationLetter.tsx), [RegistrationPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/pages/RegistrationPage.tsx)
- **변경 사항:**
  - 기존의 연, 월, 일 선택용 `<select>` 드롭다운 대신, 텍스트 인풋 클릭 시 보이지 않는 네이티브 `<input type="date">`가 `showPicker()`로 호출되도록 구현을 개선했습니다.
  - 텍스트 인풋은 `readOnly` 속성과 함께 `YYYY MM DD` 포맷의 플레이스홀더를 제공하며, 날짜가 선택되면 `YYYY MM DD` 형식(예: `1990 05 12`)으로 사용자 친화적으로 표시됩니다.
  - 이를 통해 브라우저 시스템 언어에 따라 표시되던 "연, 월, 일" placeholder 텍스트 노출을 완벽히 우회하면서도 네이티브 달력 선택 편의성은 그대로 유지했습니다.

---

## 변경 파일 목록

### Frontend
- **[MODIFY]** [StepSummary.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepSummary.tsx) — 요약화면 Passport Details에 Date of Birth 항목 노출 추가
- **[MODIFY]** [StepInvitationLetter.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepInvitationLetter.tsx) — 비자 신청 여권 생년월일 캘린더 입력 및 `YYYY MM DD` 포맷 바인딩 구현
- **[MODIFY]** [RegistrationPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/pages/RegistrationPage.tsx) — 마이페이지 여권 생년월일 캘린더 입력 및 `YYYY MM DD` 포맷 바인딩 구현

### Docs
- **[NEW]** [2026-06-15_passport-datepicker-and-summary-dob.md](file:///Users/rrlee/ETC/conference-registration/docs/progress/2026-06-15_passport-datepicker-and-summary-dob.md) — 본 작업 진행 기록 작성

---

## 검증 완료 정보
- 프론트엔드 빌드 검증(`npm run build`) 성공.
