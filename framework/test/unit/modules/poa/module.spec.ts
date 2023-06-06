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
import { utils } from '@liskhq/lisk-cryptography';
import { PoAModule } from '../../../../src/modules/poa';
import { FeeMethod, RandomMethod, ValidatorsMethod } from '../../../../src/modules/poa/types';
import {
	ChainPropertiesStore,
	SnapshotObject,
	SnapshotStore,
} from '../../../../src/modules/poa/stores';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import {
	InMemoryPrefixedStateDB,
	createBlockContext,
	createFakeBlockHeader,
	createTransientMethodContext,
} from '../../../../src/testing';
import { BlockAfterExecuteContext, MethodContext } from '../../../../src';
import {
	EMPTY_BYTES,
	LENGTH_BLS_KEY,
	LENGTH_GENERATOR_KEY,
} from '../../../../src/modules/poa/constants';
import { shuffleValidatorList } from '../../../../src/modules/poa/utils';

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
		it.todo('test all the assignments and initialization');
	});

	describe('addDependencies', () => {
		it('should add all the dependencies', () => {
			poaModule.addDependencies(validatorMethod, feeMethod, randomMethod);

			expect(poaModule['_validatorsMethod']).toBeDefined();
			expect(poaModule['_feeMethod']).toBeDefined();
			expect(poaModule['_randomMethod']).toBeDefined();
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
		let firstSnapshot: SnapshotObject;
		let secondSnapshot: SnapshotObject;
		let thirdSnapshot: SnapshotObject;
		let chainPropertiesStore: ChainPropertiesStore;
		let snapshotStore: SnapshotStore;
		let methodContext: MethodContext;
		let randomSeed: Buffer;

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
			chainPropertiesStore = poaModule.stores.get(ChainPropertiesStore);
			await chainPropertiesStore.set(methodContext, EMPTY_BYTES, {
				roundEndHeight: height - 1,
				validatorsUpdateNonce: 4,
			});
			firstSnapshot = {
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

			secondSnapshot = {
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

			thirdSnapshot = {
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
			await snapshotStore.set(methodContext, utils.intToBuffer(0, 4), firstSnapshot);
			await snapshotStore.set(methodContext, utils.intToBuffer(1, 4), secondSnapshot);
			await snapshotStore.set(methodContext, utils.intToBuffer(2, 4), thirdSnapshot);
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
			await chainPropertiesStore.set(methodContext, EMPTY_BYTES, {
				roundEndHeight: height,
				validatorsUpdateNonce: 4,
			});
			const roundStartHeight = height - firstSnapshot.validators.length + 1;
			const validators = [];
			for (const validator of secondSnapshot.validators) {
				validators.push(validator);
			}
			const nextValidators = shuffleValidatorList(randomSeed, validators);
			await poaModule.afterTransactionsExecute(context);
			expect(poaModule.stores.get(SnapshotStore).set).toHaveBeenCalledWith(
				context,
				utils.intToBuffer(0, 4),
				secondSnapshot,
			);
			expect(poaModule.stores.get(SnapshotStore).set).toHaveBeenCalledWith(
				context,
				utils.intToBuffer(1, 4),
				thirdSnapshot,
			);
			expect(randomMethod.getRandomBytes).toHaveBeenCalledWith(
				context,
				roundStartHeight,
				firstSnapshot.validators.length,
			);
			expect(validatorMethod.setValidatorsParams).toHaveBeenCalledWith(
				context,
				context,
				secondSnapshot.threshold,
				secondSnapshot.threshold,
				nextValidators.map(v => ({
					address: v.address,
					bftWeight: v.weight,
				})),
			);
		});
	});
});
