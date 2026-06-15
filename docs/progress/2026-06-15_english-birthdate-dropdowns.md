# 2026-06-15 Convert Date of Birth to English Select Dropdowns

## 작업 브랜치
- `main`

## 요구사항
1. 비자 초청장(Visa Invitation Letter) 단계 및 마이 프로필(My Profile) 탭 내의 Date of Birth(생년월일) 입력 필드에서 브라우저 로케일(예: 한국어 환경)에 따라 "연", "월", "일" 또는 달력이 한국어로 표기되는 문제를 해결하고, 완전한 영문 드롭다운(Year, Month, Day) 형식으로 변경.

---

## 구현 결과

### 1. 여권 정보 입력란 영문 생년월일 드롭다운 적용 (완료)
- **대상 파일:** [StepInvitationLetter.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepInvitationLetter.tsx)
- **변경 사항:**
  - 기존 브라우저 기본 `<input type="date">`를 Year, Month, Day 개별 `<select>` 드롭다운으로 교체하여 언어 표기를 완전한 영어로 고정했습니다.
  - 상위 컴포넌트의 `birthDate` state와 매핑하기 위해 `localYear`, `localMonth`, `localDay` 상태값과 동기화하는 `useEffect` 및 변경 핸들러를 추가했습니다.

### 2. 마이 프로필 탭 내 생년월일 드롭다운 적용 (완료)
- **대상 파일:** [RegistrationPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/pages/RegistrationPage.tsx)
- **변경 사항:**
  - `MyProfileTab` 컴포넌트 내의 생년월일 입력창 역시 Year, Month, Day 개별 `<select>` 드롭다운으로 교체하여 동일하게 영문 고정 표기하도록 개선했습니다.
  - React `useEffect` 훅을 임포트하여 기존의 `birthDate` 값을 parsing해 드롭다운 기본값으로 자동 바인딩 처리했습니다.

---

## 변경 파일 목록

### Frontend
- **[MODIFY]** [StepInvitationLetter.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/components/StepInvitationLetter.tsx) — Date of Birth 입력을 Year/Month/Day 드롭다운으로 변경
- **[MODIFY]** [RegistrationPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/pages/RegistrationPage.tsx) — MyProfileTab 내 Date of Birth 입력을 Year/Month/Day 드롭다운으로 변경

### Docs
- **[NEW]** [2026-06-15_english-birthdate-dropdowns.md](file:///Users/rrlee/ETC/conference-registration/docs/progress/2026-06-15_english-birthdate-dropdowns.md) — 본 세션의 작업 진행 일지 작성

---

## 검증 완료 정보
- 로컬 빌드 테스트(`npm run build`)를 실행하여 TypeScript 컴파일 및 Vite 번들링 결과가 에러 없이 성공적으로 생성됨을 검증했습니다.
