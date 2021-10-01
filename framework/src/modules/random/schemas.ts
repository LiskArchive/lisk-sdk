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

export const randomModuleConfig = {
	$id: 'modules/random/config',
	type: 'object',
	required: [],
	properties: {
		batchSize: {
			type: 'integer',
			format: 'uint32',
		},
	},
};

export const seedRevealSchema = {
	$id: 'modules/random/seedReveal',
	type: 'object',
	properties: {
		validatorReveals: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					generatorAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					seedReveal: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
					height: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
					valid: {
						dataType: 'boolean',
						fieldNumber: 4,
					},
				},
				required: ['generatorAddress', 'seedReveal', 'height', 'valid'],
			},
		},
		required: ['validatorReveals'],
	},
};
