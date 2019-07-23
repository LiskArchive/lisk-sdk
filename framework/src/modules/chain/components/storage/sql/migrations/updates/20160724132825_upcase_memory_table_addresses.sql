/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */


/*
  DESCRIPTION: Upcase Memory Table Addresses.

  PARAMETERS: None
*/

UPDATE "mem_accounts" AS m
   SET "balance" = (m."balance" + l."balance"),
       "u_balance" = (m."u_balance" + l."u_balance")
  FROM (
    SELECT "address", "balance", "u_balance"
      FROM "mem_accounts"
     WHERE "address" LIKE '%l'
  ) AS "l"
 WHERE m."address" = UPPER(l."address");

DELETE FROM "mem_accounts" WHERE "address" LIKE '%l' AND "publicKey" IS NULL;

UPDATE "mem_accounts" SET "address" = UPPER("address") WHERE "address" LIKE '%l';

UPDATE "mem_round" SET "address" = UPPER("address") WHERE "address" LIKE '%l';

UPDATE "mem_accounts2delegates" SET "accountId" = UPPER("accountId") WHERE "accountId" LIKE '%l';

UPDATE "mem_accounts2u_delegates" SET "accountId" = UPPER("accountId") WHERE "accountId" LIKE '%l';

UPDATE "mem_accounts2multisignatures" SET "accountId" = UPPER("accountId") WHERE "accountId" LIKE '%l';

UPDATE "mem_accounts2u_multisignatures" SET "accountId" = UPPER("accountId") WHERE "accountId" LIKE '%l';
