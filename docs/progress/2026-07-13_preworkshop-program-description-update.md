### 2026-07-13 Pre-workshop Program Description and Syllabus Update

- **Branch / Commit:** `main`
- **Session Requirements:**
  - Add description paragraphs inside each option card in the Pre-workshop Program Selection screen:
    - Forensic Engineering Practice
    - Structural Health Monitoring
  - Change "DOWNLOAD BROCHURE (PNG)" to "DOWNLOAD SYLLABUS (PDF)" in the Structural Health Monitoring section, change the download file extension from `.png` to `.pdf`, and allow the new `.pdf` file download in the backend file validation configuration.
- **Results:** Completed.
- **Changed Files:**
  - `[MODIFIED]` [PreWorkshopPage.tsx](file:///Users/rrlee/ETC/conference-registration/front/src/pages/PreWorkshopPage.tsx)
  - `[MODIFIED]` [PreWorkshopController.java](file:///Users/rrlee/ETC/conference-registration/back/src/main/java/com/roo/payment/domain/payment/controller/PreWorkshopController.java)
- **Details:**
  - Redesigned selection cards into a split header/body layout (with `overflow-hidden` outer container, shaded `bg-slate-50/60` or `bg-gold-tint/30` header, and a `p-5` body container) to clearly demarcate the title and description.
  - Increased title size and weight to `font-extrabold text-base sm:text-lg` and description font size to `text-xs sm:text-sm` with higher contrast `text-slate-600` color to greatly improve readability.
  - Updated the SHM brochure download URL parameter and download filename to `Syllabus_SHM_PreWorkshop_IABSE2026.pdf` and changed the label text to "Download Syllabus (PDF)".
  - Updated the path traversal file name validation in `PreWorkshopController.java` to whitelist `Syllabus_SHM_PreWorkshop_IABSE2026.pdf` and completely remove `StructuralHealthMonitoring.png` from the allowed download list.
  - Confirmed the frontend and backend applications build successfully.
