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

var SYNC_MODES = {
	RANDOM: 0,
	ALL_TO_FIRST: 1,
	ALL_TO_GROUP: 2,
};

var SYNC_MODE_DEFAULT_ARGS = {
	RANDOM: {
		probability: 0.5, // (0 - 1)
	},
	ALL_TO_GROUP: {
		indices: [],
	},
};

module.exports = {
	SYNC_MODES: SYNC_MODES,

	generatePeers: function(configurations, syncMode, syncModeArgs) {
		syncModeArgs = syncModeArgs || SYNC_MODE_DEFAULT_ARGS[syncMode];

		var peersList = [];

		switch (syncMode) {
			case SYNC_MODES.RANDOM:
				if (typeof syncModeArgs.probability !== 'number') {
					throw new Error(
						'Probability parameter not specified to random sync mode'
					);
				}
				var isPickedWithProbability = function(n) {
					return !!n && Math.random() <= n;
				};
				configurations.forEach(configuration => {
					if (isPickedWithProbability(syncModeArgs.probability)) {
						peersList.push({
							ip: configuration.ip,
							wsPort: configuration.wsPort,
						});
					}
				});
				break;

			case SYNC_MODES.ALL_TO_FIRST:
				if (configurations.length === 0) {
					throw new Error('No configurations provided');
				}
				peersList = [
					{
						ip: configurations[0].ip,
						wsPort: configurations[0].wsPort,
					},
				];
				break;

			case SYNC_MODES.ALL_TO_GROUP:
				if (!Array.isArray(syncModeArgs.indices)) {
					throw new Error('Provide peers indices to sync with as an array');
				}
				configurations.forEach((configuration, index) => {
					if (syncModeArgs.indices.indexOf(index) !== -1) {
						peersList.push({
							ip: configuration.ip,
							wsPort: configuration.wsPort,
						});
					}
				});
		}

		return peersList;
	},
};
