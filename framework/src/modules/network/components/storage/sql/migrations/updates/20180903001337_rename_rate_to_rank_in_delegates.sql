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
DESCRIPTION: Rename column rate to rank, update current ranks, add index.

PARAMETERS: None
*/

-- Rename unused rate column to rank
ALTER TABLE mem_accounts RENAME COLUMN rate TO rank;
-- Set default value for rank to NULL
ALTER TABLE mem_accounts ALTER COLUMN rank SET DEFAULT NULL;
-- Set rank to NULL for entire table
UPDATE mem_accounts SET rank = NULL;

-- Update current ranks of all delegates
UPDATE mem_accounts
SET rank = new.rank
FROM (
	SELECT row_number() OVER (
	ORDER BY vote DESC, "publicKey" ASC) AS rank, "publicKey"
	FROM mem_accounts
	WHERE "isDelegate" = 1
) new
WHERE mem_accounts."publicKey" = new."publicKey" AND mem_accounts."isDelegate" = 1;

-- Create an index on rank column
CREATE INDEX mem_accounts_delegate_rank ON mem_accounts (rank) WHERE "isDelegate" = 1;
