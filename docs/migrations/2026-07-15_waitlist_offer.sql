/* ============================================================================
 * IABSE 2026 — Waitlist Offer & Additional Payment  (수동 마이그레이션)
 * ----------------------------------------------------------------------------
 * 대상 DB : kssc2026_dev (dev) 및 kssc2026 (prod) — 둘 다 적용
 * 시점    : 신규 app.jar 배포 "전" 에 반드시 실행
 * 이유    : Flyway/Liquibase 미도입 + ddl-auto=update 사용.
 *           update 는 신규 컬럼은 추가하지만
 *           (1) NOT NULL 컬럼을 기존 행이 있는 테이블에 안전하게 추가하지 못하고
 *           (2) 기존 CHECK 제약(enum 값 목록)을 절대 갱신하지 않는다.
 *           특히 option_waitlists.status 의 기존 CHECK 제약이
 *           WAITING/COMPLETED/CANCELLED 3값만 허용하므로,
 *           이를 제거하지 않으면 오퍼(OFFERED) 시 500 이 발생한다. ← 핵심
 *
 * 실행 예 :
 *   export PATH="$PATH:/opt/mssql-tools18/bin"
 *   sqlcmd -S localhost -U kssc_app -P '<pw>' -C -d kssc2026 \
 *          -i 2026-07-15_waitlist_offer.sql
 * ==========================================================================*/

SET XACT_ABORT ON;
BEGIN TRAN;

/* 1) payments — 결제 유형/링크 컬럼 -------------------------------------- */
IF COL_LENGTH('dbo.payments','payment_type') IS NULL
    ALTER TABLE dbo.payments
        ADD payment_type VARCHAR(20) NOT NULL
        CONSTRAINT DF_payments_payment_type DEFAULT 'PRIMARY';

IF COL_LENGTH('dbo.payments','waitlist_id') IS NULL
    ALTER TABLE dbo.payments ADD waitlist_id BIGINT NULL;

IF COL_LENGTH('dbo.payments','origin_registration_number') IS NULL
    ALTER TABLE dbo.payments ADD origin_registration_number VARCHAR(30) NULL;

/* 2) option_waitlists — 오퍼 관련 컬럼 ---------------------------------- */
IF COL_LENGTH('dbo.option_waitlists','offered_at') IS NULL
    ALTER TABLE dbo.option_waitlists ADD offered_at DATETIME2 NULL;

IF COL_LENGTH('dbo.option_waitlists','offer_expires_at') IS NULL
    ALTER TABLE dbo.option_waitlists ADD offer_expires_at DATETIME2 NULL;

IF COL_LENGTH('dbo.option_waitlists','fulfilled_payment_id') IS NULL
    ALTER TABLE dbo.option_waitlists ADD fulfilled_payment_id BIGINT NULL;

IF COL_LENGTH('dbo.option_waitlists','offered_quantity') IS NULL
    ALTER TABLE dbo.option_waitlists
        ADD offered_quantity INT NOT NULL
        CONSTRAINT DF_option_waitlists_offered_quantity DEFAULT 1;

/* 3) option_waitlists.status — 기존 CHECK 제약 제거 (★필수★) ----------
 *    제약 이름은 자동 생성(예: CK__option_wa__statu__XXXX)이라 동적으로 찾아 제거한다.
 *    제거 후 Hibernate update 는 CHECK 제약을 재생성하지 않으므로
 *    OFFERED/EXPIRED 값이 정상 저장된다.                                    */
DECLARE @cn NVARCHAR(256);
SELECT @cn = cc.name
FROM sys.check_constraints cc
JOIN sys.columns col
     ON col.object_id = cc.parent_object_id
    AND col.column_id = cc.parent_column_id
WHERE cc.parent_object_id = OBJECT_ID('dbo.option_waitlists')
  AND col.name = 'status';

IF @cn IS NOT NULL
    EXEC('ALTER TABLE dbo.option_waitlists DROP CONSTRAINT ' + @cn);

/* (선택) 새 5개 값으로 CHECK 재생성 — 무결성을 유지하고 싶을 때만 사용.
   생략해도 기능상 문제 없음. Hibernate 와 이름 충돌 방지를 위해 고정 이름 사용. */
-- IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_option_waitlists_status')
--     ALTER TABLE dbo.option_waitlists WITH CHECK
--         ADD CONSTRAINT CK_option_waitlists_status
--         CHECK (status IN ('WAITING','OFFERED','COMPLETED','EXPIRED','CANCELLED'));

/* 4) option_waitlists: 직접 오퍼(대기 신청/결제 이력 없는 유저) 지원 -------
 *    - user_id 추가: 대기건이 항상 유저를 직접 참조
 *    - payment_id 를 NULL 허용으로 변경: 직접 오퍼는 등록 결제 없이 생성됨      */
IF COL_LENGTH('dbo.option_waitlists','user_id') IS NULL
    ALTER TABLE dbo.option_waitlists ADD user_id BIGINT NULL;

-- 기존 대기 행 백필: payment_id → user_id (대기 데이터가 없으면 no-op)
UPDATE w SET w.user_id = p.user_id
FROM dbo.option_waitlists w
JOIN dbo.payments p ON p.id = w.payment_id
WHERE w.user_id IS NULL AND w.payment_id IS NOT NULL;

-- payment_id 를 nullable 로 (직접 오퍼는 결제 없이 생성). FK가 있어도 nullability 변경은 허용됨.
IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID('dbo.option_waitlists')
             AND name = 'payment_id' AND is_nullable = 0)
    ALTER TABLE dbo.option_waitlists ALTER COLUMN payment_id BIGINT NULL;

/* (선택) user_id FK 제약 — 데이터 정합 확인 후 적용 권장
-- ALTER TABLE dbo.option_waitlists WITH CHECK
--     ADD CONSTRAINT FK_option_waitlists_user FOREIGN KEY (user_id) REFERENCES dbo.users(id); */

/* 5) 기존 행 백필 (명시적으로 값 보정) ---------------------------------- */
UPDATE dbo.payments        SET payment_type     = 'PRIMARY' WHERE payment_type IS NULL;
UPDATE dbo.option_waitlists SET offered_quantity = 1        WHERE offered_quantity IS NULL;

COMMIT;

/* 검증:
   SELECT COL_LENGTH('dbo.payments','payment_type'),
          COL_LENGTH('dbo.option_waitlists','offered_quantity');
   SELECT name FROM sys.check_constraints
   WHERE parent_object_id = OBJECT_ID('dbo.option_waitlists');   -- status 제약이 없거나 5값이어야 함
*/
