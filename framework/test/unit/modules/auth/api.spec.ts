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

import { AuthAPI } from '../../../../src/modules/auth/api';
import { STORE_PREFIX_AUTH } from '../../../../src/modules/auth/constants';
import { authAccountSchema } from '../../../../src/modules/auth/schemas';
import { createTransientAPIContext } from '../../../../src/testing';

describe('AuthAPI', () => {
	let authAPI: AuthAPI;
	let context: any;
	let authStore: any;
	const address = Buffer.from('fa1c00809ff1b10cd269a711eef40a465ba4a9cb', 'hex');

	beforeEach(async () => {
		authAPI = new AuthAPI(1);
		context = createTransientAPIContext({});
		authStore = context.getStore(authAPI['moduleID'], STORE_PREFIX_AUTH);
		await authStore.setWithSchema(
			address,
			{
				nonce: 1,
				numberOfSignatures: 1,
				mandatoryKeys: [],
				optionalKeys: [],
			},
			authAccountSchema,
		);
	});

	describe('getAuthAccount', () => {
		it('should return valid auth data given address in db', async () => {
			const authData = await authAPI.getAuthAccount(context, address);

			expect(authData).toHaveProperty('nonce', BigInt(1));
			expect(authData).toHaveProperty('numberOfSignatures', 1);
			expect(authData).toHaveProperty('mandatoryKeys', []);
			expect(authData).toHaveProperty('optionalKeys', []);
		});

		it('should return empty object given address not in db', async () => {
			const authData = await authAPI.getAuthAccount(context, Buffer.from('invalid', 'utf8'));

			expect(authData).toEqual({});
		});
	});
});
