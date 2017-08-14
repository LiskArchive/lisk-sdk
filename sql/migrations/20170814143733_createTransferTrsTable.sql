/**
 * Create transfer trs table and index.
 */

BEGIN;

CREATE TABLE IF NOT EXISTS "transfer" (
  "data" BYTEA NOT NULL,
  "transactionId" VARCHAR(20) NOT NULL,
  FOREIGN KEY("transactionId") REFERENCES "trs"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "transfer_trs_id" ON "transfer"("transactionId");

COMMIT;
