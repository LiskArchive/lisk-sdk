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
 * @memberof module:helpers
 * @module helpers/slots
 */
/**
 * Gets constant time from Lisk epoch.
 * @returns {number} epochTime from constants.
 */
function beginEpochTime() {
	var d = constants.epochTime;

	return d;
}

/**
 * Calculates time since Lisk epoch.
 * @param {number|undefined} time - Time in unix seconds.
 * @returns {number} current time - lisk epoch time.
 */
function getEpochTime(time) {
	if (time === undefined) {
		time = Date.now();
	}

	var d = beginEpochTime();
	var t = d.getTime();

	return Math.floor((time - t) / 1000);
}
/**
 * @namespace
 */
module.exports = {
	/**
	 * @property {number} interval - Slot time interval in seconds.
	 */
	interval: 10,

	/**
	 * @property {number} delegates - Active delegates from constants.
	 */
	delegates: constants.activeDelegates,

	/**
	 * @method
	 * @param {number} time
	 * @return {number} lisk epoch time constant.
	 */
	getTime: function(time) {
		return getEpochTime(time);
	},

	/**
	 * @method
	 * @param {number} [epochTime]
	 * @return {number} constant time from Lisk epoch + input time.
	 */
	getRealTime: function(epochTime) {
		if (epochTime === undefined) {
			epochTime = this.getTime();
		}

		var d = beginEpochTime();
		var t = Math.floor(d.getTime() / 1000) * 1000;

		return t + epochTime * 1000;
	},

	/**
	 * @method
	 * @param {number} [epochTime] - time or
	 * @return {number} input time / slot interval.
	 */
	getSlotNumber: function(epochTime) {
		if (epochTime === undefined) {
			epochTime = this.getTime();
		}

		return Math.floor(epochTime / this.interval);
	},

	/**
	 * @method
	 * @param {number} slot - slot number
	 * @return {number} input slot * slot interval.
	 */
	getSlotTime: function(slot) {
		return slot * this.interval;
	},

	/**
	 * @method
	 * @return {number} current slot number + 1.
	 */
	getNextSlot: function() {
		var slot = this.getSlotNumber();

		return slot + 1;
	},

	/**
	 * @method
	 * @param {number} nextSlot
	 * @return {number} input next slot + delegates.
	 */
	getLastSlot: function(nextSlot) {
		return nextSlot + this.delegates;
	},

	roundTime: function(date) {
		return Math.floor(date.getTime() / 1000) * 1000;
	},

	/**
	 * Calculates round number from the given height
	 * @param {number} height Height from which round is calculated
	 * @return {number} Round
	 */
	calcRound: function(height) {
		return Math.ceil(height / this.delegates);
	},
};
