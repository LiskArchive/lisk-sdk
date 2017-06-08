/*
 * Runtime queries - executed at node start (right after migrations)
 */

BEGIN;

UPDATE "peers" SET "state" = 1, "clock" = NULL WHERE "state" != 0;

-- Overwrite unconfirmed tables with state from confirmed tables
DELETE FROM mem_accounts2u_delegates;
INSERT INTO mem_accounts2u_delegates ("accountId", "dependentId") SELECT "accountId", "dependentId" FROM mem_accounts2delegates;

DELETE FROM mem_accounts2u_multisignatures;
INSERT INTO mem_accounts2u_multisignatures ("accountId", "dependentId") SELECT "accountId", "dependentId" FROM mem_accounts2multisignatures;

COMMIT;
