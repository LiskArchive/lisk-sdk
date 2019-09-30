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
  DESCRIPTION: Migrates the data from mem_accounts2multisignatures into mem_accounts."membersPublicKeys"
  PARAMETERS: None
*/

-- Create new column for holding multisignature members Public Keys

ALTER TABLE mem_accounts ADD COLUMN "membersPublicKeys" jsonb;

-- Move members public keys from mem_accounts2multisignatures to mem_accounts

UPDATE mem_accounts
SET "membersPublicKeys" = 
(
	SELECT 
		jsonb_agg("dependentId")
	FROM mem_accounts2multisignatures
	WHERE "accountId" = mem_accounts.address
	GROUP BY "accountId"
)
WHERE address in (SELECT "accountId" FROM mem_accounts2multisignatures);

-- drop the unused table

DROP TABLE mem_accounts2multisignatures;
