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

'use strict';

const { DelegatesList, EVENT_ROUND_FINISHED } = require('./delegates_list');
const { DelegatesInfo } = require('./delegates_info');

module.exports = class Dpos {
	constructor({ storage, slots, activeDelegates, logger, exceptions = {} }) {
		this.finalizedBlockRound = 0;
		this.slots = slots;
		this.delegatesList = new DelegatesList({
			storage,
			logger,
      slots,
			activeDelegates,
			exceptions,
		});
		this.delegatesInfo = new DelegatesInfo({
			storage,
			slots,
			activeDelegates,
			logger,
			delegatesList: this.delegatesList,
			exceptions,
		});

		this.delegatesList.on(EVENT_ROUND_FINISHED, () => {
			this.onRoundFinish();
		});
	}

	async getRoundDelegates(round) {
		return this.delegatesList.getRoundDelegates(round);
	}

	async onBlockFinalized({ height }) {
		this.finalizedBlockRound = this.slots.calcRound(height);
	}

	async onRoundFinish() {
		// TODO use the configuration variable to set the value of this variable
		const delegateListOffsetForRound = 2;
		const disposableDelegateList =
			this.finalizedBlockRound - delegateListOffsetForRound;
		await this.delegatesList.deleteDelegateListUntilRound(
			disposableDelegateList,
		);
	}

	async verifyBlockForger(block) {
		return this.delegatesList.verifyBlockForger(block);
	}

	async apply(block, tx) {
		return this.delegatesInfo.apply(block, tx);
	}

	async undo(block, tx) {
		return this.delegatesInfo.undo(block, tx);
	}
};
