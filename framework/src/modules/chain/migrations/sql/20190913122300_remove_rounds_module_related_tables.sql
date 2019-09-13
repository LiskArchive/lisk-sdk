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
  DESCRIPTION: Remove `mem_rounds`, `mem_round_snapshot` and `mem_votes_snapshot` tables as they are not used anymore in the new Dpos Module
  PARAMETERS: None
*/

DROP TABLE IF EXISTS "mem_round";
DROP TABLE IF EXISTS "mem_round_snapshot";
DROP TABLE IF EXISTS "mem_votes_snapshot";
