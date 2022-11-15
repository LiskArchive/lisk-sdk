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
import { dataStructures } from '@liskhq/lisk-utils';
import { BaseStore, StoreGetter } from '../../base_store';
import { ActiveValidator } from '../types';
import { BLS_PUBLIC_KEY_LENGTH } from '../constants';

export interface ChainValidators {
	activeValidators: ActiveValidator[];
	certificateThreshold: bigint;
}

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#chain-validators-substore
export const chainValidatorsSchema = {
	$id: '/modules/interoperability/chainValidators',
	type: 'object',
	required: ['activeValidators', 'certificateThreshold'],
	properties: {
		activeValidators: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['blsKey', 'bftWeight'],
				properties: {
					blsKey: {
						dataType: 'bytes',
						minLength: BLS_PUBLIC_KEY_LENGTH,
						maxLength: BLS_PUBLIC_KEY_LENGTH,
						fieldNumber: 1,
					},
					bftWeight: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
			},
		},
		certificateThreshold: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
	},
};

// TODO: Fix with #7742 - In order to avoid circular dependency temporally, move to this file
export const calculateNewActiveValidators = (
	activeValidators: ActiveValidator[],
	activeValidatorsUpdate: ActiveValidator[],
): ActiveValidator[] => {
	const originalValidatorMap = new dataStructures.BufferMap<ActiveValidator>();
	for (const validator of activeValidators) {
		originalValidatorMap.set(validator.blsKey, validator);
	}
	for (const updatedValidator of activeValidatorsUpdate) {
		const originalValidator = originalValidatorMap.get(updatedValidator.blsKey);
		if (!originalValidator) {
			originalValidatorMap.set(updatedValidator.blsKey, updatedValidator);
			continue;
		}
		originalValidator.bftWeight = updatedValidator.bftWeight;
	}

	const updatedValidators = originalValidatorMap
		.values()
		.filter(validator => validator.bftWeight > BigInt(0));
	updatedValidators.sort((a, b) => a.blsKey.compare(b.blsKey));

	return updatedValidators;
};

export class ChainValidatorsStore extends BaseStore<ChainValidators> {
	public schema = chainValidatorsSchema;

	public async updateValidators(
		context: StoreGetter,
		chainID: Buffer,
		chainValidators: ChainValidators,
	): Promise<void> {
		const currentValidators = await this.get(context, chainID);

		currentValidators.certificateThreshold = chainValidators.certificateThreshold;
		currentValidators.activeValidators = calculateNewActiveValidators(
			currentValidators.activeValidators,
			chainValidators.activeValidators,
		);

		await this.set(context, chainID, currentValidators);
	}
}
