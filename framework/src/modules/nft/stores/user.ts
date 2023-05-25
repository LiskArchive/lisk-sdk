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
import { MAX_LENGTH_MODULE_NAME, MIN_LENGTH_MODULE_NAME } from '../constants';

export interface UserStoreData {
	lockingModule: string;
}

export const userStoreSchema = {
	$id: '/nft/store/user',
	type: 'object',
	required: ['lockinModule'],
	properties: {
		lockingModule: {
			dataType: 'string',
			minLength: MIN_LENGTH_MODULE_NAME,
			maxLength: MAX_LENGTH_MODULE_NAME,
			pattern: '^[a-zA-Z0-9]*$',
			fieldNumber: 1,
		},
	},
};

export class UserStore extends BaseStore<UserStoreData> {
	public schema = userStoreSchema;

	public getKey(address: Buffer, tokenID: Buffer): Buffer {
		return Buffer.concat([address, tokenID]);
	}
}
