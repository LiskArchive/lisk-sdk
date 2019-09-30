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
  DESCRIPTION: Migrates the data from mem_accounts2delegates into mem_accounts."votedDelegatesPublicKeys"
  PARAMETERS: None
*/

-- -- Create new column for holding voted delegates PKs

ALTER TABLE mem_accounts ADD COLUMN "votedDelegatesPublicKeys" jsonb;

-- -- -- Move voted public keys from mem_accounts2delegates to mem_accounts

UPDATE mem_accounts
SET "votedDelegatesPublicKeys" = 
(
	SELECT 
		jsonb_agg("dependentId")
	FROM mem_accounts2delegates
	WHERE "accountId" = mem_accounts.address
	GROUP BY "accountId"
)
WHERE address in (SELECT "accountId" FROM mem_accounts2delegates);

-- drop the unused table

DROP TABLE mem_accounts2delegates;
