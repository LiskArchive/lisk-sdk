const { Delegates, EVENT_ROUND_FINISHED } = require('./delegates');

module.exports = class Dpos {
	constructor({ storage, logger, slots }) {
		this.finalizedBlockRound = 0;
		this.delegate = new Delegates({ storage, logger });
		this.slots = slots;
		this.delegate.on(EVENT_ROUND_FINISHED, () => {
			this.onRoundFinish();
		});
	}

	async getRoundDelegates(round) {
		return this.delegates.getRoundDelegates(round);
	}

	async onBlockFinalized({ height }) {
		this.finalizedBlockRound = this.slots.calcRound(height);
	}

	async onRoundFinish() {
		const delegateListOffsetForRound = 2;
		const disposableDelegateList =
			this.finalizedBlockRound - delegateListOffsetForRound;
		await this.delegate.deleteDelegateListUntilRound(disposableDelegateList);
	}
};
