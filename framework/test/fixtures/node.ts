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

export const cacheConfig = 'aCacheConfig';

export const nodeOptions = {
	system: {
		dataPath: '~/.lisk/default',
		keepEventsForHeights: 300,
	},
	rpc: {
		modes: [],
		port: 8080,
		host: '127.0.0.1',
	},
	network: {
		version: '1.0',
		maxInboundConnections: 0,
		seedPeers: [{ ip: '127.0.0.1', port: 5000 }],
	},
	genesis: {
		blockTime: 10, // 10 seconds
		chainID: '10000000',
		maxTransactionsSize: 15 * 1024, // 15kb
		bftBatchSize: 103,
	},
	transactionPool: {
		maxTransactions: 4096,
		maxTransactionsPerAccount: 64,
		transactionExpiryTime: 3 * 60 * 60 * 1000,
		minEntranceFeePriority: '0',
		minReplacementFeeDifference: '10',
	},
	modules: {
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
	},
};
