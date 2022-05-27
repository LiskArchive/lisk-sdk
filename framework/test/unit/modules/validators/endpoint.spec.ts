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
	const subStore = (new InMemoryKVStore() as unknown) as KVStore;
	const networkIdentifier = Buffer.alloc(0);

	beforeAll(async () => {
		validatorsModule = new ValidatorsModule();
	});

	describe('validateBLSKey', () => {
		describe('when request data is valid', () => {
			it('should resolve with false when key already exists', async () => {
				await subStore.put(pk, address);
				const batch = subStore.batch();
				batch.put(pk, address);
				await batch.write();
				getStore1.mockReturnValue(subStore);
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getImmutableAPIContext: jest.fn(),
						getStore: getStore1,
						logger,
						params: {
							proofOfPossession: proof.toString('hex'),
							blsKey: pk.toString('hex'),
						},
						networkIdentifier,
					}),
				).resolves.toStrictEqual({ valid: false });
			});

			it('should resolve with false when key does not exist but invalid proof of possession', async () => {
				getStore1.mockReturnValue(subStore);
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getStore: getStore1,
						getImmutableAPIContext: jest.fn(),
						logger,
						params: {
							proofOfPossession: proof.toString('hex'),
							blsKey: pk.toString('hex'),
						},
						networkIdentifier,
					}),
				).resolves.toStrictEqual({ valid: false });
			});

			it('should resolve with true when key does not exist and valid proof of possession', async () => {
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getStore: getStore1,
						getImmutableAPIContext: jest.fn(),
						logger,
						params: {
							proofOfPossession:
								'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26',
							blsKey:
								'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81',
						},
						networkIdentifier,
					}),
				).resolves.toStrictEqual({ valid: true });
			});
		});

		describe('when request data is invalid', () => {
			it('should reject with error with invalid request params', async () => {
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getStore: jest.fn(),
						getImmutableAPIContext: jest.fn(),
						logger,
						params: {
							invalid: 'schema',
						},
						networkIdentifier,
					}),
				).rejects.toThrow();
			});

			it('should reject with error when input parmas bytes are invalid', async () => {
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getStore: jest.fn(),
						getImmutableAPIContext: jest.fn(),
						logger,
						params: {
							proofOfPossession: 'xxxx',
							blsKey: 'xxxx',
						},
						networkIdentifier,
					}),
				).rejects.toThrow();
			});
		});
	});
});
