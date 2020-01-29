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
  DESCRIPTION: Remove column blockId from tables: mem_accounts and mem_round.
  PARAMETERS: None
*/

ALTER TABLE "mem_accounts" DROP COLUMN "blockId";
ALTER TABLE "mem_round" DROP COLUMN "blockId";
ALTER TABLE IF EXISTS "mem_round_snapshot" DROP COLUMN "blockId";
