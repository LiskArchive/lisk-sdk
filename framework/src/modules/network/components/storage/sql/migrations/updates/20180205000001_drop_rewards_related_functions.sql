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
  DESCRIPTION: Drop rewards-related SQL functions and data type.

  PARAMETERS: None
*/

DROP FUNCTION IF EXISTS getBlockRewards();
DROP FUNCTION IF EXISTS calcBlockReward(int);
DROP FUNCTION If EXISTS calcSupply(int);
DROP FUNCTION IF EXISTS calcSupply_test(int, int, bigint);
DROP TYPE IF EXISTS blockRewards;
