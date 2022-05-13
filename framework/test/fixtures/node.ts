/*
 * Copyright © 2020 Lisk Foundation
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

import { NodeOptions } from '../../src/node/types';

export const cacheConfig = 'aCacheConfig';

export const nodeOptions = ({
	version: '1.0.0',
	networkVersion: '1.0',
	rootPath: '~/.lisk',
	label: 'default',
	system: {
		keepEventsForHeights: 300,
	},
	network: {
		maxInboundConnections: 0,
		seedPeers: [{ ip: '127.0.0.1', port: 5000 }],
	},
	generation: {
		waitThreshold: 2,
		delegates: [],
		modules: {},
	},
	genesis: {
		blockTime: 10, // 10 seconds
		communityIdentifier: 'Lisk',
		maxTransactionsSize: 15 * 1024, // 15kb
		bftThreshold: 68, // Two third of active delegates Math.ceil(activeDelegates * 2 / 3)
		baseFees: [
			{
				moduleID: 5,
				assetID: 0,
				baseFee: '1000000000',
			},
		],
		minFeePerByte: 1000, // 10k beddows or 0.00001 LSK
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
		minRemainingBalance: '5000000',
		activeDelegates: 101,
		standbyDelegates: 2,
		delegateListRoundOffset: 2,
		modules: {
			validators: {
				blockTime: 10,
			},
			bft: {
				batchSize: 103,
			},
		},
	},
	genesisConfig: {
		blockTime: 10, // 10 seconds
		communityIdentifier: 'Lisk',
		maxTransactionsSize: 15 * 1024, // 15kb
		bftThreshold: 68, // Two third of active delegates Math.ceil(activeDelegates * 2 / 3)
		baseFees: [
			{
				moduleID: 5,
				assetID: 0,
				baseFee: '1000000000',
			},
		],
		minFeePerByte: 1000, // 10k beddows or 0.00001 LSK
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
		minRemainingBalance: '5000000',
		activeDelegates: 101,
		standbyDelegates: 2,
		delegateListRoundOffset: 2,
	},
	transactionPool: {
		maxTransactions: 4096,
		maxTransactionsPerAccount: 64,
		transactionExpiryTime: 3 * 60 * 60 * 1000,
		minEntranceFeePriority: '0',
		minReplacementFeeDifference: '10',
	},
} as unknown) as NodeOptions;
