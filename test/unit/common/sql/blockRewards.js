'use strict';

var BlockRewards = {
	getBlockRewards: 'SELECT * FROM getBlockRewards();',

	calcBlockReward: 'SELECT calcBlockReward AS reward FROM calcBlockReward(${height});',

	calcSupply: 'SELECT calcSupply AS supply FROM calcSupply(${height});',

	calcSupply_test: 'SELECT calcSupply_test AS result FROM calcSupply_test(${height_start}, ${height_end}, ${expected_reward});',

	calcBlockReward_test: 'WITH heights AS (SELECT generate_series(${height_start}, ${height_end}) AS height), results AS (SELECT height, ${expected_reward} AS expected_reward, calcBlockReward(height) AS reward FROM heights) SELECT COUNT(1) AS result FROM results WHERE reward <> expected_reward;'
};

module.exports = BlockRewards;
