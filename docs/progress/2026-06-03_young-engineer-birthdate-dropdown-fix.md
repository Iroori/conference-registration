# 2026-06-03 Young Engineer Birth Date Dropdown Fix & State Synchronization

## 세션 요구사항
1. **Young Engineer 카테고리 선택 시 생년월일 드롭다운 선택 불가 오류 해결**
   - 회원등록 분류(Step 1) 페이지에서 `Young Engineer` 선택 시, 연/월/일 select 박스 클릭이 불가능하거나 오작동하는 현상 수정.
   - 드롭다운의 기본 옵션 텍스트는 영문(`Year`, `Month`, `Day`)으로 유지.
2. **생년월일 선택 시 드롭다운에 선택된 값이 보이지 않고 초기화되는 오류 해결**
   - 연, 월, 일 중 하나라도 미선택된 경우, 컴포넌트 내부에서 상위 `birthDate` 값을 빈 값(`''`)으로 갱신하여 기존에 이미 선택한 다른 세부 날짜 값마저 드롭다운 UI 상에서 사라지던 상태 업데이트 버그 해결.

---

## 구현 결과

### 1. 프론트엔드 (Frontend)
- **HTML 구조 수정 (`StepRegistrationType.tsx`)**:
  - 기존 각 등록 카테고리 카드 전체를 감싸고 있던 `<button>` 태그를 `<div>` 태그로 교체.
  - 이를 통해 HTML 표준에서 어긋나는 대화형 요소의 중첩(Button 내부에 Select, Input이 위치하는 문제)을 제거하여 브라우저에서 드롭다운이 정상적으로 포커스 및 클릭되도록 설계.
  - 카테고리 잠금(`locked = true`) 상태가 아닐 때만 `cursor-pointer` 스타일을 활성화하여 버튼과 같은 시각적 피드백 제공.
  - `disabled={locked}` 속성을 제거하고, `handleClick`에서 `locked = true`인 경우 이벤트를 차단하도록 로직 조정.
  - 기존에 영어로 표기되어 있던 `Year`, `Month`, `Day` 플레이스홀더를 변경 없이 그대로 유지하여 사양 충족.

- **생년월일 선택 상태 관리 개선 (`StepRegistrationType.tsx`)**:
  - `localYear`, `localMonth`, `localDay` 상태를 로컬 state로 선언하여 각 드롭다운의 선택 값을 독립적으로 유지하도록 보완.
  - 연/월/일 값 중 일부만 선택되었을 때도 UI 드롭다운 상에서는 사용자가 고른 값이 그대로 유지되도록 처리.
  - 연/월/일 세 항목이 모두 완전하게 선택되는 시점에만 부모 컴포넌트의 `onBirthDateChange`를 통해 완성된 `YYYY-MM-DD` 데이터가 반영되도록 비동기식 상태 전환 로직 구축.

---

## 변경 파일 목록

### Frontend
- `front/src/components/StepRegistrationType.tsx` (수정)

---

## 테스트 및 검증 결과
- **프론트엔드 정적 애셋 빌드**: `npm run build` 결과 TypeScript 정적 컴파일 및 Vite 번들링이 경고나 오류 없이 정상 완료되었습니다.

