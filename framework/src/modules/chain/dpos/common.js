const updateProducedBlocks = (address, undo = false) => {
	const filters = { address_eq: address };
	const field = 'producedBlocks';
	const value = undo ? '-1' : '1';
	const method = undo ? 'decreaseFieldBy' : 'increaseFieldBy';

	return {
		filters,
		field,
		value,
		method,
	};
};

const updateMissedBlocks = (nonForgedDelegateAddresses, undo = false) => {
	const filters = { address_in: nonForgedDelegateAddresses };
	const field = 'missedBlocks';
	const value = '1';

	const method = undo ? 'decreaseFieldBy' : 'increaseFieldBy';

	return {
		filters,
		field,
		value,
		method,
	};
};

const distributeRewardsAndFees = (
	account,
	{ fee, reward, amount },
	undo = false
) => {
	const factor = undo ? -1 : 1;
	return {
		...account,
		balance: account.balance.plus(amount.times(factor)),
		fees: account.fees.plus(fee.times(factor)),
		rewards: account.rewards.plus(reward.times(factor)),
	};
};

module.exports = {
	updateMissedBlocks,
	updateProducedBlocks,
	distributeRewardsAndFees,
};
