/*
 * Copyright © 2023 Lisk Foundation
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
import { BlockAssets } from '@liskhq/lisk-chain';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import {
	InMemoryPrefixedStateDB,
	createBlockContext,
	createGenesisBlockContext,
	createTransientMethodContext,
} from '../../../../src/testing';
import { invalidAssets, validAsset } from './genesis_block_test_data';
import { PoAModule } from '../../../../src/modules/poa/module';
import { genesisPoAStoreSchema } from '../../../../src/modules/poa/schemas';
import {
	AUTHORITY_REGISTRATION_FEE,
	EMPTY_BYTES,
	KEY_SNAPSHOT_0,
	KEY_SNAPSHOT_1,
	KEY_SNAPSHOT_2,
	LENGTH_BLS_KEY,
	LENGTH_GENERATOR_KEY,
} from '../../../../src/modules/poa/constants';
import {
	ActiveValidator,
	FeeMethod,
	ModuleConfigJSON,
	RandomMethod,
	ValidatorsMethod,
} from '../../../../src/modules/poa/types';
import { createFakeBlockHeader } from '../../../fixtures';
import {
	BlockAfterExecuteContext,
	GenesisBlockContext,
	GenesisBlockExecuteContext,
	MethodContext,
} from '../../../../src/state_machine';
import {
	ValidatorStore,
	SnapshotStore,
	NameStore,
	ChainPropertiesStore,
	SnapshotObject,
	ChainProperties,
} from '../../../../src/modules/poa/stores';
import { shuffleValidatorList } from '../../../../src/modules/utils';

describe('PoA module', () => {
	let poaModule: PoAModule;
	let randomMethod: RandomMethod;
	let validatorMethod: ValidatorsMethod;
	let feeMethod: FeeMethod;

	beforeEach(() => {
		poaModule = new PoAModule();
		randomMethod = {
			getRandomBytes: jest.fn(),
		};
		validatorMethod = {
			setValidatorGeneratorKey: jest.fn(),
			registerValidatorKeys: jest.fn().mockResolvedValue(true),
			registerValidatorWithoutBLSKey: jest.fn().mockResolvedValue(true),
			getValidatorKeys: jest.fn().mockResolvedValue({
				blsKey: utils.getRandomBytes(LENGTH_BLS_KEY),
				generatorKey: utils.getRandomBytes(LENGTH_GENERATOR_KEY),
			}),
			getGeneratorsBetweenTimestamps: jest.fn(),
			setValidatorsParams: jest.fn(),
		};
		feeMethod = {
			payFee: jest.fn(),
		};
	});
	describe('constructor', () => {});

	describe('init', () => {
		let genesisConfig: any;
		let moduleConfigJSON: ModuleConfigJSON;

		beforeEach(() => {
			genesisConfig = {};
			moduleConfigJSON = {
				authorityRegistrationFee: AUTHORITY_REGISTRATION_FEE.toString(),
			};
		});
		it('should assign authorityRegistrationFee from config if given', async () => {
			jest.spyOn(poaModule['_registerAuthorityCommand'], 'init');
			jest.spyOn(poaModule.endpoint, 'init');
			await poaModule.init({
				genesisConfig,
				moduleConfig: {
					...moduleConfigJSON,
					authorityRegistrationFee: '20000',
				},
			});

			expect(poaModule['_moduleConfig'].authorityRegistrationFee).toEqual(BigInt('20000'));
			expect(poaModule['_registerAuthorityCommand'].init).toHaveBeenCalledWith(
				poaModule['_moduleConfig'],
			);
			expect(poaModule.endpoint.init).toHaveBeenCalledWith(
				poaModule['_moduleConfig'].authorityRegistrationFee,
			);
		});

		it('should assign default value for authorityRegistrationFee when not given in config', async () => {
			jest.spyOn(poaModule['_registerAuthorityCommand'], 'init');
			jest.spyOn(poaModule.endpoint, 'init');
			await poaModule.init({
				genesisConfig,
				moduleConfig: { ...moduleConfigJSON },
			});

			expect(poaModule['_moduleConfig'].authorityRegistrationFee).toEqual(
				AUTHORITY_REGISTRATION_FEE,
			);
			expect(poaModule['_registerAuthorityCommand'].init).toHaveBeenCalledWith(
				poaModule['_moduleConfig'],
			);
			expect(poaModule.endpoint.init).toHaveBeenCalledWith(
				poaModule['_moduleConfig'].authorityRegistrationFee,
			);
		});
	});

	describe('addDependencies', () => {
		it('should add all the dependencies', () => {
			jest.spyOn(poaModule['_registerAuthorityCommand'], 'addDependencies');
			jest.spyOn(poaModule['_updateAuthorityCommand'], 'addDependencies');
			jest.spyOn(poaModule['_updateGeneratorKeyCommand'], 'addDependencies');
			poaModule.addDependencies(validatorMethod, feeMethod, randomMethod);

			expect(poaModule['_validatorsMethod']).toBeDefined();
			expect(poaModule['_feeMethod']).toBeDefined();
			expect(poaModule['_randomMethod']).toBeDefined();

			// Check command dependencies
			expect(poaModule['_registerAuthorityCommand'].addDependencies).toHaveBeenCalledWith(
				poaModule['_validatorsMethod'],
				poaModule['_feeMethod'],
			);
			expect(poaModule['_updateAuthorityCommand'].addDependencies).toHaveBeenCalledWith(
				poaModule['_validatorsMethod'],
			);
			expect(poaModule['_updateGeneratorKeyCommand'].addDependencies).toHaveBeenCalledWith(
				poaModule['_validatorsMethod'],
			);
		});
	});

	describe('afterTransactionsExecute', () => {
		const genesisData = {
			height: 0,
			initRounds: 3,
			initValidators: [],
		};
		const bootstrapRounds = genesisData.initRounds;
		let stateStore: PrefixedStateReadWriter;
		let context: BlockAfterExecuteContext;
		let currentTimestamp: number;
		let height: number;
		let snapshot0: SnapshotObject;
		let snapshot1: SnapshotObject;
		let snapshot2: SnapshotObject;
		let chainPropertiesStore: ChainPropertiesStore;
		let snapshotStore: SnapshotStore;
		let methodContext: MethodContext;
		let randomSeed: Buffer;
		let chainProperties: ChainProperties;

		beforeEach(async () => {
			poaModule = new PoAModule();
			poaModule.addDependencies(validatorMethod, feeMethod, randomMethod);
			height = 103 * (bootstrapRounds + 1);
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			currentTimestamp = Math.floor(Date.now() / 1000);

			context = createBlockContext({
				stateStore,
				header: createFakeBlockHeader({
					height,
					timestamp: currentTimestamp,
				}),
			}).getBlockAfterExecuteContext();
			methodContext = createTransientMethodContext({ stateStore });
			chainProperties = {
				roundEndHeight: height - 1,
				validatorsUpdateNonce: 4,
			};
			chainPropertiesStore = poaModule.stores.get(ChainPropertiesStore);
			await chainPropertiesStore.set(methodContext, EMPTY_BYTES, chainProperties);
			snapshot0 = {
				threshold: BigInt(4),
				validators: [
					{
						address: Buffer.from('4162070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4262070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4362070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4462070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4562070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
				],
			};

			snapshot1 = {
				threshold: BigInt(4),
				validators: [
					{
						address: Buffer.from('4162070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4862070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4362070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4762070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4562070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
				],
			};

			snapshot2 = {
				threshold: BigInt(4),
				validators: [
					{
						address: Buffer.from('4262070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4862070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4362070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4762070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
					{
						address: Buffer.from('4562070a641cf689f765d43ad792e1970e6bb863', 'binary'),
						weight: BigInt(1),
					},
				],
			};

			snapshotStore = poaModule.stores.get(SnapshotStore);
			await snapshotStore.set(methodContext, KEY_SNAPSHOT_0, snapshot0);
			await snapshotStore.set(methodContext, KEY_SNAPSHOT_1, snapshot1);
			await snapshotStore.set(methodContext, KEY_SNAPSHOT_2, snapshot2);
			randomSeed = utils.getRandomBytes(20);
			jest.spyOn(snapshotStore, 'set');
			jest.spyOn(randomMethod, 'getRandomBytes').mockResolvedValue(randomSeed);
			jest.spyOn(validatorMethod, 'setValidatorsParams').mockResolvedValue();
		});
		it('should not do anything when context.header.height !== chainProperties.roundEndHeight', async () => {
			await poaModule.afterTransactionsExecute(context);
			expect(poaModule.stores.get(SnapshotStore).set).not.toHaveBeenCalled();
			expect(randomMethod.getRandomBytes).not.toHaveBeenCalled();
			expect(validatorMethod.setValidatorsParams).not.toHaveBeenCalled();
		});

		it('should set snapshots and call validatorsMethod.setValidatorsParams when context.header.height === chainProperties.roundEndHeight', async () => {
			chainProperties = {
				...chainProperties,
				roundEndHeight: height,
			};
			await chainPropertiesStore.set(methodContext, EMPTY_BYTES, chainProperties);
			const roundStartHeight = height - snapshot0.validators.length + 1;
			const validators = [];
			for (const validator of snapshot1.validators) {
				validators.push(validator);
			}
			const nextValidators = shuffleValidatorList<ActiveValidator>(randomSeed, validators);
			await poaModule.afterTransactionsExecute(context);
			expect(poaModule.stores.get(SnapshotStore).set).toHaveBeenCalledWith(
				context,
				KEY_SNAPSHOT_0,
				snapshot1,
			);
			expect(poaModule.stores.get(SnapshotStore).set).toHaveBeenCalledWith(
				context,
				KEY_SNAPSHOT_1,
				snapshot2,
			);
			expect(randomMethod.getRandomBytes).toHaveBeenCalledWith(
				context,
				roundStartHeight,
				snapshot0.validators.length,
			);
			expect(validatorMethod.setValidatorsParams).toHaveBeenCalledWith(
				context,
				context,
				snapshot1.threshold,
				snapshot1.threshold,
				nextValidators.map(v => ({
					address: v.address,
					bftWeight: v.weight,
				})),
			);
			await expect(chainPropertiesStore.get(context, EMPTY_BYTES)).resolves.toEqual({
				...chainProperties,
				roundEndHeight: chainProperties.roundEndHeight + snapshot1.validators.length,
			});
		});
	});

	describe('initGenesisState', () => {
		let stateStore: PrefixedStateReadWriter;
		let poa: PoAModule;

		beforeEach(() => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			poa = new PoAModule();
			poa.addDependencies(validatorMethod, feeMethod, randomMethod);
		});

		it('should not throw error if asset does not exist', async () => {
			const context = createGenesisBlockContext({
				stateStore,
			}).createInitGenesisStateContext();
			jest.spyOn(context, 'getStore');

			await expect(poa.initGenesisState(context)).toResolve();
			expect(context.getStore).not.toHaveBeenCalled();
		});

		describe.each(invalidAssets)('%p', (_, data, errString) => {
			it('should throw error when asset is invalid', async () => {
				const assetBytes = codec.encode(genesisPoAStoreSchema, data as object);
				const context = createGenesisBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 12345 }),
					assets: new BlockAssets([{ module: poa.name, data: assetBytes }]),
				}).createInitGenesisStateContext();

				await expect(poa.initGenesisState(context)).rejects.toThrow(errString as string);
			});
		});

		describe('when the genesis asset is valid', () => {
			let genesisContext: GenesisBlockContext;
			let context: GenesisBlockExecuteContext;

			beforeEach(() => {
				const assetBytes = codec.encode(genesisPoAStoreSchema, validAsset);
				genesisContext = createGenesisBlockContext({
					stateStore,
					assets: new BlockAssets([{ module: poa.name, data: assetBytes }]),
				});
				context = genesisContext.createInitGenesisStateContext();
			});

			it('should store all the validators', async () => {
				await expect(poa.initGenesisState(context)).resolves.toBeUndefined();
				const nameStore = poa.stores.get(NameStore);
				const allNames = await nameStore.iterate(context, {
					gte: Buffer.from([0]),
					lte: Buffer.from([255]),
				});
				expect(allNames).toHaveLength(validAsset.validators.length);
				const validatorStore = poa.stores.get(ValidatorStore);
				const allValidators = await validatorStore.iterate(context, {
					gte: Buffer.alloc(20, 0),
					lte: Buffer.alloc(20, 255),
				});
				expect(allValidators).toHaveLength(validAsset.validators.length);
			});

			it('should store snapshot current round', async () => {
				await expect(poa.initGenesisState(context)).toResolve();
				const snapshotStore = poa.stores.get(SnapshotStore);
				await expect(snapshotStore.get(context, KEY_SNAPSHOT_0)).resolves.toEqual({
					validators: validAsset.snapshotSubstore.activeValidators,
					threshold: validAsset.snapshotSubstore.threshold,
				});
			});

			it('should store snapshot current round + 1', async () => {
				await expect(poa.initGenesisState(context)).toResolve();
				const snapshotStore = poa.stores.get(SnapshotStore);
				await expect(snapshotStore.get(context, KEY_SNAPSHOT_1)).resolves.toEqual({
					validators: validAsset.snapshotSubstore.activeValidators,
					threshold: validAsset.snapshotSubstore.threshold,
				});
			});

			it('should store snapshot current round + 2', async () => {
				await expect(poa.initGenesisState(context)).toResolve();
				const snapshotStore = poa.stores.get(SnapshotStore);
				await expect(snapshotStore.get(context, KEY_SNAPSHOT_2)).resolves.toEqual({
					validators: validAsset.snapshotSubstore.activeValidators,
					threshold: validAsset.snapshotSubstore.threshold,
				});
			});

			it('should store chain properties', async () => {
				await expect(poa.initGenesisState(context)).toResolve();
				const chainPropertiesStore = poa.stores.get(ChainPropertiesStore);
				await expect(chainPropertiesStore.get(context, EMPTY_BYTES)).resolves.toEqual({
					roundEndHeight: context.header.height,
					validatorsUpdateNonce: 0,
				});
			});
		});
	});

	describe('finalizeGenesisState', () => {
		let genesisContext: GenesisBlockContext;
		let context: GenesisBlockExecuteContext;
		let snapshotStore: SnapshotStore;
		let chainPropertiesStore: ChainPropertiesStore;
		let stateStore: PrefixedStateReadWriter;
		let poa: PoAModule;

		beforeEach(async () => {
			poa = new PoAModule();
			poa.addDependencies(validatorMethod, feeMethod, randomMethod);
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			const assetBytes = codec.encode(genesisPoAStoreSchema, validAsset);
			genesisContext = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([{ module: poa.name, data: assetBytes }]),
			});
			context = genesisContext.createInitGenesisStateContext();
			snapshotStore = poa.stores.get(SnapshotStore);
			await snapshotStore.set(context, KEY_SNAPSHOT_0, {
				...validAsset.snapshotSubstore,
				validators: validAsset.snapshotSubstore.activeValidators,
			});
			chainPropertiesStore = poa.stores.get(ChainPropertiesStore);
			await chainPropertiesStore.set(context, EMPTY_BYTES, {
				roundEndHeight: context.header.height,
				validatorsUpdateNonce: 0,
			});
		});

		it('should store updated chain properties', async () => {
			await expect(poa.finalizeGenesisState(context)).toResolve();
			poa.stores.get(ChainPropertiesStore);
			await expect(chainPropertiesStore.get(context, EMPTY_BYTES)).resolves.toEqual({
				roundEndHeight: context.header.height + validAsset.snapshotSubstore.activeValidators.length,
				validatorsUpdateNonce: 0,
			});
		});

		it('should register all active validators as BFT validators', async () => {
			await expect(poa.finalizeGenesisState(context)).toResolve();
			expect(poa['_validatorsMethod'].setValidatorsParams).toHaveBeenCalledWith(
				expect.any(Object),
				expect.any(Object),
				BigInt(validAsset.snapshotSubstore.threshold),
				BigInt(validAsset.snapshotSubstore.threshold),
				validAsset.snapshotSubstore.activeValidators.map(d => ({
					address: d.address,
					bftWeight: d.weight,
				})),
			);
		});

		it('should fail if registerValidatorKeys return false', async () => {
			(poa['_validatorsMethod'].registerValidatorKeys as jest.Mock).mockRejectedValue(
				new Error('Invalid validator key found in poa genesis asset validators.'),
			);

			await expect(poa.finalizeGenesisState(context)).rejects.toThrow(
				'Invalid validator key found in poa genesis asset validators.',
			);
		});
	});
});
