const BlockReward = require('../logic/block_reward');

const blockReward = new BlockReward();

module.exports = (scope, channel) => {
	channel.action('calculateSupply', action =>
		blockReward.calcSupply(action.params)
	);
	channel.action('calculateMilestone', action =>
		blockReward.calcMilestone(action.params)
	);
	channel.action('calculateReward', action =>
		blockReward.calcReward(action.params)
	);
	channel.action('generateDelegateList', action =>
		scope.modules.delegates.generateDelegateList(
			action.params.round,
			action.params.source,
			action.params.callback,
			action.params.tx
		)
	);
};
