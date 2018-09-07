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

DELETE FROM "transfer" "tf0"
	USING "transfer" "tf1"
WHERE "tf0"."ctid" < "tf1"."ctid"
	AND "tf0"."transactionId" = "tf1"."transactionId";

-- Drop existing index on transfer table --
DROP INDEX "transfer_trs_id";

-- Add unique constraint on transfer table --
ALTER TABLE "transfer"
	ADD UNIQUE ("transactionId");
