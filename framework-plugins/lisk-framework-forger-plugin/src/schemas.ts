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
		stakeReceived: {
			type: 'array',
			fieldNumber: 4,
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
			required: ['address', 'amount'],
		},
	},
	required: ['totalProducedBlocks', 'totalReceivedFees', 'totalReceivedRewards', 'stakeReceived'],
};

export const forgerSyncSchema = {
	$id: '/forger/sync',
	type: 'object',
	required: ['syncUptoHeight'],
	properties: {
		syncUptoHeight: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
	},
};

export const posVoteParamsSchema = {
	$id: '/forger/pos/stake',
	type: 'object',
	required: ['stakes'],
	properties: {
		stakes: {
			type: 'array',
			minItems: 1,
			maxItems: 20,
			items: {
				type: 'object',
				required: ['validatorAddress', 'amount'],
				properties: {
					validatorAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
						minLength: 20,
						maxLength: 20,
					},
					amount: {
						dataType: 'sint64',
						fieldNumber: 2,
					},
				},
			},
			fieldNumber: 1,
		},
	},
};
