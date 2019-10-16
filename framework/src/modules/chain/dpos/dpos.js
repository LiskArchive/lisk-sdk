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

const EventEmitter = require('events');
const { EVENT_ROUND_CHANGED } = require('./constants');
const { DelegatesList } = require('./delegates_list');
const { DelegatesInfo } = require('./delegates_info');

module.exports = class Dpos {
	constructor({ storage, slots, activeDelegates, logger, exceptions = {} }) {
		this.events = new EventEmitter();
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
			events: this.events,
			delegatesList: this.delegatesList,
			exceptions,
		});

		this.events.on(EVENT_ROUND_CHANGED, async () => {
			try {
				await this.onRoundFinish();
			} catch (err) {
				this.logger.error({ err }, 'Failed to apply round finish');
			}
		});
	}

	async getForgerPublicKeysForRound(round, delegateListRoundOffset = 0) {
		return this.delegatesList.getForgerPublicKeysForRound(
			round,
			delegateListRoundOffset,
		);
	}

	async onBlockFinalized({ height }) {
		this.finalizedBlockRound = this.slots.calcRound(height);
	}

	async onRoundFinish() {
		// TODO use the configuration variable to set the value of this variable
		const delegateListRoundOffset = 2;
		const disposableDelegateList =
			this.finalizedBlockRound - delegateListRoundOffset;
		await this.delegatesList.deleteDelegateListUntilRound(
			disposableDelegateList,
		);
	}

	async verifyBlockForger(block, roundOffset = 0) {
		return this.delegatesList.verifyBlockForger(block, roundOffset);
	}

	async apply(block, delegateListRoundOffset = 0, tx = undefined) {
		return this.delegatesInfo.apply(block, delegateListRoundOffset, tx);
	}

	async undo(block, delegateListRoundOffset = 0, tx = undefined) {
		return this.delegatesInfo.undo(block, delegateListRoundOffset, tx);
	}
};
