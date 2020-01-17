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
  DESCRIPTION: Re-create mem_accounts_get_delegates index using voteWeight column instead of vote column
  PARAMETERS: None
*/

DROP INDEX IF EXISTS "mem_accounts_get_delegates";

CREATE INDEX IF NOT EXISTS "mem_accounts_get_delegates" ON "mem_accounts" ("voteWeight" DESC, ENCODE("publicKey", 'hex') ASC) WHERE "isDelegate" = 1;
