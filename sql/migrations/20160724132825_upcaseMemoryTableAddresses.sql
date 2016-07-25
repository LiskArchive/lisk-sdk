/* Upcase Memory Table Addresses
 *
 */

BEGIN;

UPDATE "mem_accounts" SET "address" = UPPER("address") WHERE "address" LIKE '%l';

UPDATE "mem_round" SET "address" = UPPER("address") WHERE "address" LIKE '%l';

UPDATE "mem_accounts2delegates" SET "accountId" = UPPER("accountId") WHERE "accountId" LIKE '%l';

UPDATE "mem_accounts2u_delegates" SET "accountId" = UPPER("accountId") WHERE "accountId" LIKE '%l';

UPDATE "mem_accounts2multisignatures" SET "accountId" = UPPER("accountId") WHERE "accountId" LIKE '%l';

UPDATE "mem_accounts2u_multisignatures" SET "accountId" = UPPER("accountId") WHERE "accountId" LIKE '%l';

COMMIT;
