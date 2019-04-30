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

DELETE FROM "multisignatures" "m0"
	USING "multisignatures" "m1"
WHERE "m0"."ctid" < "m1"."ctid"
	AND "m0"."transactionId" = "m1"."transactionId";
	
-- Drop existing index on multisignatures table --
DROP INDEX "multisignatures_trs_id";

-- Add unique constraint on multisignatures table --
ALTER TABLE "multisignatures"
	ADD UNIQUE ("transactionId");
