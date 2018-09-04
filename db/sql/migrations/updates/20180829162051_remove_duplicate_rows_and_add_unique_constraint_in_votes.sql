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

DELETE FROM "votes" "v0"
	USING "votes" "v1"
WHERE "v0"."ctid" < "v1"."ctid"
	AND "v0"."transactionId" = "v1"."transactionId";

-- Drop existing index on votes table --
DROP INDEX "votes_trs_id";

-- Add unique constraint on votes table --
ALTER TABLE "votes"
	ADD UNIQUE ("transactionId");
	
