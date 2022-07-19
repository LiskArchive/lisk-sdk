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
import { AuthAPI } from '../../../../src/modules/auth/api';
import { STORE_PREFIX_AUTH, MODULE_ID_AUTH_BUFFER } from '../../../../src/modules/auth/constants';
import { authAccountSchema } from '../../../../src/modules/auth/schemas';
import { APIContext } from '../../../../src/state_machine';
import { SubStore } from '../../../../src/state_machine/types';
import { createTransientAPIContext } from '../../../../src/testing';

describe('AuthAPI', () => {
	let authAPI: AuthAPI;
	let context: APIContext;
	let authStore: SubStore;
	const address = Buffer.from('fa1c00809ff1b10cd269a711eef40a465ba4a9cb', 'hex');
	const expectedAuthData = {
		nonce: 1,
		numberOfSignatures: 1,
		mandatoryKeys: [utils.getRandomBytes(64), utils.getRandomBytes(64)],
		optionalKeys: [utils.getRandomBytes(64), utils.getRandomBytes(64)],
	};

	beforeEach(async () => {
		authAPI = new AuthAPI(MODULE_ID_AUTH_BUFFER);
		context = createTransientAPIContext({});
		authStore = context.getStore(authAPI['moduleID'], STORE_PREFIX_AUTH);
		await authStore.setWithSchema(address, expectedAuthData, authAccountSchema);
	});

	describe('getAuthAccount', () => {
		it('should return valid auth data given address in db', async () => {
			const authData = await authAPI.getAuthAccount(context, address);

			expect(authData).toHaveProperty('nonce', BigInt(expectedAuthData.nonce));
			expect(authData).toHaveProperty('numberOfSignatures', expectedAuthData.numberOfSignatures);
			expect(authData).toHaveProperty('mandatoryKeys', expectedAuthData.mandatoryKeys);
			expect(authData).toHaveProperty('optionalKeys', expectedAuthData.optionalKeys);
		});

		it('should return empty object given address not in db', async () => {
			const authData = await authAPI.getAuthAccount(context, utils.getRandomBytes(20));

			expect(authData).toHaveProperty('nonce', BigInt(0));
			expect(authData).toHaveProperty('numberOfSignatures', 0);
			expect(authData).toHaveProperty('mandatoryKeys', []);
			expect(authData).toHaveProperty('optionalKeys', []);
		});
	});
});
