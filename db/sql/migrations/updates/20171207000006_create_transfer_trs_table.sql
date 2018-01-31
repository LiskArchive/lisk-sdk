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
  DESCRIPTION: Create transfer trs table and index.

  PARAMETERS: None
*/

CREATE TABLE IF NOT EXISTS "transfer" (
  "data" BYTEA NOT NULL,
  "transactionId" VARCHAR(20) NOT NULL,
  FOREIGN KEY("transactionId") REFERENCES "trs"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "transfer_trs_id" ON "transfer"("transactionId");
