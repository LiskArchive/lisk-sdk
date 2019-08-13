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

const { Delegates, EVENT_ROUND_FINISHED } = require('./delegates');
const { Account } = require('./account');

module.exports = class Dpos {
	constructor({
		storage,
		slots,
		activeDelegates,
		logger,
		schema,
		exceptions = {},
	}) {
		this.finalizedBlockRound = 0;
		this.slots = slots;
		this.delegates = new Delegates({ storage, logger, exceptions });
		this.account = new Account({
			storage,
			slots,
			activeDelegates,
			schema,
			logger,
			delegates: this.delegates,
			exceptions,
		});

		this.delegates.on(EVENT_ROUND_FINISHED, () => {
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
		// TODO use the configuration variable to set the value of this variable
		const delegateListOffsetForRound = 2;
		const disposableDelegateList =
			this.finalizedBlockRound - delegateListOffsetForRound;
		await this.delegates.deleteDelegateListUntilRound(disposableDelegateList);
	}

	async apply(block, tx) {
		return this.account.apply(block, tx);
	}

	async undo(block, tx) {
		return this.account.undo(block, tx);
	}
};
