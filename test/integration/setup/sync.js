'use strict';

var SYNC_MODES = {
	RANDOM: 0,
	ALL_TO_FIRST: 1,
	ALL_TO_GROUP: 2
};

var SYNC_MODE_DEFAULT_ARGS = {
	RANDOM: {
		probability: 0.5 // (0 - 1)
	},
	ALL_TO_GROUP: {
		indices: []
	}
};

module.exports = {

	SYNC_MODES: SYNC_MODES,

	generatePeers: function (configurations, syncMode, syncModeArgs) {
		syncModeArgs = syncModeArgs || SYNC_MODE_DEFAULT_ARGS[syncMode];

		var peersList = [];

		switch (syncMode) {
			case SYNC_MODES.RANDOM:
				if (typeof syncModeArgs.probability !== 'number') {
					throw new Error('Probability parameter not specified to random sync mode');
				}
				var isPickedWithProbability = function (n) {
					return !!n && Math.random() <= n;
				};
				configurations.forEach(function (configuration) {
					if (isPickedWithProbability(syncModeArgs.probability)) {
						peersList.push({
							ip: configuration.ip,
							port: configuration.port
						});
					}
				});
				break;

			case SYNC_MODES.ALL_TO_FIRST:
				if (configurations.length === 0) {
					throw new Error('No configurations provided');
				}
				peersList = [{
					ip: configurations[0].ip,
					port: configurations[0].port
				}];
				break;

			case SYNC_MODES.ALL_TO_GROUP:
				if (!Array.isArray(syncModeArgs.indices)) {
					throw new Error('Provide peers indices to sync with as an array');
				}
				configurations.forEach(function (configuration, index) {
					if (syncModeArgs.indices.indexOf(index) !== -1) {
						peersList.push({
							ip: configuration.ip,
							port: configuration.port
						});
					}
				});
		}

		return peersList;
	}
};
