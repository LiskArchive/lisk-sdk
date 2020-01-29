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
  DESCRIPTION: Creates meta table for BFT.

  PARAMETERS: None
*/

CREATE TABLE IF NOT EXISTS "temp_block" (
	"id" VARCHAR(20) PRIMARY KEY,
  "height" INT NOT NULL,
	"fullBlock" jsonb NOT NULL
);
