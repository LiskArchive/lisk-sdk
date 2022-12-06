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

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { ValidatorsMethod, ValidatorsModule } from '../../../../src/modules/validators';
import {
	MODULE_NAME_VALIDATORS,
	EMPTY_KEY,
	INVALID_BLS_KEY,
	KeyRegResult,
} from '../../../../src/modules/validators/constants';
import * as generatorList from '../../../fixtures/config/devnet/validators_for_first_round.json';
import {
	MethodContext,
	createNewMethodContext,
} from '../../../../src/state_machine/method_context';
import { EventQueue } from '../../../../src/state_machine';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import {
	ValidatorKeys,
	ValidatorKeysStore,
} from '../../../../src/modules/validators/stores/validator_keys';
import { BLSKeyStore } from '../../../../src/modules/validators/stores/bls_keys';
import {
	generatorKeyRegDataSchema,
	GeneratorKeyRegistrationEvent,
} from '../../../../src/modules/validators/events/generator_key_registration';
import {
	blsKeyRegDataSchema,
	BLSKeyRegistrationEvent,
} from '../../../../src/modules/validators/events/bls_key_registration';
import { ValidatorsParamsStore } from '../../../../src/modules/validators/stores/validators_params';

describe('ValidatorsModuleMethod', () => {
	let validatorsMethod: ValidatorsMethod;
	let validatorsModule: ValidatorsModule;
	let methodContext: MethodContext;
	let stateStore: PrefixedStateReadWriter;
	let validatorsSubStore: ValidatorKeysStore;
	let blsKeysSubStore: BLSKeyStore;
	let validatorsParamsSubStore: ValidatorsParamsStore;
	const blockTime = 10;
	const genesisConfig: any = {};
	const moduleConfig: any = {
		blockTime,
	};
	const address = utils.getRandomBytes(48);
	const generatorKey = utils.getRandomBytes(48);
	const proofOfPossession = Buffer.from(
		'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26',
		'hex',
	);
	const blsKey = Buffer.from(
		'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81',
		'hex',
	);
	beforeAll(async () => {
		validatorsModule = new ValidatorsModule();
		await validatorsModule.init({ genesisConfig, moduleConfig });
	});

	beforeEach(() => {
		validatorsMethod = new ValidatorsMethod(validatorsModule.stores, validatorsModule.events);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		validatorsSubStore = validatorsModule.stores.get(ValidatorKeysStore);
		blsKeysSubStore = validatorsModule.stores.get(BLSKeyStore);
		validatorsParamsSubStore = validatorsModule.stores.get(ValidatorsParamsStore);
		methodContext = new MethodContext({
			stateStore,
			eventQueue: new EventQueue(0),
			contextStore: new Map<string, unknown>(),
		});
	});

	describe('registerValidatorKeys', () => {
		beforeEach(() => {
			jest.spyOn(methodContext.eventQueue, 'add');
		});

		it('should be able to create new validator account if validator address does not exist, bls key is not registered and proof of possession is valid', async () => {
			const generatorEventData = codec.encode(generatorKeyRegDataSchema, {
				generatorKey,
				result: KeyRegResult.SUCCESS,
			});
			const blsEventData = codec.encode(blsKeyRegDataSchema, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.SUCCESS,
			});

			await expect(
				validatorsModule.method.registerValidatorKeys(
					methodContext,
					address,
					blsKey,
					generatorKey,
					proofOfPossession,
				),
			).resolves.toBe(true);
			expect(methodContext.eventQueue.add).toHaveBeenNthCalledWith(
				1,
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(GeneratorKeyRegistrationEvent).name,
				generatorEventData,
				[address],
				false,
			);
			expect(methodContext.eventQueue.add).toHaveBeenNthCalledWith(
				2,
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(BLSKeyRegistrationEvent).name,
				blsEventData,
				[address],
				false,
			);
		});

		it('should not be able to create new validator account if validator address already exists, bls key is not registered and proof of possession is valid', async () => {
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await validatorsSubStore.set(methodContext, address, validatorAccount);
			const generatorEventData = codec.encode(generatorKeyRegDataSchema, {
				generatorKey,
				result: KeyRegResult.ALREADY_VALIDATOR,
			});

			await expect(
				validatorsModule.method.registerValidatorKeys(
					methodContext,
					address,
					blsKey,
					generatorKey,
					proofOfPossession,
				),
			).rejects.toThrow('This address is already registered as validator.');
			expect(methodContext.eventQueue.add).toHaveBeenCalledWith(
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(GeneratorKeyRegistrationEvent).name,
				generatorEventData,
				[address],
				true,
			);
		});

		it('should not be able to create new validator account if validator address does not exist, bls key is already registered and proof of possession is valid', async () => {
			await blsKeysSubStore.set(methodContext, blsKey, { address });
			const blsEventData = codec.encode(blsKeyRegDataSchema, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.DUPLICATE_BLS_KEY,
			});

			await expect(
				validatorsModule.method.registerValidatorKeys(
					methodContext,
					address,
					blsKey,
					generatorKey,
					proofOfPossession,
				),
			).rejects.toThrow(
				`The BLS key ${blsKey.toString('hex')} has already been registered in the chain.`,
			);
			expect(methodContext.eventQueue.add).toHaveBeenCalledWith(
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(BLSKeyRegistrationEvent).name,
				blsEventData,
				[address],
				true,
			);
		});

		it('should not be able to create new validator account if validator address does not exist, bls key is not registered and proof of possession is invalid', async () => {
			const invalidProofOfPossession = utils.getRandomBytes(48);
			const blsEventData = codec.encode(blsKeyRegDataSchema, {
				blsKey,
				proofOfPossession: invalidProofOfPossession,
				result: KeyRegResult.INVALID_POP,
			});

			await expect(
				validatorsModule.method.registerValidatorKeys(
					methodContext,
					address,
					blsKey,
					generatorKey,
					invalidProofOfPossession,
				),
			).rejects.toThrow('Invalid proof of possession for the given BLS key.');
			expect(methodContext.eventQueue.add).toHaveBeenCalledWith(
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(BLSKeyRegistrationEvent).name,
				blsEventData,
				[address],
				true,
			);
		});
	});

	describe('setValidatorBLSKey', () => {
		beforeEach(() => {
			jest.spyOn(methodContext.eventQueue, 'add');
		});

		it('should be able to correctly set bls key for validator if address exists, key is not registered and proof of possession is valid', async () => {
			const blsEventData = codec.encode(blsKeyRegDataSchema, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.SUCCESS,
			});
			const validatorAccount = {
				generatorKey,
				blsKey: INVALID_BLS_KEY,
			};
			await validatorsSubStore.set(methodContext, address, validatorAccount);
			const isSet = await validatorsModule.method.setValidatorBLSKey(
				methodContext,
				address,
				blsKey,
				proofOfPossession,
			);

			const setValidatorAccount = await validatorsSubStore.get(methodContext, address);

			const hasKey = await blsKeysSubStore.has(methodContext, blsKey);

			expect(isSet).toBe(true);
			expect(setValidatorAccount.blsKey.toString('hex')).toBe(blsKey.toString('hex'));
			expect(hasKey).toBe(true);
			expect(methodContext.eventQueue.add).toHaveBeenCalledWith(
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(BLSKeyRegistrationEvent).name,
				blsEventData,
				[address],
				false,
			);
		});

		it('should not be able to set bls key for validator if address does not exist', async () => {
			const blsEventData = codec.encode(blsKeyRegDataSchema, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.NO_VALIDATOR,
			});
			await expect(
				validatorsModule.method.setValidatorBLSKey(
					methodContext,
					address,
					blsKey,
					proofOfPossession,
				),
			).rejects.toThrow(
				'This address is not registered as validator. Only validators can register a BLS key.',
			);
			expect(methodContext.eventQueue.add).toHaveBeenCalledWith(
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(BLSKeyRegistrationEvent).name,
				blsEventData,
				[address],
				true,
			);
		});

		it('should not be able to set bls key for validator if address exists but bls key is already registered', async () => {
			const blsEventData = codec.encode(blsKeyRegDataSchema, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.DUPLICATE_BLS_KEY,
			});
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await validatorsSubStore.set(methodContext, address, validatorAccount);
			await blsKeysSubStore.set(methodContext, blsKey, { address });

			await expect(
				validatorsModule.method.setValidatorBLSKey(
					methodContext,
					address,
					blsKey,
					proofOfPossession,
				),
			).rejects.toThrow(
				`The BLS key ${blsKey.toString('hex')} has already been registered in the chain.`,
			);
			expect(methodContext.eventQueue.add).toHaveBeenCalledWith(
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(BLSKeyRegistrationEvent).name,
				blsEventData,
				[address],
				true,
			);
		});

		it('should not be able to set bls key for validator if address exists, key is not registered but proof of possession is invalid', async () => {
			const invalidProofOfPossession = utils.getRandomBytes(48);
			const blsEventData = codec.encode(blsKeyRegDataSchema, {
				blsKey,
				proofOfPossession: invalidProofOfPossession,
				result: KeyRegResult.INVALID_POP,
			});
			const validatorAccount = {
				generatorKey,
				blsKey: INVALID_BLS_KEY,
			};
			await validatorsSubStore.set(methodContext, address, validatorAccount);

			await expect(
				validatorsModule.method.setValidatorBLSKey(
					methodContext,
					address,
					blsKey,
					invalidProofOfPossession,
				),
			).rejects.toThrow('Invalid proof of possession for the given BLS key.');
			expect(methodContext.eventQueue.add).toHaveBeenCalledWith(
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(BLSKeyRegistrationEvent).name,
				blsEventData,
				[address],
				true,
			);
		});
	});

	describe('setValidatorGeneratorKey', () => {
		beforeEach(() => {
			jest.spyOn(methodContext.eventQueue, 'add');
		});

		it('should be able to correctly set generator key for validator if address exists', async () => {
			const generatorKey1 = utils.getRandomBytes(48);
			const generatorEventData = codec.encode(generatorKeyRegDataSchema, {
				generatorKey: generatorKey1,
				result: KeyRegResult.SUCCESS,
			});
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await validatorsSubStore.set(methodContext, address, validatorAccount);

			const isSet = await validatorsModule.method.setValidatorGeneratorKey(
				methodContext,
				address,
				generatorKey1,
			);
			const setValidatorAccount = await validatorsSubStore.get(methodContext, address);

			expect(isSet).toBe(true);
			expect(setValidatorAccount.generatorKey.equals(generatorKey1)).toBe(true);
			expect(methodContext.eventQueue.add).toHaveBeenCalledWith(
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(GeneratorKeyRegistrationEvent).name,
				generatorEventData,
				[address],
				false,
			);
		});

		it('should not be able to set generator key for validator if address does not exist', async () => {
			const generatorEventData = codec.encode(generatorKeyRegDataSchema, {
				generatorKey,
				result: KeyRegResult.NO_VALIDATOR,
			});

			await expect(
				validatorsModule.method.setValidatorGeneratorKey(methodContext, address, generatorKey),
			).rejects.toThrow(
				'This address is not registered as validator. Only validators can register a generator key.',
			);
			expect(methodContext.eventQueue.add).toHaveBeenCalledWith(
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(GeneratorKeyRegistrationEvent).name,
				generatorEventData,
				[address],
				true,
			);
		});
	});

	describe('isKeyRegistered', () => {
		it('should return true if bls key is already registered', async () => {
			await blsKeysSubStore.set(methodContext, blsKey, { address });

			await expect(validatorsModule.method.isKeyRegistered(methodContext, blsKey)).resolves.toBe(
				true,
			);
		});

		it('should return false if bls key is not registered', async () => {
			await expect(validatorsModule.method.isKeyRegistered(methodContext, blsKey)).resolves.toBe(
				false,
			);
		});
	});

	describe('getGeneratorsBetweenTimestamps', () => {
		beforeEach(async () => {
			await validatorsParamsSubStore.set(methodContext, EMPTY_KEY, {
				certificateThreshold: BigInt(68),
				preCommitThreshold: BigInt(68),
				validators: generatorList.map(addr => ({
					address: Buffer.from(addr, 'hex'),
					bftWeight: BigInt(1),
					blsKey: Buffer.alloc(98),
					generatorKey: Buffer.alloc(32),
				})),
			});
		});

		it('should be able to return if input timestamps are valid', async () => {
			await validatorsParamsSubStore.set(methodContext, EMPTY_KEY, {
				certificateThreshold: BigInt(68),
				preCommitThreshold: BigInt(68),
				validators: generatorList.map(addr => ({
					address: Buffer.from(addr, 'hex'),
					bftWeight: BigInt(1),
					blsKey: Buffer.alloc(98),
					generatorKey: Buffer.alloc(32),
				})),
			});

			await expect(
				validatorsModule.method.getGeneratorsBetweenTimestamps(methodContext, 5, 1834),
			).resolves.toBeObject();
		});

		it('should be able to return generators with at least one generator assigned more than one slot if input timestamps are valid and difference between input timestamps is greater than one round', async () => {
			const validatorsPerRound = 101;
			const timePerRound = validatorsPerRound * blockTime;

			const result = await validatorsModule.method.getGeneratorsBetweenTimestamps(
				methodContext,
				0,
				timePerRound + 2 * blockTime + 1,
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
			const validatorsPerRound = 101;
			const timePerRound = validatorsPerRound * blockTime;

			const result = await validatorsModule.method.getGeneratorsBetweenTimestamps(
				methodContext,
				0,
				timePerRound * 2 + 2 * blockTime + 1,
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
			const result = await validatorsModule.method.getGeneratorsBetweenTimestamps(
				methodContext,
				100,
				100,
			);

			expect(Object.keys(result)).toHaveLength(0);
		});

		it('should be able to return no generator if input timestamps are valid and difference between input timestamps is less than block time ', async () => {
			const result = await validatorsModule.method.getGeneratorsBetweenTimestamps(
				methodContext,
				0,
				blockTime - 1,
			);

			expect(Object.keys(result)).toHaveLength(0);
		});

		it('should be able to return no generator if input timestamps are valid and difference between input timestamps is equal to block time ', async () => {
			const result = await validatorsModule.method.getGeneratorsBetweenTimestamps(
				methodContext,
				0,
				blockTime,
			);

			expect(Object.keys(result)).toHaveLength(0);
		});

		it('should throw error if the end timestamp is less than the start timestamp', async () => {
			await expect(
				validatorsModule.method.getGeneratorsBetweenTimestamps(methodContext, 10, 1),
			).rejects.toThrow('End timestamp must be greater than start timestamp.');
		});

		it('should return empty result when startSlotNumber is lower than endSlotNumber but in the same block slot', async () => {
			await expect(
				validatorsModule.method.getGeneratorsBetweenTimestamps(methodContext, 2, 3),
			).resolves.toEqual({});
		});

		it('should return empty result when startSlotNumber equals endSlotNumber but in the same block slot', async () => {
			await expect(
				validatorsModule.method.getGeneratorsBetweenTimestamps(methodContext, 2, 2),
			).resolves.toEqual({});
		});
	});

	describe('getValidatorKeys', () => {
		const validAddress = utils.getRandomBytes(20);
		let validatorAccount: ValidatorKeys;
		beforeEach(async () => {
			methodContext = createNewMethodContext(new InMemoryPrefixedStateDB());

			validatorAccount = {
				generatorKey: utils.getRandomBytes(48),
				blsKey: utils.getRandomBytes(32),
			};

			const validatorsStore = validatorsModule.stores.get(ValidatorKeysStore);
			await validatorsStore.set(methodContext, validAddress, validatorAccount);
		});

		it('should get validator from store', async () => {
			const receivedValidatorAccount = await validatorsMethod.getValidatorKeys(
				methodContext,
				validAddress,
			);
			expect(receivedValidatorAccount).toEqual(validatorAccount);
		});

		it('should throw when address length is not 20', async () => {
			const invalidAddress = utils.getRandomBytes(19);
			await expect(
				validatorsMethod.getValidatorKeys(methodContext, invalidAddress),
			).rejects.toThrow('Address is not valid');
		});

		it('should throw if address does not exist', async () => {
			const nonExistingAddress = utils.getRandomBytes(20);
			await expect(
				validatorsMethod.getValidatorKeys(methodContext, nonExistingAddress),
			).rejects.toThrow('No validator account found for the input address.');
		});
	});

	describe('getAddressFromBLSKey', () => {
		beforeEach(() => {});

		it('should get address if it exists in store', async () => {
			await blsKeysSubStore.set(methodContext, blsKey, { address });
			await expect(validatorsMethod.getAddressFromBLSKey(methodContext, blsKey)).resolves.toEqual({
				address,
			});
		});

		it('should throw if address does not exist in store', async () => {
			await expect(validatorsMethod.getAddressFromBLSKey(methodContext, blsKey)).rejects.toThrow(
				`The BLS key ${blsKey.toString('hex')} has not been registered in the chain.`,
			);
		});
	});

	describe('registerValidatorWithoutBLSKey', () => {
		beforeEach(() => {
			jest.spyOn(methodContext.eventQueue, 'add');
		});

		it('should be able to register validator key for validator if address does not exist', async () => {
			const generatorEventData = codec.encode(generatorKeyRegDataSchema, {
				generatorKey,
				result: KeyRegResult.SUCCESS,
			});
			const isSet = await validatorsModule.method.registerValidatorWithoutBLSKey(
				methodContext,
				address,
				generatorKey,
			);
			const setValidatorAccount = await validatorsSubStore.get(methodContext, address);

			expect(isSet).toBe(true);
			expect(setValidatorAccount.generatorKey.equals(generatorKey)).toBe(true);
			expect(methodContext.eventQueue.add).toHaveBeenCalledWith(
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(GeneratorKeyRegistrationEvent).name,
				generatorEventData,
				[address],
				false,
			);
		});

		it('should throw error if address already registered as validator', async () => {
			const generatorEventData = codec.encode(generatorKeyRegDataSchema, {
				generatorKey,
				result: KeyRegResult.ALREADY_VALIDATOR,
			});
			const validatorAccount = {
				generatorKey,
				blsKey,
			};
			await validatorsSubStore.set(methodContext, address, validatorAccount);
			await expect(
				validatorsModule.method.registerValidatorWithoutBLSKey(
					methodContext,
					address,
					generatorKey,
				),
			).rejects.toThrow('This address is already registered as validator.');
			expect(methodContext.eventQueue.add).toHaveBeenCalledWith(
				MODULE_NAME_VALIDATORS,
				validatorsModule.events.get(GeneratorKeyRegistrationEvent).name,
				generatorEventData,
				[address],
				true,
			);
		});
	});
});
