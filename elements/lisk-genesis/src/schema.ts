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

import { Schema } from '@liskhq/lisk-codec';

import {
	blockSchema,
	baseAccountSchema,
	blockHeaderSchema,
} from '@liskhq/lisk-chain';
import { mergeDeep } from './utils';

export const genesisAccountSchema = mergeDeep({}, baseAccountSchema, {
	properties: {
		keys: {
			properties: {
				mandatoryKeys: {
					uniqueItems: true,
				},
				optionalKeys: {
					uniqueItems: true,
				},
			},
		},
	},
}) as Schema;
export const genesisBlockSchema = mergeDeep({}, blockSchema, {
	properties: {
		payload: {
			const: [],
		},
	},
}) as Schema;

export const defaultAccountAssetSchema = {
	$id: '/genesis_block/account/default',
	type: 'object',
	properties: {
		delegate: {
			type: 'object',
			fieldNumber: 1,
			properties: {
				username: { dataType: 'string', fieldNumber: 1 },
				pomHeights: {
					type: 'array',
					items: { dataType: 'uint32' },
					fieldNumber: 2,
				},
				consecutiveMissedBlocks: { dataType: 'uint32', fieldNumber: 3 },
				lastForgedHeight: { dataType: 'uint32', fieldNumber: 4 },
				isBanned: { dataType: 'boolean', fieldNumber: 5 },
				totalVotesReceived: { dataType: 'uint64', fieldNumber: 6 },
			},
			required: [
				'username',
				'pomHeights',
				'consecutiveMissedBlocks',
				'lastForgedHeight',
				'isBanned',
				'totalVotesReceived',
			],
		},
		sentVotes: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				properties: {
					delegateAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
				required: ['delegateAddress', 'amount'],
			},
		},
		unlocking: {
			type: 'array',
			fieldNumber: 3,
			items: {
				type: 'object',
				properties: {
					delegateAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
					unvoteHeight: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
				required: ['delegateAddress', 'amount', 'unvoteHeight'],
			},
		},
	},
};

export const genesisBlockHeaderSchema = mergeDeep({}, blockHeaderSchema, {
	properties: {
		version: {
			const: 0,
		},
	},
}) as Schema;

export const genesisBlockHeaderAssetSchema = {
	$id: '/genesis_block/header/asset',
	type: 'object',
	required: ['accounts', 'initDelegates', 'initRounds'],
	properties: {
		accounts: {
			type: 'array',
			items: {
				...genesisAccountSchema,
			},
			fieldNumber: 1,
			uniqueItems: true,
		},
		initDelegates: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 2,
			minItems: 1,
			uniqueItems: true,
		},
		initRounds: {
			dataType: 'uint32',
			fieldNumber: 3,
			minimum: 3,
		},
	},
} as Schema;
