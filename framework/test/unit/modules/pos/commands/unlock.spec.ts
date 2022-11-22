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

import { BlockHeader, Transaction } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import * as testing from '../../../../../src/testing';
import {
	UnlockCommand,
	CommandExecuteContext,
	PoSModule,
	CommandVerifyContext,
} from '../../../../../src';
import {
	defaultConfig,
	EMPTY_KEY,
	PUNISHMENT_WINDOW_SELF_STAKES,
	PUNISHMENT_WINDOW_STAKES,
	LOCKING_PERIOD_SELF_STAKES,
	LOCKING_PERIOD_STAKES,
} from '../../../../../src/modules/pos/constants';
import { TokenMethod, UnlockingObject, StakerData } from '../../../../../src/modules/pos/types';
import { liskToBeddows } from '../../../../utils/assets';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing';
import { ValidatorStore } from '../../../../../src/modules/pos/stores/validator';
import { StakerStore } from '../../../../../src/modules/pos/stores/staker';
import { createStoreGetter } from '../../../../../src/testing/utils';
import { GenesisDataStore } from '../../../../../src/modules/pos/stores/genesis';
import { VerifyStatus } from '../../../../../src/state_machine';

describe('UnlockCommand', () => {
	const pos = new PoSModule();

	let unlockCommand: UnlockCommand;
	let stateStore: PrefixedStateReadWriter;
	let validatorSubstore: ValidatorStore;
	let stakerSubstore: StakerStore;
	let genesisSubstore: GenesisDataStore;
	let mockTokenMethod: TokenMethod;
	let blockHeight: number;
	let header: BlockHeader;
	let unlockableObject: UnlockingObject;
	let unlockableObject2: UnlockingObject;
	let unlockableObject3: UnlockingObject;
	let nonUnlockableObject: UnlockingObject;
	let context: CommandExecuteContext;
	let verifyContext: CommandVerifyContext;
	let storedData: StakerData;
	const validator1 = {
		name: 'validator1',
		address: utils.getRandomBytes(32),
		amount: liskToBeddows(100),
	};
	const validator2 = {
		name: 'validator2',
		address: utils.getRandomBytes(32),
		amount: liskToBeddows(200),
	};
	const validator3 = {
		name: 'validator3',
		address: utils.getRandomBytes(32),
		amount: liskToBeddows(300),
	};
	const validator4 = {
		name: 'validator4',
		address: utils.getRandomBytes(32),
		amount: liskToBeddows(400),
	};
	const defaultValidatorInfo = {
		totalStakeReceived: BigInt(100000000),
		selfStake: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [],
		consecutiveMissedBlocks: 0,
		commission: 0,
		lastCommissionIncreaseHeight: 0,
		sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
	};
	const publicKey = utils.getRandomBytes(32);
	const transaction = new Transaction({
		module: 'pos',
		command: 'unlock',
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(100000000),
		params: Buffer.alloc(0),
		signatures: [publicKey],
	});
	const chainID = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);

	beforeEach(() => {
		unlockCommand = new UnlockCommand(pos.stores, pos.events);
		mockTokenMethod = {
			lock: jest.fn(),
			unlock: jest.fn(),
			getAvailableBalance: jest.fn(),
			burn: jest.fn(),
			transfer: jest.fn(),
			getLockedAmount: jest.fn(),
		};
		unlockCommand.addDependencies({
			tokenMethod: mockTokenMethod,
		});
		unlockCommand.init({
			roundLength: defaultConfig.roundLength,
			posTokenID: Buffer.alloc(8),
		});
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		validatorSubstore = pos.stores.get(ValidatorStore);
		stakerSubstore = pos.stores.get(StakerStore);
		genesisSubstore = pos.stores.get(GenesisDataStore);
		blockHeight = 8760000;
		header = testing.createFakeBlockHeader({
			height: blockHeight,
			aggregateCommit: {
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
				height: blockHeight,
			},
		});
	});

	describe('verify', () => {
		it('should return an OK verify status', async () => {
			verifyContext = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandVerifyContext();

			const result = await unlockCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return an error if transaction params are not empty', async () => {
			const transactionX = new Transaction({
				module: 'pos',
				command: 'unlock',
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: Buffer.alloc(5),
				signatures: [publicKey],
			});

			verifyContext = testing
				.createTransactionContext({
					stateStore,
					transaction: transactionX,
					header,
					chainID,
				})
				.createCommandVerifyContext();

			const expected = {
				status: VerifyStatus.FAIL,
				error: new Error('Unlock transaction params must be empty.'),
			};

			const result = await unlockCommand.verify(verifyContext);

			expect(result).toMatchObject(expected);
		});
	});

	describe(`when non self-staked non-punished account waits ${LOCKING_PERIOD_STAKES} blocks since unstakeHeight`, () => {
		beforeEach(async () => {
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initValidators: [],
			});
			await validatorSubstore.set(createStoreGetter(stateStore), validator1.address, {
				name: validator1.name,
				...defaultValidatorInfo,
			});
			await validatorSubstore.set(createStoreGetter(stateStore), validator2.address, {
				name: validator2.name,
				...defaultValidatorInfo,
			});

			unlockableObject = {
				validatorAddress: validator1.address,
				amount: validator1.amount,
				unstakeHeight: blockHeight - LOCKING_PERIOD_STAKES,
			};
			nonUnlockableObject = {
				validatorAddress: validator2.address,
				amount: validator2.amount,
				unstakeHeight: blockHeight,
			};
			await stakerSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentStakes: [
					{
						validatorAddress: unlockableObject.validatorAddress,
						amount: unlockableObject.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [unlockableObject, nonUnlockableObject],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await stakerSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
			);
		});

		it('should remove eligible pending unlock from staker substore', () => {
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject);
		});

		it('should not remove ineligible pending unlock from staker substore', () => {
			expect(storedData.pendingUnlocks).toContainEqual(nonUnlockableObject);
		});
	});

	describe(`when self-staked non-punished account waits ${LOCKING_PERIOD_SELF_STAKES} blocks since unstakeHeight`, () => {
		beforeEach(async () => {
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initValidators: [],
			});
			await validatorSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				...defaultValidatorInfo,
				name: 'nonpunishedselfstaker',
			});
			unlockableObject = {
				validatorAddress: transaction.senderAddress,
				amount: validator1.amount,
				unstakeHeight: blockHeight - LOCKING_PERIOD_SELF_STAKES,
			};
			nonUnlockableObject = {
				validatorAddress: transaction.senderAddress,
				amount: validator2.amount,
				unstakeHeight: blockHeight,
			};
			await stakerSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentStakes: [
					{
						validatorAddress: unlockableObject.validatorAddress,
						amount: validator1.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
					{
						validatorAddress: nonUnlockableObject.validatorAddress,
						amount: validator2.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [unlockableObject, nonUnlockableObject],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await stakerSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
			);
		});

		it('should remove eligible pending unlock from staker substore', () => {
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject);
		});

		it('should not remove ineligible pending unlock from staker substore', () => {
			expect(storedData.pendingUnlocks).toContainEqual(nonUnlockableObject);
		});
	});

	describe(`when non self-staked punished account waits ${PUNISHMENT_WINDOW_STAKES} blocks and unstakeHeight + ${LOCKING_PERIOD_STAKES} blocks since last pomHeight`, () => {
		beforeEach(async () => {
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initValidators: [],
			});
			await validatorSubstore.set(createStoreGetter(stateStore), validator1.address, {
				...defaultValidatorInfo,
				name: 'punishedstaker1',
				pomHeights: [blockHeight - PUNISHMENT_WINDOW_STAKES],
			});
			// This covers scenario: has not waited pomHeight + 260,000 blocks but waited unstakeHeight + 2000 blocks and pomHeight is more than unstakeHeight + 2000 blocks
			await validatorSubstore.set(createStoreGetter(stateStore), validator2.address, {
				...defaultValidatorInfo,
				name: 'punishedstaker2',
				pomHeights: [blockHeight],
			});
			// This covers scenario: has not waited pomHeight + 260,000 blocks but waited unstakeHeight + 2000 blocks and pomHeight is equal to unstakeHeight + 2000 blocks
			await validatorSubstore.set(createStoreGetter(stateStore), validator3.address, {
				...defaultValidatorInfo,
				name: 'punishedstaker3',
				pomHeights: [blockHeight - 1000],
			});
			await validatorSubstore.set(createStoreGetter(stateStore), validator4.address, {
				...defaultValidatorInfo,
				name: 'punishedstaker4',
				pomHeights: [blockHeight - PUNISHMENT_WINDOW_STAKES],
			});
			unlockableObject = {
				validatorAddress: validator1.address,
				amount: validator1.amount,
				unstakeHeight: blockHeight - LOCKING_PERIOD_STAKES,
			};
			unlockableObject2 = {
				validatorAddress: validator2.address,
				amount: validator2.amount,
				unstakeHeight: blockHeight - LOCKING_PERIOD_STAKES - 1000,
			};
			unlockableObject3 = {
				validatorAddress: validator3.address,
				amount: validator3.amount,
				unstakeHeight: blockHeight - LOCKING_PERIOD_STAKES - 1000,
			};
			nonUnlockableObject = {
				validatorAddress: validator4.address,
				amount: validator4.amount,
				unstakeHeight: blockHeight,
			};
			await stakerSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentStakes: [
					{
						validatorAddress: unlockableObject.validatorAddress,
						amount: unlockableObject.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
					{
						validatorAddress: unlockableObject2.validatorAddress,
						amount: unlockableObject2.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
					{
						validatorAddress: unlockableObject3.validatorAddress,
						amount: unlockableObject3.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
					{
						validatorAddress: nonUnlockableObject.validatorAddress,
						amount: nonUnlockableObject.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [
					unlockableObject,
					unlockableObject2,
					unlockableObject3,
					nonUnlockableObject,
				],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await stakerSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
			);
		});

		it('should remove eligible pending unlock from staker substore', () => {
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject);
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject2);
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject3);
		});

		it('should not remove ineligible pending unlock from staker substore', () => {
			expect(storedData.pendingUnlocks).toContainEqual(nonUnlockableObject);
		});
	});

	describe(`when self-staked punished account waits ${PUNISHMENT_WINDOW_SELF_STAKES} blocks and waits unstakeHeight + ${LOCKING_PERIOD_SELF_STAKES} blocks since pomHeight`, () => {
		beforeEach(async () => {
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initValidators: [],
			});
			await validatorSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				...defaultValidatorInfo,
				name: 'punishedselfstaker',
				pomHeights: [blockHeight - PUNISHMENT_WINDOW_SELF_STAKES],
			});
			unlockableObject = {
				validatorAddress: transaction.senderAddress,
				amount: validator1.amount,
				unstakeHeight: blockHeight - LOCKING_PERIOD_SELF_STAKES,
			};
			nonUnlockableObject = {
				validatorAddress: transaction.senderAddress,
				amount: validator2.amount,
				unstakeHeight: blockHeight,
			};
			await stakerSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentStakes: [
					{
						validatorAddress: unlockableObject.validatorAddress,
						amount: unlockableObject.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
					{
						validatorAddress: nonUnlockableObject.validatorAddress,
						amount: nonUnlockableObject.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [unlockableObject, nonUnlockableObject],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await stakerSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
			);
		});

		it('should remove eligible pending unlock from staker substore', () => {
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject);
		});

		it('should not remove ineligible pending unlock from staker substore', () => {
			expect(storedData.pendingUnlocks).toContainEqual(nonUnlockableObject);
		});
	});

	describe(`when self-staked punished account does not wait ${PUNISHMENT_WINDOW_SELF_STAKES} blocks and waits unstakeHeight + ${LOCKING_PERIOD_SELF_STAKES} blocks since pomHeight`, () => {
		beforeEach(async () => {
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initValidators: [],
			});
			await validatorSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				...defaultValidatorInfo,
				name: 'punishedselfstaker',
				pomHeights: [blockHeight - 1],
			});
			nonUnlockableObject = {
				validatorAddress: transaction.senderAddress,
				amount: validator1.amount,
				unstakeHeight: blockHeight - LOCKING_PERIOD_SELF_STAKES,
			};
			await stakerSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentStakes: [
					{
						validatorAddress: nonUnlockableObject.validatorAddress,
						amount: nonUnlockableObject.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [nonUnlockableObject],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandExecuteContext();
		});

		it('should throw error', async () => {
			await expect(unlockCommand.execute(context)).rejects.toThrow(
				'No eligible staker data was found for unlocking',
			);
		});
	});

	describe(`when certificate is not generated`, () => {
		beforeEach(async () => {
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 10,
				initRounds: 1,
				initValidators: [],
			});
			await validatorSubstore.set(createStoreGetter(stateStore), validator1.address, {
				name: validator1.name,
				...defaultValidatorInfo,
			});
			await validatorSubstore.set(createStoreGetter(stateStore), validator2.address, {
				name: validator2.name,
				...defaultValidatorInfo,
			});
			nonUnlockableObject = {
				validatorAddress: validator2.address,
				amount: validator2.amount,
				unstakeHeight: blockHeight,
			};
			await stakerSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentStakes: [
					{
						validatorAddress: unlockableObject.validatorAddress,
						amount: unlockableObject.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [nonUnlockableObject],
			});
		});

		it('should not unlock any stakes', async () => {
			// Arrange
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header: testing.createFakeBlockHeader({
						height: blockHeight,
						aggregateCommit: {
							aggregationBits: Buffer.alloc(0),
							certificateSignature: Buffer.alloc(0),
							height: 0,
						},
					}),
					chainID,
				})
				.createCommandExecuteContext();

			await expect(unlockCommand.execute(context)).rejects.toThrow(
				'No eligible staker data was found for unlocking',
			);
		});
	});

	describe(`when certificate is generated`, () => {
		beforeEach(async () => {
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initValidators: [],
			});
			await validatorSubstore.set(createStoreGetter(stateStore), validator1.address, {
				name: validator1.name,
				...defaultValidatorInfo,
			});
			await validatorSubstore.set(createStoreGetter(stateStore), validator2.address, {
				name: validator2.name,
				...defaultValidatorInfo,
			});

			unlockableObject = {
				validatorAddress: validator1.address,
				amount: validator1.amount,
				unstakeHeight: blockHeight - LOCKING_PERIOD_STAKES,
			};
			nonUnlockableObject = {
				validatorAddress: validator2.address,
				amount: validator2.amount,
				unstakeHeight: blockHeight,
			};
			await stakerSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentStakes: [
					{
						validatorAddress: unlockableObject.validatorAddress,
						amount: unlockableObject.amount,
						stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [unlockableObject, nonUnlockableObject],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await stakerSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
			);
		});

		it('should remove eligible pending unlock from staker substore', () => {
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject);
		});

		it('should not remove ineligible pending unlock from staker substore', () => {
			expect(storedData.pendingUnlocks).toContainEqual(nonUnlockableObject);
		});
	});
});
