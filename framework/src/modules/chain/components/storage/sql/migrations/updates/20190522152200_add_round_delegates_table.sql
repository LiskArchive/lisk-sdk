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
  DESCRIPTION: Creates `round_delegates` table to store unshuffled
	delegate lists which were created at the beginning of the round.
   PARAMETERS: None
*/

/* Table */
CREATE TABLE IF NOT EXISTS "round_delegates" (
  "round" BIGINT NOT NULL PRIMARY KEY,
  "delegatePublicKeys" JSON NOT NULL
);
