/*
 * Copyright © 2021 Lisk Foundation
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

import { NotFoundError } from '@liskhq/lisk-chain';
import { BaseAPI } from '../base_api';
import { ImmutableAPIContext } from '../../state_machine';
import { AuthAccount, AuthAccountStore } from './stores/auth_account';

export class AuthAPI extends BaseAPI {
	public async getAuthAccount(
		apiContext: ImmutableAPIContext,
		address: Buffer,
	): Promise<AuthAccount> {
		const authDataStore = this.stores.get(AuthAccountStore);
		try {
			const authData = await authDataStore.get(apiContext, address);

			return authData;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}

			return { nonce: BigInt(0), numberOfSignatures: 0, mandatoryKeys: [], optionalKeys: [] };
		}
	}
}
