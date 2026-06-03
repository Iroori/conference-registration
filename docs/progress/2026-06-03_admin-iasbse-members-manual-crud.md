# 2026-06-03 Admin IABSE Members Manual Creation and Deletion

## 세션 요구사항
1. **IABSE 회원 관리 페이지 내 검색 및 수기 추가/삭제 기능 추가**
   - 관리자가 IABSE 회원(Excel 원본 데이터) 목록에서 검색할 수 있는지 확인하고, 추가적으로 수기로 개별 회원을 추가 및 삭제할 수 있는 기능 제공.
   - **수기 추가**: 'Add Member' 버튼 클릭 시 검색 필터 영역 하단에 슬라이드다운 형태로 입력 폼(IABSE ID, First Name, Last Name)이 나타나며, 중복된 IABSE ID 등록 시에는 적절한 중복 오류와 함께 차단되도록 구현.
   - **수기 삭제**: 테이블에 'Actions' 열을 신설하고 삭제 버튼 제공. 클릭 시 `window.confirm()` 확인창을 띄우고 삭제를 진행하도록 구현.

---

## 구현 결과

### 1. 백엔드 (Backend)
- **에러 코드 신설 (`ErrorCode.java`)**:
  - `IABSE_MEMBER_NOT_FOUND` (404 Not Found, IABSE 회원 레코드가 없을 시 반환)
  - `IABSE_ID_ALREADY_EXISTS` (409 Conflict, IABSE ID 중복 등록 시 반환)
- **수기 생성/삭제 DTO 및 서비스 비즈니스 로직 구현 (`AddIasbseMemberRequest.java`, `AdminUserService.java`)**:
  - `AddIasbseMemberRequest` Java record를 신설하여 입력값 검증 애노테이션 적용.
  - `AdminUserService.java`에 `@Transactional` 어노테이션과 함께 중복 ID 체크를 수반하는 `addIasbseMember()` 및 존재 여부 체크 후 `deleteById`를 수행하는 `deleteIasbseMember()` 로직 구현.
- **컨트롤러 엔드포인트 바인딩 (`AdminUserController.java`)**:
  - `POST /api/admin/iasbse-members` 엔드포인트 바인딩 완료.
  - `DELETE /api/admin/iasbse-members/{id}` 엔드포인트 바인딩 완료.
  - 관리자 전용 권한인 `/api/admin/**` 보안 체계 하에서 안전하게 작동.

### 2. 프론트엔드 (Frontend)
- **API 함수 매핑 (`api.ts`)**:
  - `apiAddAdminIasbseMember` 및 `apiDeleteAdminIasbseMember` 호출 함수 구현.
- **어드민 회원 관리 UI 구현 (`AdminDashboardPage.tsx`)**:
  - `IABSE` 서브 탭의 검색 필터 오른쪽에 `Add Member` 토글 버튼 신설.
  - 토글 상태에 따라 슬라이드다운 애니메이션과 함께 IABSE ID, First Name, Last Name을 입력할 수 있는 폼 컴포넌트 렌더링.
  - IABSE 회원 목록 테이블 헤더에 `Actions` 열을 신설하고, 각 회원 정보 우측에 `Delete` 버튼 렌더링.
  - 추가/삭제 API 연동을 위한 React Query `useMutation` 설정 완료 및 완료 시 쿼리 캐시 무효화(`invalidateQueries`)를 통한 화면 자동 갱신 구조화.

---

## 변경 파일 목록

### Backend
- `back/src/main/java/com/roo/payment/common/exception/ErrorCode.java` (수정)
- `back/src/main/java/com/roo/payment/domain/iasbse/dto/AddIasbseMemberRequest.java` (신규)
- `back/src/main/java/com/roo/payment/domain/user/service/AdminUserService.java` (수정)
- `back/src/main/java/com/roo/payment/domain/user/controller/AdminUserController.java` (수정)

### Backend Tests (하드코딩 절대 경로 수정 포함)
- `back/src/test/java/com/roo/payment/domain/iasbse/service/IasbseMemberServiceTest.java` (수정)
- `back/src/test/java/com/roo/payment/ExcelDumpTest.java` (수정)

### Frontend
- `front/src/lib/api.ts` (수정)
- `front/src/components/AdminDashboardPage.tsx` (수정)

---

## 테스트 및 검증 결과
- **백엔드 단위 및 통합 테스트**: 기존에 타 개발자 PC 절대 경로가 기재되어 실패하던 테스트 코드의 리소스 경로를 프로젝트 내부 상대 경로(`src/main/resources/...`)로 보정 완료. 이후 `./mvnw test`를 수행하여 **11개 전체 테스트 성공** 완료.
- **프론트엔드 정적 애셋 빌드**: `npm run build` 결과 TypeScript 정적 컴파일 및 Vite 번들링이 경고나 오류 없이 정상 완료되었습니다.
