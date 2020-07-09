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

export const forgerInfoSchema = {
	$id: '/forger/info',
	type: 'object',
	properties: {
		totalProducedBlocks: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		totalReceivedFees: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		totalReceivedRewards: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		votesReceived: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
			},
			fieldNumber: 4,
			required: ['address', 'amount'],
		},
	},
	required: ['totalProducedBlocks', 'totalReceivedFees', 'totalReceivedRewards', 'votesReceived'],
};
