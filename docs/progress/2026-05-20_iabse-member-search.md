# Progress Log — IABSE Member Search & Filter Feature

- **Date**: 2026-05-20
- **Branch**: `main` (Local Verification Done)
- **Status**: Fully Completed

---

## 1. Session Requirements (세션 요구사항)
1. **IABSE Member Search**: Add fuzzy search and filtering capabilities to the official IABSE members database tab on the Admin Dashboard.
2. **Criteria**: The system must support searching by `lastName`, `firstName`, and `company` fields.
3. **English UI Compliance**: Ensure the search bar, placeholder, and filter controls are completely designed in English, adhering to `GEMINI.md` standards.
4. **Premium Design**: Align styling with the premium Glassmorphic, HSL-teal-based aesthetics, incorporating micro-interactions like scale-on-active and hover transitions.
5. **Startup Data Protection**: Protect official IABSE database records from accidental truncation or overwrite during server restarts, while ensuring payment transactional tables remain intact and untouchable.

---

## 2. Implementation Results (구현 결과)

### Backend (완료)
- **Data Seeding Layer**: Modified [DataInitializer.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/config/DataInitializer.java) to inject `iasbseMemberRepository.count() > 0` validation to skip spreadsheet loading if the database is seeded, protecting real-time changes from truncation and data loss.
- **Repository Layer**: Added a parameterized JPQL `searchMembers` query in [IasbseMemberRepository.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/iasbse/repository/IasbseMemberRepository.java) using case-insensitive `LOWER` operations matching `lastName`, `firstName`, or `company`.
- **Service Layer**: Upgraded [AdminUserService.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/service/AdminUserService.java) to delegate search parameters to the database query when a trim-checked term is present, falling back to a full list query when empty.
- **Controller Layer**: Extended [AdminUserController.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/user/controller/AdminUserController.java) `/api/admin/iasbse-members` endpoint to map an optional `@RequestParam(required = false) String search` parameter down to the service layer.

### Frontend (완료)
- **API Client**: Updated [api.ts](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/lib/api.ts)'s `apiGetAdminIasbseMembers` function to accept `search?: string` and construct the query string query parameter safely using `encodeURIComponent`.
- **UI & Interaction**: 
  - Restructured [AdminDashboardPage.tsx](file:///Users/roor2i/Desktop/sw/conference-registration/front/src/components/AdminDashboardPage.tsx) to render a modern Search & Filter Panel above the table grid inside the IABSE sub-tab.
  - Implemented dynamic reactivity using TanStack Query, mapping states to `searchInput` and `searchTerm` to cache requests and trigger queries efficiently.
  - Embedded micro-interactions: responsive hover backgrounds, scaling click animations, dynamic record counts ("Filtered records: {N}" vs "Total records: {N}"), and a responsive "Clear Filter" button.

---

## 3. List of Modified & Added Files (변경 파일 목록)

### Modified Files
- `back/src/main/java/com/roo/payment/config/DataInitializer.java`
- `back/src/main/java/com/roo/payment/domain/iasbse/repository/IasbseMemberRepository.java`
- `back/src/main/java/com/roo/payment/domain/user/service/AdminUserService.java`
- `back/src/main/java/com/roo/payment/domain/user/controller/AdminUserController.java`
- `front/src/lib/api.ts`
- `front/src/components/AdminDashboardPage.tsx`

---

## 4. Architecture Decisions (ADR)
- **Seeding Bypass Safety**: Implemented table existence/size verification (`count() > 0`) in the bootloader instead of file presence checks. This ensures that any runtime database additions remain persistent, completely eliminating structural data loss on system reboot cycles (Option A1 selection).
- **Case-Insensitive Database Match**: Leveraged database-level native/JPQL `LOWER()` operations coupled with wildcards `CONCAT('%', :search, '%')` to perform efficient fuzzy matching on multi-language strings (including special characters, spaces, and diverse unicode values present in IABSE raw exports).
- **Decoupled Search Action**: Kept `searchInput` (local state) separate from `searchTerm` (React Query key state) to prevent triggering API queries on every keystroke, fetching data only when the "Search" button is clicked, "Enter" is pressed, or filters are explicitly cleared.
