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
	constructor({
		storage,
		slots,
		activeDelegates,
		delegateListRoundOffset = 0,
		logger,
		exceptions = {},
	}) {
		this.events = new EventEmitter();
		this.finalizedBlockRound = 0;
		this.slots = slots;
		this.delegateListRoundOffset = delegateListRoundOffset;

		this.delegatesList = new DelegatesList({
			storage,
			logger,
			slots,
			activeDelegates,
			delegateListRoundOffset,
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

	async getForgerPublicKeysForRound(round) {
		return this.delegatesList.getForgerPublicKeysForRound(round);
	}

	async onBlockFinalized({ height }) {
		this.finalizedBlockRound = this.slots.calcRound(height);
	}

	async onRoundFinish() {
		const disposableDelegateList =
			this.finalizedBlockRound - this.delegateListRoundOffset;
		await this.delegatesList.deleteDelegateListUntilRound(
			disposableDelegateList,
		);
	}

	async verifyBlockForger(block) {
		return this.delegatesList.verifyBlockForger(block);
	}

	async apply({ block, tx }) {
		return this.delegatesInfo.apply(block, tx);
	}

	async undo({ block, tx }) {
		return this.delegatesInfo.undo(block, tx);
	}
};
