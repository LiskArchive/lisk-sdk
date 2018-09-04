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

/**
 * Description of the namespace.
 *
 * @namespace constants
 * @memberof config
 * @see Parent: {@link config}
 * @property {number} ACTIVE_DELEGATES - The default number of delegates allowed to forge a block.
 * @property {number} ADDITIONAL_DATA.MIN_LENGTH - Additional Data (Min Length)
 * @property {number} ADDITIONAL_DATA.MAX_LENGTH - Additional Data (Max Length)
 * @property {number} BLOCK_SLOT_WINDOW - The default number of previous blocks to keep in memory.
 * @property {number} BLOCK_RECEIPT_TIMEOUT - Seconds to check if the block is fresh or not.
 * @property {Date} EPOCH_TIME	- Timestamp indicating the start of lisk core.
 * @property {Object} FEES - Object representing amount of fees for different types of transactions.
 * @property {number} FEES.SEND	- Fee for sending a transaction.
 * @property {number} FEES.VOTE - Fee for voting a delegate.
 * @property {number} FEES.SECOND_SIGNATURE	- Fee for creating a secondSignature.
 * @property {number} FEES.DELEGATE - Fee for registering as a delegate.
 * @property {number} FEES.MULTISIGNATURE - Fee for multisignature transaction.
 * @property {number} FEES.DAPP_REGISTRATION	- Fee for registering as a dapp.
 * @property {number} FEES.DAPP_WITHDRAWAL	- Fee for registering as a dapp.
 * @property {number} FEES.DAPP_DEPOSIT	- Fee for registering as a dapp.
 // TODO: Needs additional check to revise max payload length
 // for each transaction type for consistency
 // FYI: https://lisk.io/documentation/the-lisk-protocol/blocks {Block Payload Section}
 * @property {number} MAX_PAYLOAD_LENGTH - Maximum transaction bytes length for 25 transactions in a single block.
 * @property {number} MAX_PEERS - Maximum number of peers allowed to connect while broadcasting a block.
 * @property {number} MAX_SHARED_TRANSACTIONS -	Maximum number of in-memory transactions/signatures shared accros peers.
 * @property {number} MAX_TRANSACTIONS_PER_BLOCK -	Maximum Number of transactions allowed per block.
 * @property {number} MAX_VOTES_PER_TRANSACTION - The maximum number of votes allowed in transaction type(3) votes.
 * @property {number} MIN_BROADHASH_CONSENSUS - Minimum broadhash consensus(%) among connected {MAX_PEERS} peers.
 * @property {number} MULTISIG_CONSTRAINTS - Minimum broadhash consensus(%) among connected {MAX_PEERS} peers.
 * @property {string[]} nethashes - For mainnet and testnet.
 * @property {number} constants.normalizer - Use this to convert LISK amount to normal value.
 * @property {Object} rewards - Object representing LSK rewards milestone.
 * @property {number[]} rewards.milestones - Initial 5, and decreasing until 1.
 * @property {number} rewards.offset - Start rewards at block (n).
 * @property {number} rewards.distance - Distance between each milestone.
 * @property {number} totalAmount - Total amount of LSK available in network before rewards milestone started.
 * @property {number} unconfirmedTransactionTimeOut - Expiration time for unconfirmed transaction/signatures in transaction pool.
 * @property {number} expiryInterval - Transaction pool expiry timer in milliseconds
 * @todo Add description for the namespace and the properties.
 */
module.exports = {
	ACTIVE_DELEGATES: 101,
	BLOCK_SLOT_WINDOW: 5,
	ADDITIONAL_DATA: {
		MIN_LENGTH: 1,
		MAX_LENGTH: 64,
	},
	BLOCK_RECEIPT_TIMEOUT: 20, // 2 blocks
	EPOCH_TIME: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)),
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
	MAX_PEERS: 100,
	MAX_SHARED_TRANSACTIONS: 100,
	MAX_TRANSACTIONS_PER_BLOCK: 25,
	MAX_VOTES_PER_TRANSACTION: 33,
	MAX_VOTES_PER_ACCOUNT: 101,
	MIN_BROADHASH_CONSENSUS: 51,
	MULTISIG_CONSTRAINTS: {
		min: {
			minimum: 1,
			maximum: 15,
		},
		lifetime: {
			minimum: 1,
			maximum: 72,
		},
		keysgroup: {
			minItems: 1,
			maxItems: 15,
		},
	},
	nethashes: [
		// Mainnet
		'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
		// Testnet
		'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
	],
	normalizer: '100000000',
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
	// WARNING: When changing totalAmount you also need to change getBlockRewards(int) SQL function!
	totalAmount: '10000000000000000',
	unconfirmedTransactionTimeOut: 10800, // 1080 blocks
	expiryInterval: 30000,
};
