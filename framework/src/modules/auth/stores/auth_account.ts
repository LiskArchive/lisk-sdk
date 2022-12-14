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
import { NotFoundError } from '@liskhq/lisk-db';
import { BaseStore, ImmutableStoreGetter } from '../../base_store';
import { ED25519_PUBLIC_KEY_LENGTH, MAX_NUMBER_OF_SIGNATURES } from '../constants';

export interface AuthAccount {
	nonce: bigint;
	numberOfSignatures: number;
	mandatoryKeys: Buffer[];
	optionalKeys: Buffer[];
}

export const authAccountSchema = {
	$id: '/auth/account',
	type: 'object',
	properties: {
		nonce: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
		numberOfSignatures: {
			dataType: 'uint32',
			fieldNumber: 2,
			minimum: 0,
			maximum: MAX_NUMBER_OF_SIGNATURES,
		},
		mandatoryKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_PUBLIC_KEY_LENGTH,
				maxLength: ED25519_PUBLIC_KEY_LENGTH,
			},
			minItems: 0,
			maxItems: MAX_NUMBER_OF_SIGNATURES,
			fieldNumber: 3,
		},
		optionalKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_PUBLIC_KEY_LENGTH,
				maxLength: ED25519_PUBLIC_KEY_LENGTH,
			},
			minItems: 0,
			maxItems: MAX_NUMBER_OF_SIGNATURES,
			fieldNumber: 4,
		},
	},
	required: ['nonce', 'numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
};

export class AuthAccountStore extends BaseStore<AuthAccount> {
	public schema = authAccountSchema;

	public async getOrDefault(context: ImmutableStoreGetter, address: Buffer) {
		try {
			const authAccount = await this.get(context, address);
			return authAccount;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}

			return {
				nonce: BigInt(0),
				numberOfSignatures: 0,
				mandatoryKeys: [],
				optionalKeys: [],
			};
		}
	}

	public async isMultisignatureAccount(
		context: ImmutableStoreGetter,
		address: Buffer,
	): Promise<boolean> {
		try {
			const authAccount = await this.get(context, address);

			return authAccount.numberOfSignatures !== 0;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return false;
		}
	}
}
