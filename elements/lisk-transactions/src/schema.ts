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
 *
 */

/**
 * Schema for Lisk Transactions
 *
 * @see [LIP 0068 - Define new transaction schema](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0068.md)
 */
export const baseTransactionSchema = {
	$id: '/lisk/baseTransaction',
	type: 'object',
	required: ['module', 'command', 'nonce', 'fee', 'senderPublicKey', 'params'],
	properties: {
		module: {
			dataType: 'string',
			fieldNumber: 1,
		},
		command: {
			dataType: 'string',
			fieldNumber: 2,
		},
		nonce: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		fee: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		senderPublicKey: {
			dataType: 'bytes',
			fieldNumber: 5,
		},
		params: {
			dataType: 'bytes',
			fieldNumber: 6,
		},
		signatures: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 7,
		},
	},
};
