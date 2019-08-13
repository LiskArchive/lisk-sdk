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

const constantsConfig = (overriddenConfigProperties = {}) => ({
	EPOCH_TIME: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
	BLOCK_TIME: 10,
	MAX_TRANSACTIONS_PER_BLOCK: 25,
	REWARDS: {
		MILESTONES: [
			'500000000', // Initial Reward
			'400000000', // Milestone 1
			'300000000', // Milestone 2
			'200000000', // Milestone 3
			'100000000', // Milestone 4
		],
		OFFSET: 2160, // Start rewards at first block of the second round
		DISTANCE: 3000000, // Distance between each milestone
	},
	ACTIVE_DELEGATES: 101,
	BLOCK_SLOT_WINDOW: 5,
	BLOCK_RECEIPT_TIMEOUT: 20, // 2 blocks
	FEES: {
		SEND: '10000000',
		VOTE: '100000000',
		SECOND_SIGNATURE: '500000000',
		DELEGATE: '2500000000',
		MULTISIGNATURE: '500000000',
		DAPP_REGISTRATION: '2500000000',
		DAPP_WITHDRAWAL: '10000000',
		DAPP_DEPOSIT: '10000000',
	},
	MAX_PAYLOAD_LENGTH: 1024 * 1024,
	MAX_SHARED_TRANSACTIONS: 100,
	MAX_VOTES_PER_ACCOUNT: 101,
	MIN_BROADHASH_CONSENSUS: 51,
	// WARNING: When changing totalAmount you also need to change getBlockRewards(int) SQL function!
	TOTAL_AMOUNT: '10000000000000000',
	TRANSACTION_TYPES: {
		SEND: 0,
		SIGNATURE: 1,
		DELEGATE: 2,
		VOTE: 3,
		MULTI: 4,
		DAPP: 5,
		IN_TRANSFER: 6,
		OUT_TRANSFER: 7,
	},
	UNCONFIRMED_TRANSACTION_TIMEOUT: 10800, // 1080 blocks
	EXPIRY_INTERVAL: 30000,
	...overriddenConfigProperties,
});

module.exports = {
	constantsConfig,
};
