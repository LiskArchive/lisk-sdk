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

class Slots {
	constructor({ epochTime, interval, blocksPerRound }) {
		this.epochTime = epochTime;
		this.interval = interval;
		this.blocksPerRound = blocksPerRound;
	}

	getEpochTime(time) {
		const parsedTime = time === undefined ? Date.now() : time;

		return Math.floor((parsedTime - new Date(this.epochTime).getTime()) / 1000);
	}

	getRealTime(epochTime) {
		const parsedEpochTime =
			epochTime === undefined ? this.getEpochTime() : epochTime;

		return (
			Math.floor(new Date(this.epochTime).getTime() / 1000) * 1000 +
			parsedEpochTime * 1000
		);
	}

	getSlotNumber(epochTime) {
		const parsedEpochTime =
			epochTime === undefined ? this.getEpochTime() : epochTime;

		return Math.floor(parsedEpochTime / this.interval);
	}

	getSlotTime(slot) {
		return slot * this.interval;
	}

	getNextSlot() {
		const slot = this.getSlotNumber();

		return slot + 1;
	}

	getLastSlot(nextSlot) {
		return nextSlot + this.blocksPerRound;
	}

	isWithinTimeslot(slot, time) {
		return this.getSlotNumber(time) === slot;
	}

	calcRound(height) {
		return Math.ceil(height / this.blocksPerRound);
	}

	calcRoundStartHeight(round) {
		return (round < 1 ? 0 : round - 1) * this.blocksPerRound + 1;
	}

	calcRoundEndHeight(round) {
		return (round < 1 ? 1 : round) * this.blocksPerRound;
	}
}

module.exports = {
	Slots,
};
