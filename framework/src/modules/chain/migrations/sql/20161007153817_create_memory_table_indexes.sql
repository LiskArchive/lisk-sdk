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
  DESCRIPTION: Create Memory Table Indexes.

  PARAMETERS: None
*/

CREATE INDEX IF NOT EXISTS "mem_round_address" ON "mem_round"("address");

CREATE INDEX IF NOT EXISTS "mem_round_round" ON "mem_round"("round");

CREATE INDEX IF NOT EXISTS "mem_accounts2delegates_accountId" ON "mem_accounts2delegates"("accountId");

CREATE INDEX IF NOT EXISTS "mem_accounts2u_delegates_accountId" ON "mem_accounts2u_delegates"("accountId");

CREATE INDEX IF NOT EXISTS "mem_accounts2multisignatures_accountId" ON "mem_accounts2multisignatures"("accountId");

CREATE INDEX IF NOT EXISTS "mem_accounts2u_multisignatures_accountId" ON "mem_accounts2u_multisignatures"("accountId");
