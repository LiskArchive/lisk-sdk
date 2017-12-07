'use strict';

var BlockRewards = {
	getBlockRewards: 'SELECT * FROM get_block_rewards();',

	calcBlockReward: 'SELECT calculate_block_reward AS reward FROM calculate_block_reward(${height});',

	calcSupply: 'SELECT calculate_supply AS supply FROM calculate_supply(${height});',

	calcSupply_test: 'SELECT calculate_supply_test AS result FROM calculate_supply_test(${height_start}, ${height_end}, ${expected_reward});',

	calcBlockReward_test: 'WITH heights AS (SELECT generate_series(${height_start}, ${height_end}) AS height), results AS (SELECT height, ${expected_reward} AS expected_reward, calculate_block_reward(height) AS reward FROM heights) SELECT COUNT(1) AS result FROM results WHERE reward <> expected_reward;'
};

module.exports = BlockRewards;
