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

import { utils } from '@liskhq/lisk-cryptography';
import { Modules } from '../../../../../src';
import { AuthAccount, AuthAccountStore } from '../../../../../src/modules/auth/stores/auth_account';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('AuthAccountStore', () => {
	const address = utils.getRandomBytes(20);
	const authAccount: AuthAccount = {
		nonce: BigInt(3),
		numberOfSignatures: 2,
		mandatoryKeys: [utils.getRandomBytes(64)],
		optionalKeys: [utils.getRandomBytes(64), utils.getRandomBytes(64)],
	};

	let authAccountStore: AuthAccountStore;
	let context: Modules.StoreGetter;

	beforeEach(async () => {
		authAccountStore = new AuthAccountStore('auth', 0);
		const db = new InMemoryPrefixedStateDB();
		const stateStore = new PrefixedStateReadWriter(db);
		context = createStoreGetter(stateStore);
		await authAccountStore.set(context, address, authAccount);
	});

	describe('getOrDefault', () => {
		it('should return existing account from the store', async () => {
			const account = await authAccountStore.getOrDefault(context, address);

			expect(account).toEqual<AuthAccount>(authAccount);
		});

		it('should return a new account for an address not previously registered in the store', async () => {
			const newAccount: AuthAccount = {
				nonce: BigInt(0),
				numberOfSignatures: 0,
				mandatoryKeys: [],
				optionalKeys: [],
			};

			const account = await authAccountStore.getOrDefault(context, utils.getRandomBytes(20));

			expect(account).toEqual<AuthAccount>(newAccount);
		});
	});
});
