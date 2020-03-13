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

'use strict';

const loggerConfig = {
	logFileName: 'logs.log',
};
const cacheConfig = 'aCacheConfig';
const storageConfig = {
	logFileName: 'logs.log',
};

const gitLastCommitId = '#gitLastCommitId';
const buildVersion = '#buildVersion';
const peerList = ['peerList'];

const nodeOptions = {
	genesisBlock: {
		transactions: [],
		id: 1,
		version: 2,
		height: 1,
		communityIdentifier: 'Lisk',
		payloadHash: '',
	},
	loading: {},
	syncing: {},
	broadcasts: {},
	network: {
		enabled: false,
	},
	forging: {
		waitThreshold: 2,
	},
	transactions: {
		maxTransactions: 4096,
		maxTransactionsPerAccount: 64,
		minEntranceFeePriority: 1,
		minReplacementFeeDifference: 1,
		transactionExpiryTime: 10800000,
	},
	exceptions: {},
	constants: {
		activeDelegates: 101,
		blockSlotWindow: 5,
		ADDITIONAL_DATA: {
			MIN_LENGTH: 1,
			MAX_LENGTH: 64,
		},
		blockReceiptTimeout: 20, // 2 blocks
		fees: {
			send: '10000000',
			vote: '100000000',
			delegate: '2500000000',
			multisignature: '500000000',
			dappRegistration: '2500000000',
			dappWithdrawal: '10000000',
			dappDeposit: '10000000',
		},
		maxPayloadLength: 15 * 1024,
		MAX_PEERS: 100,
		maxSharedTransactions: 100,
		MAX_VOTES_PER_TRANSACTION: 33,
		maxVotesPerAccount: 101,
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
		MULTISIG_CONSTRAINTS: {
			MIN: {
				MINIMUM: 1,
				MAXIMUM: 15,
			},
			LIFETIME: {
				MINIMUM: 1,
				MAXIMUM: 72,
			},
			KEYSGROUP: {
				MIN_ITEMS: 1,
				MAX_ITEMS: 15,
			},
		},
		NETHASHES: [
			// Mainnet
			'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			// Testnet
			'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
		],
		NORMALIZER: '100000000',
		// WARNING: When changing totalAmount you also need to change getBlockRewards(int) SQL function!
		totalAmount: '10000000000000000',
		transactionTypes: {
			send: 0,
			delegate: 2,
			vote: 3,
			multi: 4,
			dapp: 5,
			inTransfer: 6,
			outTransfer: 7,
		},
		unconfirmedTransactionTimeout: 10800, // 1080 blocks
		expiryInterval: 30000,
	},
};

module.exports = {
	loggerConfig,
	cacheConfig,
	storageConfig,
	nodeOptions,
	gitLastCommitId,
	buildVersion,
	peerList,
};
