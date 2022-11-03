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
import { Validator } from '../../../state_machine/types';
import { BaseStore } from '../../base_store';

export const validatorSchema = {
	type: 'object',
	required: ['address', 'bftWeight', 'generatorKey', 'blsKey'],
	properties: {
		address: {
			fieldNumber: 1,
			dataType: 'bytes',
			format: 'lisk32',
		},
		bftWeight: {
			fieldNumber: 2,
			dataType: 'uint64',
		},
		generatorKey: {
			fieldNumber: 3,
			dataType: 'bytes',
		},
		blsKey: {
			fieldNumber: 4,
			dataType: 'bytes',
		},
	},
};

export const validatorsParamsSchema = {
	$id: '/validators/validatorsParams',
	type: 'object',
	required: ['validators', 'preCommitThreshold', 'certificateThreshold'],
	properties: {
		preCommitThreshold: {
			fieldNumber: 1,
			dataType: 'uint64',
		},
		certificateThreshold: {
			fieldNumber: 2,
			dataType: 'uint64',
		},
		validators: {
			fieldNumber: 3,
			type: 'array',
			items: {
				...validatorSchema,
			},
		},
	},
};

export interface ValidatorsParams {
	preCommitThreshold: bigint;
	certificateThreshold: bigint;
	validators: Validator[];
}

export class ValidatorsParamsStore extends BaseStore<ValidatorsParams> {
	public schema = validatorsParamsSchema;
}
