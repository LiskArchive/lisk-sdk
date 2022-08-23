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
		},
		blsKey: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
	},
	required: ['generatorKey', 'blsKey'],
};

export class ValidatorKeysStore extends BaseStore<ValidatorKeys> {
	public schema = validatorKeysSchema;
}
