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
  DESCRIPTION: Create index for mem_accounts.publicKey
  PARAMETERS: None
*/

DROP INDEX IF EXISTS "mem_accounts_public_key";
CREATE INDEX IF NOT EXISTS "mem_accounts_public_key" ON "mem_accounts" ("publicKey");
