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
 * @property {number} activeDelegates - The default number of delegates
 * @property {number} maxVotesPerTransaction - The maximum number of votes in vote type transaction
 * @property {number} addressLength - The default address length
 * @property {number} blockSlotWindow - The default no. of previous blocks to keep in memory
 * @property {number} blockHeaderLength - The default block header length
 * @property {number} blockReceiptTimeOut
 * @property {number} confirmationLength
 * @property {Date} epochTime
 * @property {Object} fees - The default values for fees
 * @property {number} fees.send
 * @property {number} fees.vote
 * @property {number} fees.secondSignature
 * @property {number} fees.delegate
 * @property {number} fees.multisignature
 * @property {number} fees.dapp
 * @property {number} feeStart
 * @property {number} feeStartVolume
 * @property {number} fixedPoint
 * @property {number} maxAddressesLength
 * @property {number} maxAmount
 * @property {number} maxConfirmations
 * @property {number} maxPayloadLength
 * @property {number} maxPeers
 * @property {number} maxRequests
 * @property {number} maxSharedTxs
 * @property {number} maxSignaturesLength
 * @property {number} maxTxsPerBlock
 * @property {number} minBroadhashConsensus
 * @property {string[]} nethashes - For mainnet and testnet
 * @property {number} numberLength
 * @property {number} requestLength
 * @property {Object} rewards
 * @property {number[]} rewards.milestones - Initial 5, and decreasing until 1
 * @property {number} rewards.offset - Start rewards at block (n)
 * @property {number} rewards.distance - Distance between each milestone
 * @property {number} signatureLength
 * @property {number} totalAmount
 * @property {number} unconfirmedTransactionTimeOut - 1080 blocks
 * @todo Add description for the namespace and the properties
 */

const ACTIVE_DELEGATES = 101;
const ADDRESS_LENGTH = 208;
const ADDITIONAL_DATA = {
	minLength: 1,
	maxLength: 64,
};
const BLOCK_SLOT_WINDOW = 5;
const BLOCK_HEADER_LENGTH = 248;
const BLOCK_RECEIPT_TIMEOUT = 20; // 2 blocks
const CONFIRMATION_LENGTH = 77;
const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));
const FEES = {
	send: 10000000,
	vote: 100000000,
	secondSignature: 500000000,
	delegate: 2500000000,
	multisignature: 500000000,
	dappRegistration: 2500000000,
	dappWithdrawal: 10000000,
	dappDeposit: 10000000,
	data: 10000000,
};
const FEE_START = 1;
const FEE_START_VOLUME = 10000 * 100000000;
const FIXED_POINT = Math.pow(10, 8);
const MAX_ADDRESS_LENGTH = 208 * 128;
const MAX_AMOUNT = 100000000;
const MAX_CONFIRMATIONS = 77 * 100;
const MAX_PAYLOAD_LENGTH = 1024 * 1024;
const MAX_PEERS = 100;
const MAX_REQUESTS = 10000 * 12;
const MAX_SHARED_TXS = 100;
const MAX_SIGNATURES_LENGTH = 196 * 256;
const MAX_TXS_PER_BLOCK = 25;
const MAX_VOTES_PER_TXS = 33;
const MAX_VOTES_PER_ACCOUNT = 101;
const MIN_BROADHASH_CONSENSUS = 51;
const MULTISIG_CONSTRAINTS = {
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
};
const NETHASHES = [
	// Mainnet
	'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
	// Testnet
	'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
];
const NUMBER_LENGTH = 100000000;
const REQUEST_LENGTH = 104;
const REWARDS = {
	milestones: [
		500000000, // Initial Reward
		400000000, // Milestone 1
		300000000, // Milestone 2
		200000000, // Milestone 3
		100000000, // Milestone 4
	],
	offset: 1451520, // Start rewards at block (n)
	distance: 3000000, // Distance between each milestone
};
const SIGNATURE_LENGTH = 196;
// WARNING: When changing totalAmount you also need to change getBlockRewards(int) SQL function!
const TOTAL_AMOUNT = 10000000000000000;
const UNCONFIRMED_TXS_TIMEOUT = 10800; // 1080 blocks

module.exports = {
	ACTIVE_DELEGATES,
	ADDRESS_LENGTH,
	ADDITIONAL_DATA,
	BLOCK_SLOT_WINDOW,
	BLOCK_HEADER_LENGTH,
	BLOCK_RECEIPT_TIMEOUT,
	CONFIRMATION_LENGTH,
	EPOCH_TIME,
	FEES,
	FEE_START,
	FEE_START_VOLUME,
	FIXED_POINT,
	MAX_ADDRESS_LENGTH,
	MAX_AMOUNT,
	MAX_CONFIRMATIONS,
	MAX_PAYLOAD_LENGTH,
	MAX_PEERS,
	MAX_REQUESTS,
	MAX_SHARED_TXS,
	MAX_SIGNATURES_LENGTH,
	MAX_TXS_PER_BLOCK,
	MAX_VOTES_PER_TXS,
	MAX_VOTES_PER_ACCOUNT,
	MIN_BROADHASH_CONSENSUS,
	MULTISIG_CONSTRAINTS,
	NETHASHES,
	NUMBER_LENGTH,
	REQUEST_LENGTH,
	REWARDS,
	SIGNATURE_LENGTH,
	TOTAL_AMOUNT,
	UNCONFIRMED_TXS_TIMEOUT,
};
