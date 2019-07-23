/*
 * Copyright © 2019 Lisk Foundation
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

module.exports = {
	id: '#constants',
	type: 'object',
	required: [
		'ACTIVE_DELEGATES',
		'BLOCK_SLOT_WINDOW',
		'BLOCK_RECEIPT_TIMEOUT',
		'FEES',
		'MAX_PAYLOAD_LENGTH',
		'MAX_SHARED_TRANSACTIONS',
		'MAX_VOTES_PER_ACCOUNT',
		'MIN_BROADHASH_CONSENSUS',
		'TOTAL_AMOUNT',
		'TRANSACTION_TYPES',
		'UNCONFIRMED_TRANSACTION_TIMEOUT',
		'EXPIRY_INTERVAL',
	],
	properties: {
		ACTIVE_DELEGATES: {
			type: 'number',
			format: 'oddInteger',
			min: 1,
			const: 101,
			description: 'The default number of delegates allowed to forge a block',
		},
		BLOCK_SLOT_WINDOW: {
			type: 'integer',
			min: 1,
			const: 5,
			description: 'The default number of previous blocks to keep in memory',
		},
		BLOCK_RECEIPT_TIMEOUT: {
			type: 'integer',
			min: 1,
			const: 20,
			description: 'Seconds to check if the block is fresh or not',
		},
		FEES: {
			type: 'object',
			description:
				'Object representing amount of fees for different types of transactions',
			required: [
				'SEND',
				'VOTE',
				'SECOND_SIGNATURE',
				'DELEGATE',
				'MULTISIGNATURE',
				'DAPP_REGISTRATION',
				'DAPP_WITHDRAWAL',
				'DAPP_DEPOSIT',
			],
			properties: {
				SEND: {
					type: 'string',
					format: 'amount',
					const: '10000000',
					description: 'Fee for sending a transaction',
				},
				VOTE: {
					type: 'string',
					format: 'amount',
					const: '100000000',
					description: 'Fee for voting a delegate',
				},
				SECOND_SIGNATURE: {
					type: 'string',
					format: 'amount',
					const: '500000000',
					description: 'Fee for creating a second signature',
				},
				DELEGATE: {
					type: 'string',
					format: 'amount',
					const: '2500000000',
					description: 'Fee for registering as a delegate',
				},
				MULTISIGNATURE: {
					type: 'string',
					format: 'amount',
					const: '500000000',
					description: 'Fee for multisignature transaction',
				},
				DAPP_REGISTRATION: {
					type: 'string',
					format: 'amount',
					const: '2500000000',
					description: 'Fee for registering as a dapp',
				},
				DAPP_WITHDRAWAL: {
					type: 'string',
					format: 'amount',
					const: '10000000',
				},
				DAPP_DEPOSIT: {
					type: 'string',
					format: 'amount',
					const: '10000000',
				},
			},
			additionalProperties: false,
		},
		MAX_PAYLOAD_LENGTH: {
			type: 'integer',
			min: 1,
			const: 1024 * 1024,
			description:
				'Maximum transaction bytes length for 25 transactions in a single block',
		},
		MAX_SHARED_TRANSACTIONS: {
			type: 'integer',
			min: 1,
			const: 100,
			description:
				'Maximum number of in-memory transactions/signatures shared across peers',
		},
		MAX_VOTES_PER_ACCOUNT: {
			type: 'number',
			min: 1,
			maximum: {
				$data: '/ACTIVE_DELEGATES',
			},
			const: 101,
			description:
				'The maximum number of votes allowed in transaction type(3) votes',
		},
		MIN_BROADHASH_CONSENSUS: {
			type: 'integer',
			min: 1,
			const: 51,
			description:
				'Minimum broadhash consensus(%) among connected {MAX_PEERS} peers',
		},
		TOTAL_AMOUNT: {
			type: 'string',
			format: 'amount',
			const: '10000000000000000',
			description:
				'Total amount of LSK available in network before rewards milestone started',
		},
		TRANSACTION_TYPES: {
			type: 'object',
			required: [
				'SEND',
				'SIGNATURE',
				'DELEGATE',
				'VOTE',
				'MULTI',
				'DAPP',
				'IN_TRANSFER',
				'OUT_TRANSFER',
			],
			properties: {
				SEND: {
					type: 'integer',
					const: 0,
				},
				SIGNATURE: {
					type: 'integer',
					const: 1,
				},
				DELEGATE: {
					type: 'integer',
					const: 2,
				},
				VOTE: {
					type: 'integer',
					const: 3,
				},
				MULTI: {
					type: 'integer',
					const: 4,
				},
				DAPP: {
					type: 'integer',
					const: 5,
				},
				IN_TRANSFER: {
					type: 'integer',
					const: 6,
				},
				OUT_TRANSFER: {
					type: 'integer',
					const: 7,
				},
			},
			additionalProperties: false,
		},
		UNCONFIRMED_TRANSACTION_TIMEOUT: {
			type: 'integer',
			min: 1,
			const: 10800,
			description:
				'Expiration time for unconfirmed transaction/signatures in transaction pool',
		},
		EXPIRY_INTERVAL: {
			type: 'integer',
			min: 1,
			const: 30000,
			description: 'Transaction pool expiry timer in milliseconds',
		},
	},
	additionalProperties: false,
	default: {
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
	},
};
