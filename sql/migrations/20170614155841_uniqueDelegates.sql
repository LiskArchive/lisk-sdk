/*
 * Recreate 'delegates' table to get rid of duplicated entries
 */

BEGIN;

DELETE FROM delegates;

INSERT INTO "delegates" ("username", "transactionId")
SELECT m."username", t."id"
FROM trs t
LEFT JOIN mem_accounts m ON t."senderPublicKey" = m."publicKey"
WHERE t.type = 2;

ALTER TABLE "delegates" ADD CONSTRAINT "delegates_unique" UNIQUE ("username", "transactionId");

COMMIT;
