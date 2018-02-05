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
  DESCRIPTION: Runtime queries - executed at node start (right after migrations).

  PARAMETERS: None
*/

UPDATE "peers" SET "state" = 1, "clock" = NULL WHERE "state" != 0;

-- Overwrite unconfirmed tables with state from confirmed tables
DELETE FROM mem_accounts2u_delegates;
INSERT INTO mem_accounts2u_delegates ("accountId", "dependentId") SELECT "accountId", "dependentId" FROM mem_accounts2delegates;

DELETE FROM mem_accounts2u_multisignatures;
INSERT INTO mem_accounts2u_multisignatures ("accountId", "dependentId") SELECT "accountId", "dependentId" FROM mem_accounts2multisignatures;
