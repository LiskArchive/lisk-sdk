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
import { BaseMethod } from '../base_method';
import { ImmutableMethodContext } from '../../state_machine';
import { AuthAccount, AuthAccountStore } from './stores/auth_account';

export class AuthMethod extends BaseMethod {
	public async getAuthAccount(
		methodContext: ImmutableMethodContext,
		address: Buffer,
	): Promise<AuthAccount> {
		const authDataStore = this.stores.get(AuthAccountStore);
		try {
			const authData = await authDataStore.get(methodContext, address);

			return authData;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}

			return { nonce: BigInt(0), numberOfSignatures: 0, mandatoryKeys: [], optionalKeys: [] };
		}
	}
}
