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
import { CHAIN_ID_LENGTH } from '../../token/constants';

export interface OwnChainAccount {
	name: string;
	chainID: Buffer;
	nonce: bigint;
}

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#own-chain-data
export const ownChainAccountSchema = {
	$id: '/modules/interoperability/ownChainAccount',
	type: 'object',
	required: ['name', 'chainID', 'nonce'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
		},
		chainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 2,
		},
		nonce: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
	},
};

export class OwnChainAccountStore extends BaseStore<OwnChainAccount> {
	public schema = ownChainAccountSchema;

	public get storePrefix(): Buffer {
		return Buffer.from([0x83, 0xed, 0x0d, 0x25]);
	}
}
