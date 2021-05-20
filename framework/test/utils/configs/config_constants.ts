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

export const constantsConfig = (overriddenConfigProperties = {}) => ({
	blockTime: 10,
	delegateListRoundOffset: 2,
	communityIdentifier: 'Lisk',
	rewards: {
		milestones: [
			'500000000', // Initial Reward
			'400000000', // Milestone 1
			'300000000', // Milestone 2
			'200000000', // Milestone 3
			'100000000', // Milestone 4
		],
		offset: 2160, // Start rewards at first block of the second round
		distance: 3000000, // Distance between each milestone
	},
	bftThreshold: 68,
	minRemainingBalance: '5000000',
	minFeePerByte: 1000,
	baseFees: [
		{
			moduleID: 5,
			assetID: 0,
			baseFee: '1000000000',
		},
	],
	activeDelegates: 101,
	standbyDelegates: 2,
	maxPayloadLength: 15 * 1024,
	...overriddenConfigProperties,
});
