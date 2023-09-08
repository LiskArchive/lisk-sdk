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
	ADDRESS_LENGTH,
	BLS_PUBLIC_KEY_LENGTH,
	ED25519_PUBLIC_KEY_LENGTH,
	BLS_POP_LENGTH,
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
	BlsKeyRegistrationEvent,
} from '../../../../src/modules/validators/events/bls_key_registration';
import { ValidatorsParamsStore } from '../../../../src/modules/validators/stores/validators_params';
import { ValidatorArgs } from '../../../../src/modules/validators/method';

describe('ValidatorsModuleMethod', () => {
	let validatorsMethod: ValidatorsMethod;
	let validatorsModule: ValidatorsModule;
	let methodContext: MethodContext;
	let stateStore: PrefixedStateReadWriter;
	let validatorsSubStore: ValidatorKeysStore;
	let blsKeysSubStore: BLSKeyStore;
	let validatorsParamsSubStore: ValidatorsParamsStore;
	const blockTime = 10;
	const genesisConfig: any = { blockTime };
	const moduleConfig: any = {};
	const address = utils.getRandomBytes(ADDRESS_LENGTH);
	const generatorKey = utils.getRandomBytes(ED25519_PUBLIC_KEY_LENGTH);
	const proofOfPossession = Buffer.from(
		'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d26',
		'hex',
	);
	const blsKey = Buffer.from(
		'b301803f8b5ac4a1133581fc676dfedc60d891dd5fa99028805e5ea5b08d3491af75d0707adab3b70c6a6a580217bf81',
		'hex',
	);
	const invalidProofOfPossession = Buffer.from(
		'88bb31b27eae23038e14f9d9d1b628a39f5881b5278c3c6f0249f81ba0deb1f68aa5f8847854d6554051aa810fdf1cdb02df4af7a5647b1aa4afb60ec6d446ee17af24a8a50876ffdaf9bf475038ec5f8ebeda1c1c6a3220293e23b13a9a5d27',
		'hex',
	);
	const invalidAddressShort = utils.getRandomBytes(ADDRESS_LENGTH - 1);
	const invalidAddressLong = utils.getRandomBytes(ADDRESS_LENGTH + 1);
	const invalidGeneratorKeyShort = utils.getRandomBytes(ED25519_PUBLIC_KEY_LENGTH - 1);
	const invalidGeneratorKeyLong = utils.getRandomBytes(ED25519_PUBLIC_KEY_LENGTH + 1);
	const invalidBlsKeyShort = utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH - 1);
	const invalidBlsKeyLong = utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH + 1);

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

			await validatorsModule.method.registerValidatorKeys(
				methodContext,
				address,
				blsKey,
				generatorKey,
				proofOfPossession,
			);

			const returnedAccount = await validatorsSubStore.get(methodContext, address);
			const returnedAddress = await blsKeysSubStore.get(methodContext, blsKey);
			expect(returnedAccount).toStrictEqual({ generatorKey, blsKey });
			expect(returnedAddress).toStrictEqual({ address });
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
				validatorsModule.events.get(BlsKeyRegistrationEvent).name,
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
				validatorsModule.events.get(BlsKeyRegistrationEvent).name,
				blsEventData,
				[address],
				true,
			);
		});

		it('should not be able to create new validator account if validator address does not exist, bls key is not registered and proof of possession is invalid', async () => {
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
				validatorsModule.events.get(BlsKeyRegistrationEvent).name,
				blsEventData,
				[address],
				true,
			);
		});

		it('should not be able to register validator keys if validator address does not exist, bls key is not registered and proof of possession is valid but validatorAddress is shorter than 20 bytes', async () => {
			await expect(
				validatorsModule.method.registerValidatorKeys(
					methodContext,
					invalidAddressShort,
					blsKey,
					generatorKey,
					proofOfPossession,
				),
			).rejects.toThrow(`Validator address must be ${ADDRESS_LENGTH} bytes long.`);
			await expect(validatorsSubStore.get(methodContext, invalidAddressShort)).rejects.toThrow();
			await expect(blsKeysSubStore.get(methodContext, blsKey)).rejects.toThrow();
		});

		it('should not be able to register validator keys if validator address does not exist, bls key is not registered and proof of possession is valid but validatorAddress is longer than 20 bytes', async () => {
			await expect(
				validatorsModule.method.registerValidatorKeys(
					methodContext,
					invalidAddressLong,
					blsKey,
					generatorKey,
					proofOfPossession,
				),
			).rejects.toThrow(`Validator address must be ${ADDRESS_LENGTH} bytes long.`);
			await expect(validatorsSubStore.get(methodContext, invalidAddressLong)).rejects.toThrow();
			await expect(blsKeysSubStore.get(methodContext, blsKey)).rejects.toThrow();
		});

		it('should not be able to register validator keys if validator address does not exist, bls key is not registered and proof of possession is valid but generator key is shorter than 32 bytes', async () => {
			await expect(
				validatorsModule.method.registerValidatorKeys(
					methodContext,
					address,
					blsKey,
					invalidGeneratorKeyShort,
					proofOfPossession,
				),
			).rejects.toThrow();
			await expect(validatorsSubStore.get(methodContext, address)).rejects.toThrow();
			await expect(blsKeysSubStore.get(methodContext, blsKey)).rejects.toThrow();
		});

		it('should not be able to register validator keys if validator address does not exist, bls key is not registered and proof of possession is valid but generator key is longer than 32 bytes', async () => {
			await expect(
				validatorsModule.method.registerValidatorKeys(
					methodContext,
					address,
					blsKey,
					invalidGeneratorKeyLong,
					proofOfPossession,
				),
			).rejects.toThrow();
			await expect(validatorsSubStore.get(methodContext, address)).rejects.toThrow();
			await expect(blsKeysSubStore.get(methodContext, blsKey)).rejects.toThrow();
		});

		it('should not be able to register validator keys if validator address does not exist, bls key is not registered and proof of possession is valid but bls key is shorter than 48 bytes', async () => {
			await expect(
				validatorsModule.method.registerValidatorKeys(
					methodContext,
					address,
					invalidBlsKeyShort,
					generatorKey,
					proofOfPossession,
				),
			).rejects.toThrow();
			await expect(validatorsSubStore.get(methodContext, address)).rejects.toThrow();
			await expect(blsKeysSubStore.get(methodContext, invalidBlsKeyShort)).rejects.toThrow();
		});

		it('should not be able to register validator keys if validator address does not exist, bls key is not registered and proof of possession is valid but bls key is longer than 48 bytes', async () => {
			await expect(
				validatorsModule.method.registerValidatorKeys(
					methodContext,
					address,
					invalidBlsKeyLong,
					generatorKey,
					proofOfPossession,
				),
			).rejects.toThrow();
			await expect(validatorsSubStore.get(methodContext, address)).rejects.toThrow();
			await expect(blsKeysSubStore.get(methodContext, invalidBlsKeyLong)).rejects.toThrow();
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
				validatorsModule.events.get(BlsKeyRegistrationEvent).name,
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
				validatorsModule.events.get(BlsKeyRegistrationEvent).name,
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
				validatorsModule.events.get(BlsKeyRegistrationEvent).name,
				blsEventData,
				[address],
				true,
			);
		});

		it('should not be able to set bls key for validator if address exists, key is not registered but proof of possession is invalid', async () => {
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
				validatorsModule.events.get(BlsKeyRegistrationEvent).name,
				blsEventData,
				[address],
				true,
			);
		});

		it('should throw and be unable to set bls key for validator if address is shorter than 20 bytes', async () => {
			await expect(
				validatorsModule.method.setValidatorBLSKey(
					methodContext,
					invalidAddressShort,
					blsKey,
					proofOfPossession,
				),
			).rejects.toThrow(`Validator address must be ${ADDRESS_LENGTH} bytes long.`);
			await expect(blsKeysSubStore.get(methodContext, blsKey)).rejects.toThrow();
		});

		it('should throw and be unable to set bls key for validator if address is longer than 20 bytes', async () => {
			await expect(
				validatorsModule.method.setValidatorBLSKey(
					methodContext,
					invalidAddressLong,
					blsKey,
					proofOfPossession,
				),
			).rejects.toThrow(`Validator address must be ${ADDRESS_LENGTH} bytes long.`);
			await expect(blsKeysSubStore.get(methodContext, blsKey)).rejects.toThrow();
		});

		it('should throw and be unable to set bls key for validator if bls key is shorter than 48 bytes', async () => {
			await expect(
				validatorsModule.method.setValidatorBLSKey(
					methodContext,
					address,
					invalidBlsKeyShort,
					proofOfPossession,
				),
			).rejects.toThrow(`BLS public key must be ${BLS_PUBLIC_KEY_LENGTH} bytes long.`);
			await expect(blsKeysSubStore.get(methodContext, invalidBlsKeyShort)).rejects.toThrow();
		});

		it('should throw and be unable to set bls key for validator if bls key is longer than 48 bytes', async () => {
			await expect(
				validatorsModule.method.setValidatorBLSKey(
					methodContext,
					address,
					invalidBlsKeyLong,
					proofOfPossession,
				),
			).rejects.toThrow(`BLS public key must be ${BLS_PUBLIC_KEY_LENGTH} bytes long.`);
			await expect(blsKeysSubStore.get(methodContext, invalidBlsKeyLong)).rejects.toThrow();
		});
	});

	describe('setValidatorGeneratorKey', () => {
		beforeEach(() => {
			jest.spyOn(methodContext.eventQueue, 'add');
		});

		it('should be able to correctly set generator key for validator if address exists', async () => {
			const generatorEventData = codec.encode(generatorKeyRegDataSchema, {
				generatorKey,
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

		it('should throw error and be unable to set generator key for validator if address is shorter than 20 bytes', async () => {
			await expect(
				validatorsModule.method.setValidatorGeneratorKey(
					methodContext,
					invalidAddressShort,
					generatorKey,
				),
			).rejects.toThrow(`Validator address must be ${ADDRESS_LENGTH} bytes long.`);
			await expect(validatorsSubStore.get(methodContext, invalidAddressShort)).rejects.toThrow();
		});

		it('should throw error and be unable to set generator key for validator if address is longer than 20 bytes', async () => {
			await expect(
				validatorsModule.method.setValidatorGeneratorKey(
					methodContext,
					invalidAddressLong,
					generatorKey,
				),
			).rejects.toThrow(`Validator address must be ${ADDRESS_LENGTH} bytes long.`);
			await expect(validatorsSubStore.get(methodContext, invalidAddressLong)).rejects.toThrow();
		});

		it('should throw error and be unable to set generator key for validator if generator key is shorter than 32 bytes', async () => {
			await expect(
				validatorsModule.method.setValidatorGeneratorKey(
					methodContext,
					address,
					invalidGeneratorKeyShort,
				),
			).rejects.toThrow(`Generator key must be ${ED25519_PUBLIC_KEY_LENGTH} bytes long.`);
			await expect(validatorsSubStore.get(methodContext, address)).rejects.toThrow();
		});

		it('should throw error and be unable to set generator key for validator if generator key is longer than 32 bytes', async () => {
			await expect(
				validatorsModule.method.setValidatorGeneratorKey(
					methodContext,
					address,
					invalidGeneratorKeyLong,
				),
			).rejects.toThrow(`Generator key must be ${ED25519_PUBLIC_KEY_LENGTH} bytes long.`);
			await expect(validatorsSubStore.get(methodContext, address)).rejects.toThrow();
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
					blsKey: Buffer.alloc(BLS_PUBLIC_KEY_LENGTH),
					generatorKey: Buffer.alloc(ED25519_PUBLIC_KEY_LENGTH),
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
					blsKey: Buffer.alloc(BLS_PUBLIC_KEY_LENGTH),
					generatorKey: Buffer.alloc(ED25519_PUBLIC_KEY_LENGTH),
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
			).rejects.toThrow('End timestamp must be greater than or equal to start timestamp.');
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
		const validAddress = utils.getRandomBytes(ADDRESS_LENGTH);
		let validatorAccount: ValidatorKeys;
		beforeEach(async () => {
			methodContext = createNewMethodContext(new InMemoryPrefixedStateDB());

			validatorAccount = {
				generatorKey: utils.getRandomBytes(ED25519_PUBLIC_KEY_LENGTH),
				blsKey: utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
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

		it(`should throw error when address length is not ${ADDRESS_LENGTH}`, async () => {
			await expect(
				validatorsMethod.getValidatorKeys(methodContext, invalidAddressShort),
			).rejects.toThrow(`Validator address must be ${ADDRESS_LENGTH} bytes long.`);
		});

		it('should throw if address does not exist', async () => {
			const nonExistingAddress = utils.getRandomBytes(ADDRESS_LENGTH);
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

		it('should throw if bls key is shorter than 48 bytes', async () => {
			await expect(
				validatorsMethod.getAddressFromBLSKey(methodContext, invalidBlsKeyShort),
			).rejects.toThrow(`BLS public key must be ${BLS_PUBLIC_KEY_LENGTH} bytes long.`);
		});

		it('should throw if bls key is longer than 48 bytes', async () => {
			await expect(
				validatorsMethod.getAddressFromBLSKey(methodContext, invalidBlsKeyLong),
			).rejects.toThrow(`BLS public key must be ${BLS_PUBLIC_KEY_LENGTH} bytes long.`);
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

		it('should throw error and be unable to register validator if address length is less than 20 bytes', async () => {
			await expect(
				validatorsModule.method.registerValidatorWithoutBLSKey(
					methodContext,
					invalidAddressShort,
					generatorKey,
				),
			).rejects.toThrow(`Validator address must be ${ADDRESS_LENGTH} bytes long.`);
			await expect(validatorsSubStore.get(methodContext, invalidAddressShort)).rejects.toThrow();
		});

		it('should throw error and be unable to register validator if address length is greater than 20 bytes', async () => {
			await expect(
				validatorsModule.method.registerValidatorWithoutBLSKey(
					methodContext,
					invalidAddressLong,
					generatorKey,
				),
			).rejects.toThrow(`Validator address must be ${ADDRESS_LENGTH} bytes long.`);
			await expect(validatorsSubStore.get(methodContext, invalidAddressLong)).rejects.toThrow();
		});

		it('should throw error and be unable to register validator if generator key is less than 20 bytes', async () => {
			await expect(
				validatorsModule.method.registerValidatorWithoutBLSKey(
					methodContext,
					address,
					invalidGeneratorKeyShort,
				),
			).rejects.toThrow();
			await expect(validatorsSubStore.get(methodContext, address)).rejects.toThrow();
		});

		it('should throw error and be unable to register validator if generator key is greater than 20 bytes', async () => {
			await expect(
				validatorsModule.method.registerValidatorWithoutBLSKey(
					methodContext,
					address,
					invalidGeneratorKeyLong,
				),
			).rejects.toThrow();
			await expect(validatorsSubStore.get(methodContext, address)).rejects.toThrow();
		});
	});

	describe('_validateLengths', () => {
		let validatorArgs: ValidatorArgs;

		beforeEach(() => {
			validatorArgs = {
				validatorAddress: utils.getRandomBytes(ADDRESS_LENGTH),
				blsKey: utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
				proofOfPossession: utils.getRandomBytes(BLS_POP_LENGTH),
				generatorKey: utils.getRandomBytes(ED25519_PUBLIC_KEY_LENGTH),
			};
		});

		it('should NOT throw when all properties are present and have correct length', () => {
			expect(() => validatorsModule.method['_validateLengths'](validatorArgs)).not.toThrow();
		});

		it('should NOT throw when some properties are missing, but all have correct length', () => {
			delete validatorArgs.blsKey;
			delete validatorArgs.generatorKey;

			expect(() => validatorsModule.method['_validateLengths'](validatorArgs)).not.toThrow();
		});

		it('should throw when all properties are present, but 1 of them have incorrect length', () => {
			validatorArgs.blsKey = utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH + 1);

			expect(() => validatorsModule.method['_validateLengths'](validatorArgs)).toThrow(
				`BLS public key must be ${BLS_PUBLIC_KEY_LENGTH} bytes long.`,
			);
		});

		it('should throw when 1 property are missing, and 1 of the existing ones have incorrect length', () => {
			delete validatorArgs.blsKey;
			validatorArgs.generatorKey = utils.getRandomBytes(ED25519_PUBLIC_KEY_LENGTH - 1);

			expect(() => validatorsModule.method['_validateLengths'](validatorArgs)).toThrow(
				`Generator key must be ${ED25519_PUBLIC_KEY_LENGTH} bytes long.`,
			);
		});
	});
});
