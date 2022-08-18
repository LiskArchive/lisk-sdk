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
import { ValidatorsAPI, ValidatorsModule } from '../../../../src/modules/validators';
import {
	EMPTY_KEY,
	INVALID_BLS_KEY,
	STORE_PREFIX_BLS_KEYS,
	STORE_PREFIX_GENESIS_DATA,
	STORE_PREFIX_VALIDATORS_DATA,
} from '../../../../src/modules/validators/constants';
import * as generatorList from '../../../fixtures/config/devnet/delegates_for_first_round.json';
import {
	genesisDataSchema,
	validatorAccountSchema,
} from '../../../../src/modules/validators/schemas';
import { APIContext, createNewAPIContext } from '../../../../src/state_machine/api_context';
import { EventQueue } from '../../../../src/state_machine';
import { ValidatorKeys } from '../../../../src/modules/validators/types';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';

describe('ValidatorsModuleAPI', () => {
	let validatorsAPI: ValidatorsAPI;
	let validatorsModule: ValidatorsModule;
	let apiContext: APIContext;
	let stateStore: PrefixedStateReadWriter;
	let validatorsSubStore: PrefixedStateReadWriter;
	let blsKeysSubStore: PrefixedStateReadWriter;
	let genesisDataSubStore: PrefixedStateReadWriter;
	const genesisConfig: any = {};
	const moduleConfig: any = {
		blockTime: 10,
	};
	const generatorConfig: any = {};
	const blsKey = utils.getRandomBytes(48);
	const address = utils.getRandomBytes(48);
	const generatorKey = utils.getRandomBytes(48);
	const proofOfPossession = utils.getRandomBytes(48);
	const genesisTimestamp = 1610643809;

	beforeAll(async () => {
		validatorsModule = new ValidatorsModule();
		await validatorsModule.init({ genesisConfig, moduleConfig, generatorConfig });
	});

	beforeEach(() => {
		validatorsAPI = new ValidatorsAPI('validators');
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		validatorsSubStore = stateStore.getStore(
			validatorsAPI['moduleID'],
			STORE_PREFIX_VALIDATORS_DATA,
		);
		blsKeysSubStore = stateStore.getStore(validatorsAPI['moduleID'], STORE_PREFIX_BLS_KEYS);
		genesisDataSubStore = stateStore.getStore(validatorsAPI['moduleID'], STORE_PREFIX_GENESIS_DATA);
	});

	describe('registerValidatorKeys', () => {
		it('should be able to create new validator account if validator address does not exist, bls key is not registered and proof of possession is valid', async () => {
			const proofOfPossession1 =
				'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26';
			const blsKey1 =
				'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81';
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.registerValidatorKeys(
					apiContext,
					address,
					Buffer.from(blsKey1, 'hex'),
					generatorKey,
					Buffer.from(proofOfPossession1, 'hex'),
				),
			).resolves.toBe(true);
		});

		it('should not be able to create new validator account if validator address already exists, bls key is not registered and proof of possession is valid', async () => {
			const proofOfPossession1 =
				'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26';
			const blsKey1 =
				'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81';
			const blsKeyBuffer = Buffer.from(blsKey1, 'hex');
			const validatorAccount = {
				generatorKey,
				blsKeyBuffer,
			};
			await validatorsSubStore.setWithSchema(address, validatorAccount, validatorAccountSchema);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.registerValidatorKeys(
					apiContext,
					address,
					Buffer.from(blsKey1, 'hex'),
					generatorKey,
					Buffer.from(proofOfPossession1, 'hex'),
				),
			).resolves.toBe(false);
		});

		it('should not be able to create new validator account if validator address does not exist, bls key is already registered and proof of possession is valid', async () => {
			const proofOfPossession1 =
				'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26';
			const blsKey1 =
				'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81';
			const blsKeyBuffer = Buffer.from(blsKey1, 'hex');
			await blsKeysSubStore.set(blsKeyBuffer, address);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.registerValidatorKeys(
					apiContext,
					address,
					Buffer.from(blsKey1, 'hex'),
					generatorKey,
					Buffer.from(proofOfPossession1, 'hex'),
				),
			).resolves.toBe(false);
		});

		it('should not be able to create new validator account if validator address does not exist, bls key is not registered and proof of possession is invalid', async () => {
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
			await expect(
				validatorsModule.api.registerValidatorKeys(
					apiContext,
					address,
					blsKey,
					generatorKey,
					proofOfPossession,
				),
			).resolves.toBe(false);
		});
	});

	describe('setValidatorBLSKey', () => {
		it('should be able to correctly set bls key for validator if address exists, key is not registered and proof of possession is valid', async () => {
			const proofOfPossession1 =
				'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26';
			const blsKey1 =
				'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81';
			const validatorAccount = {
				generatorKey,
				blsKey: INVALID_BLS_KEY,
			};
			await validatorsSubStore.setWithSchema(address, validatorAccount, validatorAccountSchema);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			const isSet = await validatorsModule.api.setValidatorBLSKey(
				apiContext,
				address,
				Buffer.from(blsKey1, 'hex'),
				Buffer.from(proofOfPossession1, 'hex'),
			);

			const setValidatorAccount = await validatorsSubStore.getWithSchema<ValidatorKeys>(
				address,
				validatorAccountSchema,
			);

			const hasKey = await blsKeysSubStore.has(Buffer.from(blsKey1, 'hex'));

			expect(isSet).toBe(true);
			expect(setValidatorAccount.blsKey.toString('hex')).toBe(blsKey1);
			expect(hasKey).toBe(true);
		});

		it('should not be able to set bls key for validator if address does not exist', async () => {
			const proofOfPossession1 =
				'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26';
			const blsKey1 =
				'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81';
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.setValidatorBLSKey(
					apiContext,
					address,
					Buffer.from(blsKey1, 'hex'),
					Buffer.from(proofOfPossession1, 'hex'),
				),
			).resolves.toBe(false);
		});

		it('should not be able to set bls key for validator if address exists but bls key is already registered', async () => {
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await validatorsSubStore.setWithSchema(address, validatorAccount, validatorAccountSchema);
			await blsKeysSubStore.set(blsKey, address);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.setValidatorBLSKey(apiContext, address, blsKey, proofOfPossession),
			).resolves.toBe(false);
		});

		it('should not be able to set bls key for validator if address exists, key is not registered but proof of possession is invalid', async () => {
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await validatorsSubStore.setWithSchema(address, validatorAccount, validatorAccountSchema);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.setValidatorBLSKey(apiContext, address, blsKey, proofOfPossession),
			).resolves.toBe(false);
		});
	});

	describe('setValidatorGeneratorKey', () => {
		it('should be able to correctly set generator key for validator if address exists', async () => {
			const generatorKey1 = utils.getRandomBytes(48);
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await validatorsSubStore.setWithSchema(address, validatorAccount, validatorAccountSchema);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			const isSet = await validatorsModule.api.setValidatorGeneratorKey(
				apiContext,
				address,
				generatorKey1,
			);
			const setValidatorAccount = await validatorsSubStore.getWithSchema<ValidatorKeys>(
				address,
				validatorAccountSchema,
			);

			expect(isSet).toBe(true);
			expect(setValidatorAccount.generatorKey.equals(generatorKey1)).toBe(true);
		});

		it('should not be able to set generator key for validator if address does not exist', async () => {
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.setValidatorGeneratorKey(apiContext, address, generatorKey),
			).resolves.toBe(false);
		});
	});

	describe('isKeyRegistered', () => {
		it('should return true if bls key is already registered', async () => {
			await blsKeysSubStore.set(blsKey, address);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(validatorsModule.api.isKeyRegistered(apiContext, blsKey)).resolves.toBe(true);
		});

		it('should return false if bls key is not registered', async () => {
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(validatorsModule.api.isKeyRegistered(apiContext, blsKey)).resolves.toBe(false);
		});
	});

	describe('getGeneratorsBetweenTimestamps', () => {
		it('should be able to return if input timestamps are valid', async () => {
			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.getGeneratorsBetweenTimestamps(
					apiContext,
					genesisTimestamp + 5,
					genesisTimestamp + 1834,
					generatorList.map(addr => ({ address: Buffer.from(addr, 'hex') })),
				),
			).resolves.toBeObject();
		});

		it('should be able to return generators with at least one generator assigned more than one slot if input timestamps are valid and difference between input timestamps is greater than one round', async () => {
			const blockTime = 10;
			const validatorsPerRound = 101;
			const timePerRound = validatorsPerRound * blockTime;

			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			const result = await validatorsModule.api.getGeneratorsBetweenTimestamps(
				apiContext,
				genesisTimestamp,
				genesisTimestamp + timePerRound + 2 * blockTime + 1,
				generatorList.map(addr => ({ address: Buffer.from(addr, 'hex') })),
			);
			let genWithCountGreaterThanOne = 0;
			for (const generatorAddress of Object.keys(result)) {
				if (result[generatorAddress] > 1) {
					genWithCountGreaterThanOne += 1;
				}
			}

			expect(genWithCountGreaterThanOne).toBeGreaterThan(0);
		});

		it('should be able to return with all generators assigned at least 2 slots and at least one generator assigned more than 2 slots if input timestamps are valid and difference between input timestamps is greater than 2 rounds', async () => {
			const blockTime = 10;
			const validatorsPerRound = 101;
			const timePerRound = validatorsPerRound * blockTime;

			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			const result = await validatorsModule.api.getGeneratorsBetweenTimestamps(
				apiContext,
				genesisTimestamp,
				genesisTimestamp + timePerRound * 2 + 2 * blockTime + 1,
				generatorList.map(addr => ({ address: Buffer.from(addr, 'hex') })),
			);

			let genWithCountGreaterThanOne = 0;
			for (const generatorAddress of Object.keys(result)) {
				if (result[generatorAddress] > 1) {
					genWithCountGreaterThanOne += 1;
				}
			}

			let genWithCountGreaterThanTwo = 0;
			for (const generatorAddress of Object.keys(result)) {
				if (result[generatorAddress] > 2) {
					genWithCountGreaterThanTwo += 1;
				}
			}

			expect(generatorList).toHaveLength(genWithCountGreaterThanOne);
			expect(genWithCountGreaterThanTwo).toBeGreaterThan(0);
		});

		it('should be able to return no generator if input timestamps are valid and difference between input timestamps is zero', async () => {
			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			const result = await validatorsModule.api.getGeneratorsBetweenTimestamps(
				apiContext,
				genesisTimestamp,
				genesisTimestamp,
				generatorList.map(addr => ({ address: Buffer.from(addr, 'hex') })),
			);

			expect(Object.keys(result)).toHaveLength(0);
		});

		it('should be able to return no generator if input timestamps are valid and difference between input timestamps is less than block time ', async () => {
			const blockTime = 10;

			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			const result = await validatorsModule.api.getGeneratorsBetweenTimestamps(
				apiContext,
				genesisTimestamp,
				genesisTimestamp + blockTime - 1,
				generatorList.map(addr => ({ address: Buffer.from(addr, 'hex') })),
			);

			expect(Object.keys(result)).toHaveLength(0);
		});

		it('should be able to return no generator if input timestamps are valid and difference between input timestamps is equal to block time ', async () => {
			const blockTime = 10;

			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			const result = await validatorsModule.api.getGeneratorsBetweenTimestamps(
				apiContext,
				genesisTimestamp,
				genesisTimestamp + blockTime,
				generatorList.map(addr => ({ address: Buffer.from(addr, 'hex') })),
			);

			expect(Object.keys(result)).toHaveLength(0);
		});

		it('should throw if input timestamps are invalid', async () => {
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.getGeneratorsBetweenTimestamps(
					apiContext,
					genesisTimestamp + 10,
					genesisTimestamp + 1,
					generatorList.map(addr => ({ address: Buffer.from(addr, 'hex') })),
				),
			).rejects.toThrow('End timestamp must be greater than start timestamp.');
		});

		it('should throw if input timestamp is less than genesis timestamp', async () => {
			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.getGeneratorsBetweenTimestamps(
					apiContext,
					genesisTimestamp - 100,
					genesisTimestamp + 1,
					generatorList.map(addr => ({ address: Buffer.from(addr, 'hex') })),
				),
			).rejects.toThrow('Input timestamp must be greater than genesis timestamp.');
		});

		it('should return empty result when startSlotNumber is lower than endSlotNumber but in the same block slot', async () => {
			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.getGeneratorsBetweenTimestamps(
					apiContext,
					genesisTimestamp + 2,
					genesisTimestamp + 3,
					generatorList.map(addr => ({ address: Buffer.from(addr, 'hex') })),
				),
			).resolves.toEqual({});
		});

		it('should return empty result when startSlotNumber equals endSlotNumber but in the same block slot', async () => {
			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.getGeneratorsBetweenTimestamps(
					apiContext,
					genesisTimestamp + 2,
					genesisTimestamp + 2,
					generatorList.map(addr => ({ address: Buffer.from(addr, 'hex') })),
				),
			).resolves.toEqual({});
		});
	});

	describe('getValidatorAccount', () => {
		const validAddress = utils.getRandomBytes(20);
		let validatorAccount: ValidatorKeys;
		beforeEach(async () => {
			apiContext = createNewAPIContext(new InMemoryPrefixedStateDB());

			validatorAccount = {
				generatorKey: utils.getRandomBytes(48),
				blsKey: utils.getRandomBytes(32),
			};

			const validatorsStore = apiContext.getStore(
				validatorsAPI['moduleID'],
				STORE_PREFIX_VALIDATORS_DATA,
			);
			await validatorsStore.setWithSchema(validAddress, validatorAccount, validatorAccountSchema);
		});

		it('should get validator from store', async () => {
			const receivedValidatorAccount = await validatorsAPI.getValidatorAccount(
				apiContext,
				validAddress,
			);
			expect(receivedValidatorAccount).toEqual(validatorAccount);
		});

		it('should throw when address length is not 20', async () => {
			const invalidAddress = utils.getRandomBytes(19);
			await expect(validatorsAPI.getValidatorAccount(apiContext, invalidAddress)).rejects.toThrow(
				'Address is not valid',
			);
		});
	});
});
