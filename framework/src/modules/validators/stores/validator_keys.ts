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
import { BLS_PUBLIC_KEY_LENGTH, ED25519_PUBLIC_KEY_LENGTH } from '../constants';

export interface ValidatorKeys {
	generatorKey: Buffer;
	blsKey: Buffer;
}

export const validatorKeysSchema = {
	$id: '/validators/validatorAccountSubStore',
	title: 'Validators Account Keys',
	type: 'object',
	properties: {
		generatorKey: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: ED25519_PUBLIC_KEY_LENGTH,
			maxLength: ED25519_PUBLIC_KEY_LENGTH,
		},
		blsKey: {
			dataType: 'bytes',
			fieldNumber: 2,
			minLength: BLS_PUBLIC_KEY_LENGTH,
			maxLength: BLS_PUBLIC_KEY_LENGTH,
		},
	},
	required: ['generatorKey', 'blsKey'],
};

export class ValidatorKeysStore extends BaseStore<ValidatorKeys> {
	public schema = validatorKeysSchema;
}
