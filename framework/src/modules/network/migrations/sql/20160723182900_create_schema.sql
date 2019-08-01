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
  DESCRIPTION: Creates schema.

  PARAMETERS: None
*/

/* Tables */
CREATE TABLE IF NOT EXISTS "peers"(
  "id" SERIAL NOT NULL PRIMARY KEY,
  "ip" INET NOT NULL,
  "port" SMALLINT NOT NULL,
  "state" SMALLINT NOT NULL,
  "os" VARCHAR(64),
  "version" VARCHAR(11),
  "clock" BIGINT
);

CREATE TABLE IF NOT EXISTS "peers_dapp"(
  "peerId" INT NOT NULL,
  "dappid" VARCHAR(20) NOT NULL,
  FOREIGN KEY("peerId") REFERENCES "peers"("id") ON DELETE CASCADE
);

/* Unique Indexes */
CREATE UNIQUE INDEX IF NOT EXISTS "peers_unique" ON "peers"("ip", "port");
CREATE UNIQUE INDEX IF NOT EXISTS "peers_dapp_unique" ON "peers_dapp"("peerId", "dappid");
