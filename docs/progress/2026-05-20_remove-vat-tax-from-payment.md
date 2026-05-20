# Progress Log: Remove VAT/Tax from Payments

## Session Metadata
- **Date**: 2026-05-20
- **Branch**: `main`
- **Commit Hash**: `cd2e357`

## Requirements
- Remove the implicit 10% VAT/Tax added during backend payment creation (as payments are already VAT-free on the frontend PayGate checkout).
- Correct the single existing completed payment (`id=1`, registration number `IABSE-2026-49972`) in the production database:
  - Update `tax` to `0`
  - Update `total_amount` to matches the `subtotal` of `900,000` KRW.

## Implementations & Results
1. **Production Database Correction**:
   - Configured JDBC connection parameters within the temporary test profile pointing to the live server database (`52.79.209.95:1433/kssc2026`).
   - Successfully executed `UPDATE payments SET tax = 0, total_amount = 900000 WHERE id = 1`.
   - Verified that `tax=0` and `total_amount=900000` are correctly reflected in the database.
2. **Backend Logic Fix**:
   - Modified `PaymentService.java` to set `long tax = 0;` instead of calculating it as 10% of the subtotal.
   - The constructor of `Payment` automatically computes `totalAmount = subtotal + tax`, meaning `totalAmount` will perfectly match the subtotal (900,000 KRW).
3. **Verification & Clean up**:
   - Reverted the temporary DB patch logic in `PaymentServiceApplicationTests.java` to keep the codebase clean.
   - Executed `./mvnw clean test` to ensure all tests build and pass successfully.
   - Pushed changes to `main` branch to trigger AWS Lightsail CI/CD auto-deployment.

## Changed Files
- **[MODIFY]** [PaymentService.java](file:///Users/roor2i/Desktop/sw/conference-registration/back/src/main/java/com/roo/payment/domain/payment/service/PaymentService.java)
