var constants = require("./constants.js");

/**
 * Get time from Lisk epoch.
 * @param {number|undefined} time Time in unix seconds
 * @returns {number}
 */

function beginEpochTime () {
	var d = constants.epochTime;

	return d;
}

function getEpochTime (time) {
	if (time === undefined) {
		time = (new Date()).getTime();
	}

	var d = beginEpochTime();
	var t = d.getTime();

	return Math.floor((time - t) / 1000);
}

module.exports = {
	interval: 10,
	delegates: constants.activeDelegates,

	getTime: function (time) {
		return getEpochTime(time);
	},

	getRealTime: function (epochTime) {
		if (epochTime === undefined) {
			epochTime = this.getTime()
		}

		var d = beginEpochTime();
		var t = Math.floor(d.getTime() / 1000) * 1000;

		return t + epochTime * 1000;
	},

	getSlotNumber: function (epochTime) {
		if (epochTime === undefined) {
			epochTime = this.getTime();
		}

		return Math.floor(epochTime / this.interval);
	},

	getSlotTime: function (slot) {
		return slot * this.interval;
	},

	getNextSlot: function () {
		var slot = this.getSlotNumber();

		return slot + 1;
	},

	getLastSlot: function (nextSlot) {
		return nextSlot + this.delegates;
	},

	roundTime: function (date) {
		Math.floor(date.getTime() / 1000) * 1000;
	}
}
