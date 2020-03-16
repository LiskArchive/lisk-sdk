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
		'activeDelegates',
		'blockSlotWindow',
		'blockReceiptTimeout',
		'maxPayloadLength',
		'maxSharedTransactions',
		'maxVotesPerAccount',
		'totalAmount',
		'transactionTypes',
		'unconfirmedTransactionTimeout',
		'expiryInterval',
	],
	properties: {
		activeDelegates: {
			type: 'number',
			format: 'oddInteger',
			min: 1,
			const: 101,
			description: 'The default number of delegates allowed to forge a block',
		},
		blockSlotWindow: {
			type: 'integer',
			min: 1,
			const: 5,
			description: 'The default number of previous blocks to keep in memory',
		},
		blockReceiptTimeout: {
			type: 'integer',
			min: 1,
			const: 20,
			description: 'Seconds to check if the block is fresh or not',
		},
		maxPayloadLength: {
			type: 'integer',
			min: 1,
			const: 15 * 1024,
			description: 'Maximum transaction bytes length in a single block',
		},
		maxSharedTransactions: {
			type: 'integer',
			min: 1,
			const: 100,
			description:
				'Maximum number of in-memory transactions/signatures shared across peers',
		},
		maxVotesPerAccount: {
			type: 'number',
			min: 1,
			maximum: {
				$data: '/activeDelegates',
			},
			const: 101,
			description:
				'The maximum number of votes allowed in transaction type(3) votes',
		},
		totalAmount: {
			type: 'string',
			format: 'amount',
			const: '10000000000000000',
			description:
				'Total amount of LSK available in network before rewards milestone started',
		},
		transactionTypes: {
			type: 'object',
			required: [
				'send',
				'signature',
				'delegate',
				'vote',
				'multi',
				'dapp',
				'inTransfer',
				'outTransfer',
			],
			properties: {
				send: {
					type: 'integer',
					const: 0,
				},
				signature: {
					type: 'integer',
					const: 1,
				},
				delegate: {
					type: 'integer',
					const: 2,
				},
				vote: {
					type: 'integer',
					const: 3,
				},
				multi: {
					type: 'integer',
					const: 4,
				},
				dapp: {
					type: 'integer',
					const: 5,
				},
				inTransfer: {
					type: 'integer',
					const: 6,
				},
				outTransfer: {
					type: 'integer',
					const: 7,
				},
			},
			additionalProperties: false,
		},
		unconfirmedTransactionTimeout: {
			type: 'integer',
			min: 1,
			const: 10800,
			description:
				'Expiration time for unconfirmed transaction/signatures in transaction pool',
		},
		expiryInterval: {
			type: 'integer',
			min: 1,
			const: 30000,
			description: 'Transaction pool expiry timer in milliseconds',
		},
	},
	additionalProperties: false,
	default: {
		activeDelegates: 101,
		blockSlotWindow: 5,
		blockReceiptTimeout: 20, // 2 blocks
		maxPayloadLength: 15 * 1024,
		maxSharedTransactions: 100,
		maxVotesPerAccount: 101,
		// WARNING: When changing totalAmount you also need to change getBlockRewards(int) SQL function!
		totalAmount: '10000000000000000',
		transactionTypes: {
			send: 0,
			signature: 1,
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
