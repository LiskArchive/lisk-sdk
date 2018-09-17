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
 * @memberof helpers
 * @see Parent: {@link helpers}
 * @property {number} activeDelegates - The default number of delegates allowed to forge a block.
 * @property {number} maxVotesPerTransaction - The maximum number of votes allowed in transaction type(3) votes.
 * @property {number} blockSlotWindow - The default number of previous blocks to keep in memory.
 * @property {number} blockReceiptTimeOut - Seconds to check if the block is fresh or not.
 * @property {Date} epochTime	- Timestamp indicating the start of lisk core.
 * @property {Object} fees - Object representing amount of fees for different types of transactions.
 * @property {number} fees.send	- Fee for sending a transaction.
 * @property {number} fees.vote - Fee for voting a delegate.
 * @property {number} fees.secondSignature	- Fee for creating a secondSignature.
 * @property {number} fees.delegate - Fee for registering as a delegate.
 * @property {number} fees.multisignature - Fee for multisignature transaction.
 * @property {number} fees.dapp	- Fee for registering as a dapp.
 * @property {number} maxAmount - Maximum amount of LSK that can be transfered in a transaction.
 // TODO: Needs additional check to revise max payload length
 // for each transaction type for consistency
 // FYI: https://lisk.io/documentation/the-lisk-protocol/blocks {Block Payload Section}
 * @property {number} maxPayloadLength - Maximum transaction bytes length for 25 transactions in a single block.
 * @property {number} maxPeers - Maximum number of peers allowed to connect while broadcasting a block.
 * @property {number} maxSharedTxs - Maximum number of in-memory transactions/signatures shared accros peers.
 * @property {number} maxTxsPerBlock -	Maximum Number of transactions allowed per block.
 * @property {number} minBroadhashConsensus - Minimum broadhash consensus(%) among connected {maxPeers} peers.
 * @property {string[]} nethashes - For mainnet and testnet.
 * @property {number} constants.normalizer - Use this to convert LISK amount to normal value.
 * @property {Object} rewards - Object representing LSK rewards milestone.
 * @property {number[]} rewards.milestones - Initial 5, and decreasing until 1.
 * @property {number} rewards.offset - Start rewards at block (n).
 * @property {number} rewards.distance - Distance between each milestone.
 * @property {number} totalAmount - Total amount of LSK available in network before rewards milestone started.
 * @property {number} unconfirmedTransactionTimeOut - Expiration time for unconfirmed transaction/signatures in transaction pool.
 * @todo Add description for the namespace and the properties.
 */
var constants = {
	activeDelegates: 101,
	blockSlotWindow: 5,
	additionalData: {
		minLength: 1,
		maxLength: 64,
	},
	blockReceiptTimeOut: 20, // 2 blocks
	epochTime: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)),
	fees: {
		send: 10000000,
		vote: 100000000,
		secondSignature: 500000000,
		delegate: 2500000000,
		multisignature: 500000000,
		dappRegistration: 2500000000,
		dappWithdrawal: 10000000,
		dappDeposit: 10000000,
	},
	maxAmount: 100000000,
	maxPayloadLength: 1024 * 1024,
	maxPeers: 100,
	maxSharedTransactions: 100,
	maxTransactionsPerBlock: 25,
	maxVotesPerTransaction: 33,
	maxVotesPerAccount: 101,
	minBroadhashConsensus: 51,
	multisigConstraints: {
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
	normalizer: 100000000,
	rewards: {
		milestones: [
			500000000, // Initial Reward
			400000000, // Milestone 1
			300000000, // Milestone 2
			200000000, // Milestone 3
			100000000, // Milestone 4
		],
		offset: 2160, // Start rewards at block (n)
		distance: 3000000, // Distance between each milestone
	},
	totalAmount: 10000000000000000,
	unconfirmedTransactionTimeOut: 10800, // 1080 blocks
};

module.exports = constants;
