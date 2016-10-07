/* Create Memory Table Indexes
 *
 */

BEGIN;

CREATE INDEX IF NOT EXISTS "mem_round_address" ON "mem_round"("address");

CREATE INDEX IF NOT EXISTS "mem_round_round" ON "mem_round"("round");

CREATE INDEX IF NOT EXISTS "mem_accounts2delegates_accountId" ON "mem_accounts2delegates"("accountId");

CREATE INDEX IF NOT EXISTS "mem_accounts2u_delegates_accountId" ON "mem_accounts2u_delegates"("accountId");

CREATE INDEX IF NOT EXISTS "mem_accounts2multisignatures_accountId" ON "mem_accounts2multisignatures"("accountId");

CREATE INDEX IF NOT EXISTS "mem_accounts2u_multisignatures_accountId" ON "mem_accounts2u_multisignatures"("accountId");

COMMIT;
