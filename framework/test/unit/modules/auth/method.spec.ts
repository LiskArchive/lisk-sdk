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

import { utils } from '@liskhq/lisk-cryptography';
import { AuthModule } from '../../../../src/modules/auth';
import { AuthMethod } from '../../../../src/modules/auth/method';
import { AuthAccountStore } from '../../../../src/modules/auth/stores/auth_account';
import { MethodContext } from '../../../../src/state_machine';
import { createTransientMethodContext } from '../../../../src/testing';

describe('AuthMethod', () => {
	let authMethod: AuthMethod;
	let context: MethodContext;
	let authStore: AuthAccountStore;
	const address = Buffer.from('fa1c00809ff1b10cd269a711eef40a465ba4a9cb', 'hex');
	const expectedAuthData = {
		nonce: BigInt(1),
		numberOfSignatures: 1,
		mandatoryKeys: [utils.getRandomBytes(64), utils.getRandomBytes(64)],
		optionalKeys: [utils.getRandomBytes(64), utils.getRandomBytes(64)],
	};

	beforeEach(async () => {
		const module = new AuthModule();
		authMethod = new AuthMethod(module.stores, module.events);
		context = createTransientMethodContext({});
		authStore = module.stores.get(AuthAccountStore);
		await authStore.set(context, address, expectedAuthData);
	});

	describe('getAuthAccount', () => {
		it('should return valid auth data given address in db', async () => {
			const authData = await authMethod.getAuthAccount(context, address);

			expect(authData).toHaveProperty('nonce', BigInt(expectedAuthData.nonce));
			expect(authData).toHaveProperty('numberOfSignatures', expectedAuthData.numberOfSignatures);
			expect(authData).toHaveProperty('mandatoryKeys', expectedAuthData.mandatoryKeys);
			expect(authData).toHaveProperty('optionalKeys', expectedAuthData.optionalKeys);
		});

		it('should return empty object given address not in db', async () => {
			const authData = await authMethod.getAuthAccount(context, utils.getRandomBytes(20));

			expect(authData).toHaveProperty('nonce', BigInt(0));
			expect(authData).toHaveProperty('numberOfSignatures', 0);
			expect(authData).toHaveProperty('mandatoryKeys', []);
			expect(authData).toHaveProperty('optionalKeys', []);
		});
	});
});
