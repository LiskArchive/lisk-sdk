/*
 * Copyright © 2023 Lisk Foundation
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
import { MAX_LENGTH_NAME } from '../constants';

export interface ValidatorName {
	name: string;
}

export const validatorNameSchema = {
	$id: '/poa/validatorName',
	type: 'object',
	required: ['name'],
	properties: {
		name: {
			type: 'string',
			fieldNumber: 1,
			minLength: 1,
			maxLength: MAX_LENGTH_NAME,
		},
	},
};

export class ValidatorStore extends BaseStore<ValidatorName> {
	public schema = validatorNameSchema;
}
