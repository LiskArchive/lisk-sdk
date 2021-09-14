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

import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { Logger } from '../../../../src/logger';
import { ValidatorsModule } from '../../../../src/modules/validators';
import { fakeLogger } from '../../../utils/node';

describe('ValidatorsModuleEndpoint', () => {
	const logger: Logger = fakeLogger;
	let validatorsModule: ValidatorsModule;
	const pk = getRandomBytes(48);
	const address = getRandomBytes(48);
	const proof = getRandomBytes(48);
	const getStore1 = jest.fn();

	beforeAll(async () => {
		validatorsModule = new ValidatorsModule();
		const subStore = (new InMemoryKVStore() as unknown) as KVStore;
		await subStore.put(pk, address);
		const batch = subStore.batch();
		batch.put(pk, address);
		await batch.write();
		getStore1.mockReturnValue(subStore);
	});

	describe('validateBLSKey', () => {
		describe('when request data is valid', () => {
			it('should resolve with appropriate response', async () => {
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getStore: getStore1,
						logger,
						params: {
							proofOfPossession: proof,
							blsKey: pk,
						},
					}),
				).resolves.toStrictEqual({ valid: false });
			});
		});

		describe('when request data is invalid', () => {
			it('should reject with error', async () => {
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getStore: jest.fn(),
						logger,
						params: {
							invalid: 'schema',
						},
					}),
				).rejects.toThrow();
			});

			it('should reject with error when input parmas bytes are invalid', async () => {
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getStore: jest.fn(),
						logger,
						params: {
							proofOfPossession: 'xxxx',
							blsKey: 'xxxx',
						},
					}),
				).rejects.toThrow();
			});
		});
	});
});
