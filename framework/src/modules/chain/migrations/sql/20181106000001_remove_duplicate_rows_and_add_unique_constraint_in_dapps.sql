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

DELETE FROM "dapps" "d0"
	USING "dapps" "d1"
WHERE "d0"."ctid" < "d1"."ctid"
	AND "d0"."transactionId" = "d1"."transactionId";

-- Drop existing index on dapps table --
DROP INDEX "dapps_trs_id";

-- Add unique constraint on dapps table --
ALTER TABLE "dapps"
	ADD UNIQUE ("transactionId");
