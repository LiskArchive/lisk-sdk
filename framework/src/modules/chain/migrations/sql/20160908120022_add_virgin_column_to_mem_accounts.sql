/*
 * Copyright © 2018 Lisk Foundation
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
  DESCRIPTION: Add Virgin Column to Mem Accounts.

  PARAMETERS: None
*/

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
