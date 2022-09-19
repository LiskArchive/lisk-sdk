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

import { utils, address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { Logger } from '../../../../src/logger';
import { ValidatorsModule } from '../../../../src/modules/validators';
import { BLSKeyStore } from '../../../../src/modules/validators/stores/bls_keys';
import { ValidatorKeysStore } from '../../../../src/modules/validators/stores/validator_keys';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { fakeLogger } from '../../../utils/mocks';

describe('ValidatorsModuleEndpoint', () => {
	const logger: Logger = fakeLogger;
	let validatorsModule: ValidatorsModule;
	let stateStore: PrefixedStateReadWriter;
	const pk = utils.getRandomBytes(48);
	const address = utils.getRandomBytes(48);
	const proof = utils.getRandomBytes(48);
	const chainID = Buffer.alloc(0);
	const validatorAddress = utils.getRandomBytes(20);
	const blsKey = utils.getRandomBytes(48);
	const generatorKey = utils.getRandomBytes(32);

	beforeAll(() => {
		validatorsModule = new ValidatorsModule();
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
	});

	describe('validateBLSKey', () => {
		describe('when request data is valid', () => {
			it('should resolve with false when key already exists', async () => {
				const context = {
					getImmutableMethodContext: jest.fn(),
					getStore: (p1: Buffer, p2: Buffer) => stateStore.getStore(p1, p2),
					getOffchainStore: jest.fn(),
					logger,
					params: {
						proofOfPossession: proof.toString('hex'),
						blsKey: pk.toString('hex'),
					},
					chainID,
				};

				await validatorsModule.stores.get(BLSKeyStore).set(context, pk, { address });

				await expect(validatorsModule.endpoint.validateBLSKey(context)).resolves.toStrictEqual({
					valid: false,
				});
			});

			it('should resolve with false when key does not exist but invalid proof of possession', async () => {
				const context = {
					getImmutableMethodContext: jest.fn(),
					getStore: (p1: Buffer, p2: Buffer) => stateStore.getStore(p1, p2),
					getOffchainStore: jest.fn(),
					logger,
					params: {
						proofOfPossession: proof.toString('hex'),
						blsKey: pk.toString('hex'),
					},
					chainID,
				};
				await expect(validatorsModule.endpoint.validateBLSKey(context)).resolves.toStrictEqual({
					valid: false,
				});
			});

			it('should resolve with true when key does not exist and valid proof of possession', async () => {
				const context = {
					getStore: (p1: Buffer, p2: Buffer) => stateStore.getStore(p1, p2),
					getImmutableMethodContext: jest.fn(),
					getOffchainStore: jest.fn(),
					logger,
					params: {
						proofOfPossession:
							'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26',
						blsKey:
							'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81',
					},
					chainID,
				};
				await expect(validatorsModule.endpoint.validateBLSKey(context)).resolves.toStrictEqual({
					valid: true,
				});
			});
		});

		describe('when request data is invalid', () => {
			it('should reject with error with invalid request params', async () => {
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getStore: jest.fn(),
						getImmutableMethodContext: jest.fn(),
						logger,
						params: {
							invalid: 'schema',
						},
						chainID,
						getOffchainStore: jest.fn(),
					}),
				).rejects.toThrow();
			});

			it('should reject with error when input parmas bytes are invalid', async () => {
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getStore: jest.fn(),
						getImmutableMethodContext: jest.fn(),
						logger,
						params: {
							proofOfPossession: 'xxxx',
							blsKey: 'xxxx',
						},
						chainID,
						getOffchainStore: jest.fn(),
					}),
				).rejects.toThrow();
			});
		});
	});

	describe('getValidator', () => {
		const context = {
			getImmutableMethodContext: jest.fn(),
			getStore: (p1: Buffer, p2: Buffer) => stateStore.getStore(p1, p2),
			getOffchainStore: jest.fn(),
			logger,
			params: {
				address: cryptoAddress.getLisk32AddressFromAddress(validatorAddress),
			},
			chainID,
		};

		it('should resolve with undefined when validator does not exist', async () => {
			await expect(validatorsModule.endpoint.getValidator(context)).resolves.toStrictEqual({
				generatorKey: '',
				blsKey: '',
			});
		});

		it('should resolve with validator keys when validator exists', async () => {
			await validatorsModule.stores
				.get(ValidatorKeysStore)
				.set(context, validatorAddress, { blsKey, generatorKey });
			await expect(validatorsModule.endpoint.getValidator(context)).resolves.toStrictEqual({
				generatorKey: generatorKey.toString('hex'),
				blsKey: blsKey.toString('hex'),
			});
		});
	});
});
