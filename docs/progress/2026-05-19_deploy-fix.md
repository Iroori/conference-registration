### 2026-05-19 Deploy Action and PaymentController Fix

- **Branch / Commit:** `main` / `b4c0ce3`
- **Session Requirements:** Fix the deployment failure caused by a lingering cancellation endpoint and resolve Node.js 20 deprecation warnings in GitHub Actions.
- **Results:** Completed.
- **Changed Files:**
  - `[MODIFIED]` `back/src/main/java/com/roo/payment/domain/payment/controller/PaymentController.java`
  - `[MODIFIED]` `.github/workflows/deploy.yml`
- **Architectural Decisions (ADR):**
  - **Payment Cancellation:** The `cancelPayment` API endpoint in `PaymentController` was permanently removed. User-initiated cancellation has been removed in favor of manual administrative cancellation via the PayGate console. The frontend remains compatible as it merely displays `CANCELLED` statuses.
  - **GitHub Actions Upgrade:** `actions/checkout@v6`, `actions/setup-java@v5`, and `actions/setup-node@v6` were adopted to run natively on Node 24, permanently resolving the Node 20 deprecation warning and ensuring runner stability without relying on workaround environment variables.

### AWS DB Migration & Crash Loop Fix
- Used AWS CLI to generate SSH key and access the Lightsail instance.
- Found real error: DataInitializer was blocked by SQL Server CHECK constraint `CK__conferenc__allow__49C3F6B7` rejecting `YOUNG_ENGINEER` enum value.
- Applied SQL migration to add `dietary_requirement`, `dietary_note`, and `accompanying_persons` table.
- Dropped outdated enum CHECK constraints on `users`, `payments`, and `conference_options`.
- Application successfully restarted and health check passed.
