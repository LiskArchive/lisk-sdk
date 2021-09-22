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
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { StateStore } from '@liskhq/lisk-chain';
import { ValidatorsAPI, ValidatorsModule } from '../../../../src/modules/validators';
import {
	EMPTY_KEY,
	INVALID_BLS_KEY,
	STORE_PREFIX_BLS_KEYS,
	STORE_PREFIX_GENERATOR_LIST,
	STORE_PREFIX_GENESIS_DATA,
	STORE_PREFIX_VALIDATORS_DATA,
} from '../../../../src/modules/validators/constants';
import * as generatorList from '../../../fixtures/config/devnet/delegates_for_first_round.json';
import {
	generatorListSchema,
	genesisDataSchema,
	validatorAccountSchema,
} from '../../../../src/modules/validators/schemas';
import { APIContext } from '../../../../src/node/state_machine/api_context';
import { EventQueue } from '../../../../src/node/state_machine';

describe('ValidatorsModuleAPI', () => {
	let validatorsAPI: ValidatorsAPI;
	let validatorsModule: ValidatorsModule;
	let apiContext: APIContext;
	let stateStore: StateStore;
	let validatorsSubStore: StateStore;
	let blsKeysSubStore: StateStore;
	let generatorListSubStore: StateStore;
	let genesisDataSubStore: StateStore;
	const validatorsModuleID = 11;
	const genesisConfig: any = {};
	const moduleConfig: any = {
		blockTime: 10,
	};
	const generatorConfig: any = {};
	const blsKey = getRandomBytes(48);
	const address = getRandomBytes(48);
	const generatorKey = getRandomBytes(48);
	const proofOfPossession = getRandomBytes(48);
	const genesisTimestamp = 1610643809;
	const generatorListBuffer = generatorList.map(addr => Buffer.from(addr, 'hex'));

	beforeAll(async () => {
		validatorsModule = new ValidatorsModule();
		await validatorsModule.init({ genesisConfig, moduleConfig, generatorConfig });
	});

	beforeEach(() => {
		validatorsAPI = new ValidatorsAPI(validatorsModuleID);
		stateStore = new StateStore(new InMemoryKVStore());
		validatorsSubStore = stateStore.getStore(
			validatorsAPI['moduleID'],
			STORE_PREFIX_VALIDATORS_DATA,
		);
		blsKeysSubStore = stateStore.getStore(validatorsAPI['moduleID'], STORE_PREFIX_BLS_KEYS);
		generatorListSubStore = stateStore.getStore(
			validatorsAPI['moduleID'],
			STORE_PREFIX_GENERATOR_LIST,
		);
		genesisDataSubStore = stateStore.getStore(validatorsAPI['moduleID'], STORE_PREFIX_GENESIS_DATA);
	});

	describe('registerValidatorKeys', () => {
		it(`should be able to create new validator account if validator address does not exist, bls key is not registered and proof of possession is valid`, async () => {
			const proofOfPossession1 =
				'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26';
			const blsKey1 =
				'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81';
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(
				await validatorsModule.api.registerValidatorKeys(
					apiContext,
					address,
					Buffer.from(blsKey1, 'hex'),
					generatorKey,
					Buffer.from(proofOfPossession1, 'hex'),
				),
			).toBe(true);
		});

		it(`should not be able to create new validator account if validator address already exists, bls key is not registered and proof of possession is valid`, async () => {
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

			expect(
				await validatorsModule.api.registerValidatorKeys(
					apiContext,
					address,
					Buffer.from(blsKey1, 'hex'),
					generatorKey,
					Buffer.from(proofOfPossession1, 'hex'),
				),
			).toBe(false);
		});

		it(`should not be able to create new validator account if validator address does not exist, bls key is already registered and proof of possession is valid`, async () => {
			const proofOfPossession1 =
				'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26';
			const blsKey1 =
				'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81';
			const blsKeyBuffer = Buffer.from(blsKey1, 'hex');
			await blsKeysSubStore.set(blsKeyBuffer, address);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(
				await validatorsModule.api.registerValidatorKeys(
					apiContext,
					address,
					Buffer.from(blsKey1, 'hex'),
					generatorKey,
					Buffer.from(proofOfPossession1, 'hex'),
				),
			).toBe(false);
		});

		it(`should not be able to create new validator account if validator address does not exist, bls key is not registered and proof of possession is invalid`, async () => {
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
			expect(
				await validatorsModule.api.registerValidatorKeys(
					apiContext,
					address,
					blsKey,
					generatorKey,
					proofOfPossession,
				),
			).toBe(false);
		});
	});

	describe('setValidatorBLSKey', () => {
		it(`should be able to set bls key for validator if address exists, key is not registered and proof of possession is valid`, async () => {
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

			expect(
				await validatorsModule.api.setValidatorBLSKey(
					apiContext,
					address,
					Buffer.from(blsKey1, 'hex'),
					Buffer.from(proofOfPossession1, 'hex'),
				),
			).toBe(true);
		});

		it(`should not be able to set bls key for validator if address does not exist`, async () => {
			const proofOfPossession1 =
				'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26';
			const blsKey1 =
				'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81';
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(
				await validatorsModule.api.setValidatorBLSKey(
					apiContext,
					address,
					Buffer.from(blsKey1, 'hex'),
					Buffer.from(proofOfPossession1, 'hex'),
				),
			).toBe(false);
		});

		it(`should not be able to set bls key for validator if address exists but bls key is already registered`, async () => {
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await validatorsSubStore.setWithSchema(address, validatorAccount, validatorAccountSchema);
			await blsKeysSubStore.set(blsKey, address);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(
				await validatorsModule.api.setValidatorBLSKey(
					apiContext,
					address,
					blsKey,
					proofOfPossession,
				),
			).toBe(false);
		});

		it(`should not be able to set bls key for validator if address exists, key is not registered but proof of possession is invalid`, async () => {
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await validatorsSubStore.setWithSchema(address, validatorAccount, validatorAccountSchema);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(
				await validatorsModule.api.setValidatorBLSKey(
					apiContext,
					address,
					blsKey,
					proofOfPossession,
				),
			).toBe(false);
		});
	});

	describe('setValidatorGeneratorKey', () => {
		it(`should be able to set generator key for validator if address exists`, async () => {
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await validatorsSubStore.setWithSchema(address, validatorAccount, validatorAccountSchema);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(
				await validatorsModule.api.setValidatorGeneratorKey(apiContext, address, generatorKey),
			).toBe(true);
		});

		it(`should not be able to set generator key for validator if address does not exist`, async () => {
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(
				await validatorsModule.api.setValidatorGeneratorKey(apiContext, address, generatorKey),
			).toBe(false);
		});
	});

	describe('isKeyRegistered', () => {
		it(`should return true if bls key is already registered`, async () => {
			await blsKeysSubStore.set(blsKey, address);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(await validatorsModule.api.isKeyRegistered(apiContext, blsKey)).toBe(true);
		});

		it(`should return false if bls key is not registered`, async () => {
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(await validatorsModule.api.isKeyRegistered(apiContext, blsKey)).toBe(false);
		});
	});

	describe('getSlotNumber', () => {
		it(`should return if timestamp is greater than genesis block timestamp`, async () => {
			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(
				await validatorsModule.api.getSlotNumber(apiContext, genesisTimestamp + 100),
			).toBeNumber();
		});

		it(`should throw if timestamp is less than genesis block timestamp`, async () => {
			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.getSlotNumber(apiContext, genesisTimestamp - 100),
			).rejects.toThrow('Invalid timestamp');
		});
	});

	describe('getGeneratorAtTimestamp', () => {
		it(`should return if timestamp is greater than genesis block timestamp`, async () => {
			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			await generatorListSubStore.setWithSchema(
				EMPTY_KEY,
				{ addresses: generatorList.map(addr => Buffer.from(addr, 'hex')) },
				generatorListSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(
				await validatorsModule.api.getGeneratorAtTimestamp(apiContext, genesisTimestamp + 100),
			).toBeInstanceOf(Buffer);
		});

		it(`should throw if timestamp is less than genesis block timestamp`, async () => {
			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.getGeneratorAtTimestamp(apiContext, genesisTimestamp - 100),
			).rejects.toThrow('Invalid timestamp');
		});
	});

	describe('getGeneratorsBetweenTimestamps', () => {
		it(`should be able to return if input timestamps are valid`, async () => {
			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			await generatorListSubStore.setWithSchema(
				EMPTY_KEY,
				{ addresses: generatorList.map(addr => Buffer.from(addr, 'hex')) },
				generatorListSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(
				await validatorsModule.api.getGeneratorsBetweenTimestamps(
					apiContext,
					genesisTimestamp + 10,
					genesisTimestamp + 50,
				),
			).toBeObject();
		});

		it(`should throw if input timestamps are invalid`, async () => {
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.getGeneratorsBetweenTimestamps(
					apiContext,
					genesisTimestamp + 10,
					genesisTimestamp + 1,
				),
			).rejects.toThrow('Invalid timestamps');
		});

		it(`should throw if input timestamp is less than genesis timestamp`, async () => {
			await genesisDataSubStore.setWithSchema(
				EMPTY_KEY,
				{ timestamp: genesisTimestamp },
				genesisDataSchema,
			);
			await generatorListSubStore.setWithSchema(
				EMPTY_KEY,
				{ addresses: generatorList.map(addr => Buffer.from(addr, 'hex')) },
				generatorListSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			await expect(
				validatorsModule.api.getGeneratorsBetweenTimestamps(
					apiContext,
					genesisTimestamp - 100,
					genesisTimestamp + 1,
				),
			).rejects.toThrow('Invalid timestamp');
		});
	});

	describe('setGeneratorList', () => {
		it(`should be able to set the generator list if all input addresses are already registered in validators substore`, async () => {
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await Promise.all(
				generatorListBuffer.map(async addr =>
					validatorsSubStore.setWithSchema(addr, validatorAccount, validatorAccountSchema),
				),
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(await validatorsModule.api.setGeneratorList(apiContext, generatorListBuffer)).toBe(
				true,
			);
		});

		it(`should not be able to set the generator list if some input address is not registered in validators substore`, async () => {
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await Promise.all(
				generatorListBuffer.map(async addr =>
					validatorsSubStore.setWithSchema(addr, validatorAccount, validatorAccountSchema),
				),
			);
			await validatorsSubStore.del(Buffer.from(generatorList[1], 'hex'));
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });

			expect(await validatorsModule.api.setGeneratorList(apiContext, generatorListBuffer)).toBe(
				false,
			);
		});
	});
});
