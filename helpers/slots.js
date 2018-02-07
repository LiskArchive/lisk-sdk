/*
 * Copyright © 2018 Lisk Foundation
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

var constants = require('./constants.js');

/**
 * Description of the module.
 *
 * @module
 * @requires helpers/constants
 * @property {number} interval - Slot time interval in seconds.
 * @property {number} delegates - Active delegates from constants.
 * @see Parent: {@link helpers}
 * @todo Add description of the module
 */

/**
 * Gets constant time from Lisk epoch.
 *
 * @private
 * @returns {number} epochTime from constants
 */
function beginEpochTime() {
	var d = constants.epochTime;

	return d;
}

/**
 * Calculates time since Lisk epoch.
 *
 * @private
 * @param {number|undefined} time - Time in unix seconds
 * @returns {number} current time - lisk epoch time
 */
function getEpochTime(time) {
	if (time === undefined) {
		time = Date.now();
	}

	var d = beginEpochTime();
	var t = d.getTime();

	return Math.floor((time - t) / 1000);
}

module.exports = {
	interval: 10,
	delegates: constants.activeDelegates,

	/**
	 * Description of the function.
	 *
	 * @param {number} time - Description of the param
	 * @returns {number} lisk epoch time constant
	 * @todo Add description of the function and its param
	 */
	getTime(time) {
		return getEpochTime(time);
	},

	/**
	 * Description of the function.
	 *
	 * @param {number} [epochTime] - Description of the param
	 * @returns {number} constant time from Lisk epoch + input time
	 * @todo Add description of the function and its param
	 */
	getRealTime(epochTime) {
		if (epochTime === undefined) {
			epochTime = this.getTime();
		}

		var d = beginEpochTime();
		var t = Math.floor(d.getTime() / 1000) * 1000;

		return t + epochTime * 1000;
	},

	/**
	 * Description of the function.
	 *
	 * @param {number} [epochTime] - time or
	 * @returns {number} input time / slot interval.
	 * @todo Add description of the function and its param
	 */
	getSlotNumber(epochTime) {
		if (epochTime === undefined) {
			epochTime = this.getTime();
		}

		return Math.floor(epochTime / this.interval);
	},

	/**
	 * Description of the function.
	 *
	 * @param {number} slot - slot number
	 * @returns {number} input slot * slot interval.
	 * @todo Add description of the function and its param
	 */
	getSlotTime(slot) {
		return slot * this.interval;
	},

	/**
	 * Description of the function.
	 *
	 * @returns {number} current slot number + 1.
	 * @todo Add description of the function and its param
	 */
	getNextSlot() {
		var slot = this.getSlotNumber();

		return slot + 1;
	},

	/**
	 * Description of the function.
	 *
	 * @param {number} nextSlot - Description of the param
	 * @returns {number} input next slot + delegates
	 * @todo Add description of the function and its param
	 */
	getLastSlot(nextSlot) {
		return nextSlot + this.delegates;
	},

	/**
	 * Description of the function.
	 *
	 * @param {number} nextSlot - Description of the param
	 * @returns {number} input next slot + delegates
	 * @todo Add description of the function and its param
	 */
	roundTime(date) {
		return Math.floor(date.getTime() / 1000) * 1000;
	},

	/**
	 * Calculates round number from the given height.
	 *
	 * @param {number} height - Height from which round is calculated
	 * @returns {number} Round
	 * @todo Add description of the param
	 *
	 */
	calcRound(height) {
		return Math.ceil(height / this.delegates);
	},
};
