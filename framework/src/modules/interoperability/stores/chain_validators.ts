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
export const updateActiveValidators = (
	activeValidators: ActiveValidator[],
	activeValidatorsUpdate: ActiveValidator[],
): ActiveValidator[] => {
	for (const updatedValidator of activeValidatorsUpdate) {
		const currentValidator = activeValidators.find(v => v.blsKey.equals(updatedValidator.blsKey));
		if (currentValidator) {
			currentValidator.bftWeight = updatedValidator.bftWeight;
		} else {
			activeValidators.push(updatedValidator);
			activeValidators.sort((v1, v2) => v1.blsKey.compare(v2.blsKey));
		}
	}

	for (const currentValidator of activeValidators) {
		if (currentValidator.bftWeight === BigInt(0)) {
			const index = activeValidators.findIndex(v => v.blsKey.equals(currentValidator.blsKey));
			activeValidators.splice(index, 1);
		}
	}

	return activeValidators;
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
		currentValidators.activeValidators = updateActiveValidators(
			currentValidators.activeValidators,
			chainValidators.activeValidators,
		);

		await this.set(context, chainID, currentValidators);
	}
}
