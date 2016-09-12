/* Add Virgin Column to Mem Accounts
 *
 */

BEGIN;

ALTER TABLE "mem_accounts" ADD COLUMN "virgin" SMALLINT DEFAULT 1;

UPDATE "mem_accounts" AS m SET "virgin" = 0
  FROM (SELECT "senderId" FROM "trs" GROUP BY "senderId") AS t
 WHERE m."publicKey" IS NOT NULL
   AND t."senderId" = m."address";

COMMIT;
