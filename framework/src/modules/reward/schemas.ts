/*
 * Copyright © 2021 Lisk Foundation
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

export const configSchema = {
	$id: '/reward/config',
	type: 'object',
	properties: {
		tokenID: {
			type: 'string',
			format: 'hex',
			minLength: 16,
			maxLength: 16,
		},
		offset: {
			type: 'integer',
			minimum: 1,
		},
		distance: {
			type: 'integer',
			minimum: 1,
		},
		brackets: {
			type: 'array',
			items: {
				type: 'string',
				format: 'uint64',
			},
		},
	},
	required: ['tokenID', 'offset', 'distance', 'brackets'],
};

export const getDefaultRewardAtHeightRequestSchema = {
	$id: '/reward/endpoint/getDefaultRewardAtHeightRequest',
	type: 'object',
	required: ['height'],
	properties: {
		height: {
			type: 'integer',
			format: 'uint32',
		},
	},
};

export const getDefaultRewardAtHeightResponseSchema = {
	$id: '/reward/endpoint/getDefaultRewardAtHeightResponse',
	type: 'object',
	required: ['reward'],
	properties: {
		reward: {
			type: 'string',
			format: 'uint64',
		},
	},
};

export const getInflationRateResponseSchema = {
	$id: '/reward/endpoint/getInflationRateResponse',
	type: 'object',
	required: ['tokenID', 'rate'],
	properties: {
		tokenID: {
			type: 'string',
			format: 'hex',
		},
		rate: {
			type: 'string',
			format: 'uint64',
		},
	},
};
