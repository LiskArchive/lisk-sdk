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
'use strict';

var BlockRewards = {
	getBlockRewards: 'SELECT * FROM getBlockRewards();',

	calcBlockReward:
		'SELECT calcBlockReward AS reward FROM calcBlockReward(${height});',

	calcSupply: 'SELECT calcSupply AS supply FROM calcSupply(${height});',

	calcSupply_test:
		'SELECT calcSupply_test AS result FROM calcSupply_test(${height_start}, ${height_end}, ${expected_reward});',

	calcBlockReward_test:
		'WITH heights AS (SELECT generate_series(${height_start}, ${height_end}) AS height), results AS (SELECT height, ${expected_reward} AS expected_reward, calcBlockReward(height) AS reward FROM heights) SELECT COUNT(*) AS result FROM results WHERE reward <> expected_reward;',
};

module.exports = BlockRewards;
