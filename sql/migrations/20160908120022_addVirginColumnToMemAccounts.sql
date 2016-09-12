/* Add Virgin Column to Mem Accounts
 *
 */

BEGIN;

ALTER TABLE "mem_accounts" ADD COLUMN "virgin" SMALLINT DEFAULT 1;

-- Delete accounts which have never received or sent funds
-- e.g. Created using /api/accounts/open
DELETE FROM "mem_accounts"
 WHERE "publicKey" IS NULL
   AND "balance" = 0 AND "u_balance" = 0;

-- Reflect on virginity of existing accounts
UPDATE "mem_accounts" AS m SET "virgin" = 0
  FROM (SELECT "senderId" FROM "trs" GROUP BY "senderId") AS t
 WHERE m."publicKey" IS NOT NULL
   AND t."senderId" = m."address";

COMMIT;
