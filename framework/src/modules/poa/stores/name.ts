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
import { NUM_BYTES_ADDRESS } from '../constants';

export interface ValidatorAddress {
	address: Buffer;
}

export const validatorAddressSchema = {
	$id: '/poa/validatorAddress',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: NUM_BYTES_ADDRESS,
			maxLength: NUM_BYTES_ADDRESS,
		},
	},
};

export class NameStore extends BaseStore<ValidatorAddress> {
	public schema = validatorAddressSchema;
}
