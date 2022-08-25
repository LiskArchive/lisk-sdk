/*
 * Copyright © 2022 Lisk Foundation
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
import { BaseStore } from '../../base_store';
import { ADDRESS_LENGTH } from '../../token/constants';
import { SEED_LENGTH } from '../constants';

export interface ValidatorSeedReveal {
	generatorAddress: Buffer;
	seedReveal: Buffer;
	height: number;
	valid: boolean;
}

export interface ValidatorReveals {
	validatorReveals: ValidatorSeedReveal[];
}

export const seedRevealSchema = {
	$id: '/modules/random/seedReveal',
	type: 'object',
	required: ['validatorReveals'],
	properties: {
		validatorReveals: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['generatorAddress', 'seedReveal', 'height', 'valid'],
				properties: {
					generatorAddress: {
						dataType: 'bytes',
						minLength: ADDRESS_LENGTH,
						maxLength: ADDRESS_LENGTH,
						fieldNumber: 1,
					},
					seedReveal: {
						dataType: 'bytes',
						minLength: SEED_LENGTH,
						maxLength: SEED_LENGTH,
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
			},
		},
	},
};

export class ValidatorRevealsStore extends BaseStore<ValidatorReveals> {
	public schema = seedRevealSchema;
}
