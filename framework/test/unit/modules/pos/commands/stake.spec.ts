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

import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { address, utils } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { StateMachine, Modules } from '../../../../../src';
import {
	defaultConfig,
	MODULE_NAME_POS,
	PoSEventResult,
	TOKEN_ID_LENGTH,
} from '../../../../../src/modules/pos/constants';
import { ValidatorStakedEvent } from '../../../../../src/modules/pos/events/validator_staked';
import { InternalMethod } from '../../../../../src/modules/pos/internal_method';
import { ValidatorAccount, ValidatorStore } from '../../../../../src/modules/pos/stores/validator';
import { EligibleValidatorsStore } from '../../../../../src/modules/pos/stores/eligible_validators';
import { StakerStore } from '../../../../../src/modules/pos/stores/staker';
import {
	StakerData,
	ModuleConfigJSON,
	StakeObject,
	StakeTransactionParams,
} from '../../../../../src/modules/pos/types';
import { EventQueue, MethodContext } from '../../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';

import { createTransactionContext, InMemoryPrefixedStateDB } from '../../../../../src/testing';
import { createStoreGetter } from '../../../../../src/testing/utils';
import { liskToBeddows } from '../../../../utils/assets';
import { DEFAULT_LOCAL_ID } from '../../../../utils/mocks/transaction';

describe('StakeCommand', () => {
	const pos = new Modules.PoS.PoSModule();
	const checkEventResult = (
		eventQueue: EventQueue,
		length: number,
		EventClass: any,
		index: number,
		expectedResult: any,
		result: any,
	) => {
		expect(eventQueue.getEvents()).toHaveLength(length);
		expect(eventQueue.getEvents()[index].toObject().name).toEqual(new EventClass('token').name);

		const eventData = codec.decode<Record<string, unknown>>(
			new EventClass('token').schema,
			eventQueue.getEvents()[index].toObject().data,
		);

		expect(eventData).toEqual({ ...expectedResult, result });
	};

	const lastBlockHeight = 200;
	const posTokenID = DEFAULT_LOCAL_ID;
	const senderPublicKey = utils.getRandomBytes(32);
	const senderAddress = address.getAddressFromPublicKey(senderPublicKey);
	const validatorAddress1 = utils.getRandomBytes(20);
	const validatorAddress2 = utils.getRandomBytes(20);
	const validatorAddress3 = utils.getRandomBytes(20);
	const validator1StakeAmount = liskToBeddows(90);
	const validator2StakeAmount = liskToBeddows(50);

	let defaultValidator: ValidatorAccount;
	let validator1: ValidatorAccount;
	let validator2: ValidatorAccount;
	let validator3: ValidatorAccount;
	let stakerStore: StakerStore;
	let validatorStore: ValidatorStore;
	let context: any;
	let transaction: any;
	let command: Modules.PoS.StakeCommand;
	let transactionParamsDecoded: any;
	let stateStore: PrefixedStateReadWriter;
	let tokenLockMock: jest.Mock;
	let tokenMethod: any;
	let internalMethod: InternalMethod;
	let mockAssignStakeRewards: jest.SpyInstance<
		Promise<void>,
		[
			methodContext: MethodContext,
			stakerAddress: Buffer,
			sentStake: StakeObject,
			validatorData: ValidatorAccount,
		]
	>;

	beforeEach(async () => {
		tokenLockMock = jest.fn();
		tokenMethod = {
			lock: tokenLockMock,
			unlock: jest.fn(),
			getAvailableBalance: jest.fn(),
			burn: jest.fn(),
			transfer: jest.fn(),
			getLockedAmount: jest.fn(),
		};

		const config = {
			...defaultConfig,
			posTokenID: '00'.repeat(TOKEN_ID_LENGTH),
		} as ModuleConfigJSON;

		await pos.init({
			genesisConfig: {} as any,
			moduleConfig: config,
		});
		internalMethod = new InternalMethod(pos.stores, pos.events, pos.name);
		internalMethod.addDependencies(tokenMethod);
		mockAssignStakeRewards = jest.spyOn(internalMethod, 'assignStakeRewards').mockResolvedValue();
		command = new Modules.PoS.StakeCommand(pos.stores, pos.events);
		command.addDependencies({
			tokenMethod,
			internalMethod,
		});
		command.init({
			posTokenID: DEFAULT_LOCAL_ID,
			factorSelfStakes: defaultConfig.maxNumberSentStakes,
			baseStakeAmount: BigInt(defaultConfig.baseStakeAmount),
			maxNumberPendingUnlocks: defaultConfig.maxNumberPendingUnlocks,
			maxNumberSentStakes: defaultConfig.maxNumberSentStakes,
		});

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

		defaultValidator = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'defaultValidator',
			reportMisbehaviorHeights: [],
			selfStake: BigInt(0),
			totalStake: BigInt(0),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
		};

		validator1 = {
			...defaultValidator,
			name: 'someValidator1',
		};

		validator2 = {
			...defaultValidator,
			name: 'someValidator2',
		};

		validator3 = {
			...defaultValidator,
			name: 'someValidator3',
		};

		stakerStore = pos.stores.get(StakerStore);
		validatorStore = pos.stores.get(ValidatorStore);

		await validatorStore.set(createStoreGetter(stateStore), validatorAddress1, validator1);
		await validatorStore.set(createStoreGetter(stateStore), validatorAddress2, validator2);
		await validatorStore.set(createStoreGetter(stateStore), validatorAddress3, validator3);

		transaction = new Transaction({
			module: 'pos',
			command: 'stake',
			fee: BigInt(1500000),
			nonce: BigInt(0),
			params: Buffer.alloc(0),
			senderPublicKey,
			signatures: [],
		});
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(command.name).toBe('stake');
		});

		it('should have valid schema', () => {
			expect(command.schema).toMatchSnapshot();
		});
	});

	describe('verify schema', () => {
		it('should return errors when transaction.params.stakes does not include any stake', () => {
			expect(() =>
				validator.validate(command.schema, {
					stakes: [],
				}),
			).toThrow('must NOT have fewer than 1 items');
		});

		it('should return errors when transaction.params.stakes includes more than 20 elements', () => {
			expect(() =>
				validator.validate(command.schema, {
					stakes: Array(21)
						.fill(0)
						.map(() => ({
							validatorAddress: utils.getRandomBytes(20),
							amount: liskToBeddows(0),
						})),
				}),
			).toThrow('must NOT have more than 20 items');
		});

		it('should return errors when transaction.params.stakes includes invalid address', () => {
			expect(() =>
				validator.validate(command.schema, {
					stakes: Array(20)
						.fill(0)
						.map(() => ({
							validatorAddress: utils.getRandomBytes(21),
							amount: liskToBeddows(0),
						})),
				}),
			).toThrow('address length invalid');
		});

		it('should return errors when transaction.params.stakes includes amount which is less than sint64 range', () => {
			expect(() =>
				validator.validate(command.schema, {
					stakes: [
						{
							validatorAddress: utils.getRandomBytes(20),
							amount: BigInt(-1) * BigInt(2) ** BigInt(63) - BigInt(1),
						},
					],
				}),
			).toThrow('should pass "dataType" keyword validation');
		});

		it('should return errors when transaction.params.stakes includes amount which is greater than sint64 range', () => {
			expect(() =>
				validator.validate(command.schema, {
					stakes: [
						{
							validatorAddress: utils.getRandomBytes(20),
							amount: BigInt(2) ** BigInt(63) + BigInt(1),
						},
					],
				}),
			).toThrow('should pass "dataType" keyword validation');
		});
	});

	describe('verify', () => {
		beforeEach(() => {
			transaction = new Transaction({
				module: 'pos',
				command: 'stake',
				fee: BigInt(1500000),
				nonce: BigInt(0),
				params: Buffer.alloc(0),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [],
			});
		});

		describe('when transaction.params.stakes contains valid contents', () => {
			it('should not throw errors with valid upstake case', async () => {
				transactionParamsDecoded = {
					stakes: [{ validatorAddress: utils.getRandomBytes(20), amount: liskToBeddows(20) }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<StakeTransactionParams>(command.schema);

				await expect(command.verify(context)).resolves.toHaveProperty(
					'status',
					StateMachine.VerifyStatus.OK,
				);
			});

			it('should not throw errors with valid downstake cast', async () => {
				transactionParamsDecoded = {
					stakes: [{ validatorAddress: utils.getRandomBytes(20), amount: liskToBeddows(-20) }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<StakeTransactionParams>(command.schema);

				await expect(command.verify(context)).resolves.toHaveProperty(
					'status',
					StateMachine.VerifyStatus.OK,
				);
			});

			it('should not throw errors with valid mixed stakes case', async () => {
				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress: utils.getRandomBytes(20), amount: liskToBeddows(20) },
						{ validatorAddress: utils.getRandomBytes(20), amount: liskToBeddows(-20) },
					],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<StakeTransactionParams>(command.schema);

				await expect(command.verify(context)).resolves.toHaveProperty(
					'status',
					StateMachine.VerifyStatus.OK,
				);
			});
		});

		describe('when transaction.params.stakes contains more than 10 positive stakes', () => {
			it('should throw error', async () => {
				transactionParamsDecoded = {
					stakes: Array(11)
						.fill(0)
						.map(() => ({ validatorAddress: utils.getRandomBytes(20), amount: liskToBeddows(10) })),
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<StakeTransactionParams>(command.schema);

				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Upstake can only be casted up to 10.',
				);
			});
		});

		describe('when transaction.params.stakes contains more than 10 negative stakes', () => {
			it('should throw error', async () => {
				transactionParamsDecoded = {
					stakes: Array(11)
						.fill(0)
						.map(() => ({
							validatorAddress: utils.getRandomBytes(20),
							amount: liskToBeddows(-10),
						})),
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<StakeTransactionParams>(command.schema);

				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Downstake can only be casted up to 10.',
				);
			});
		});

		describe('when transaction.params.stakes includes duplicate validators within positive amount', () => {
			it('should throw error', async () => {
				const validatorAddress = utils.getRandomBytes(20);
				transactionParamsDecoded = {
					stakes: Array(2).fill({ validatorAddress, amount: liskToBeddows(10) }),
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<StakeTransactionParams>(command.schema);

				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Validator address must be unique.',
				);
			});
		});

		describe('when transaction.params.stakes includes duplicate validators within positive and negative amount', () => {
			it('should throw error', async () => {
				const validatorAddress = utils.getRandomBytes(20);
				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress, amount: liskToBeddows(10) },
						{ validatorAddress, amount: liskToBeddows(-10) },
					],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<StakeTransactionParams>(command.schema);

				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Validator address must be unique.',
				);
			});
		});

		describe('when transaction.params.stakes includes zero amount', () => {
			it('should throw error', async () => {
				const validatorAddress = utils.getRandomBytes(20);
				transactionParamsDecoded = {
					stakes: [{ validatorAddress, amount: liskToBeddows(0) }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<StakeTransactionParams>(command.schema);

				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Amount cannot be 0.',
				);
			});
		});

		describe('when transaction.params.stakes includes positive amount which is not multiple of 10 * 10^8', () => {
			it('should throw an error', async () => {
				const validatorAddress = utils.getRandomBytes(20);
				transactionParamsDecoded = {
					stakes: [{ validatorAddress, amount: BigInt(20) }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<StakeTransactionParams>(command.schema);

				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Amount should be multiple of 10 * 10^8.',
				);
			});
		});

		describe('when transaction.params.stakes includes negative amount which is not multiple of 10 * 10^8', () => {
			it('should throw error', async () => {
				const validatorAddress = utils.getRandomBytes(20);
				transactionParamsDecoded = {
					stakes: [{ validatorAddress, amount: BigInt(-20) }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<StakeTransactionParams>(command.schema);

				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Amount should be multiple of 10 * 10^8.',
				);
			});
		});
	});

	describe('execute', () => {
		describe('when transaction.params.stakes contain positive amount', () => {
			it('should emit ValidatorStakedEvent with STAKE_SUCCESSFUL result', async () => {
				transactionParamsDecoded = {
					stakes: [{ validatorAddress: validatorAddress1, amount: liskToBeddows(10) }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await expect(command.execute(context)).resolves.toBeUndefined();

				checkEventResult(
					context.eventQueue,
					1,
					ValidatorStakedEvent,
					0,
					{
						senderAddress,
						validatorAddress: transactionParamsDecoded.stakes[0].validatorAddress,
						amount: transactionParamsDecoded.stakes[0].amount,
					},
					PoSEventResult.STAKE_SUCCESSFUL,
				);
			});

			it('should throw error if stake amount is more than balance', async () => {
				transactionParamsDecoded = {
					stakes: [{ validatorAddress: utils.getRandomBytes(20), amount: liskToBeddows(100) }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				tokenLockMock.mockRejectedValue(new Error('Not enough balance to lock'));

				await expect(command.execute(context)).rejects.toThrow();
			});

			it('should make account to have correct balance', async () => {
				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress: validatorAddress1, amount: validator1StakeAmount },
						{ validatorAddress: validatorAddress2, amount: validator2StakeAmount },
					],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				expect(tokenLockMock).toHaveBeenCalledTimes(2);
				expect(tokenLockMock).toHaveBeenCalledWith(
					expect.anything(),
					senderAddress,
					MODULE_NAME_POS,
					posTokenID,
					validator1StakeAmount,
				);
				expect(tokenLockMock).toHaveBeenCalledWith(
					expect.anything(),
					senderAddress,
					MODULE_NAME_POS,
					posTokenID,
					validator2StakeAmount,
				);
			});

			it('should not change pendingUnlocks', async () => {
				transactionParamsDecoded = {
					stakes: [{ validatorAddress: validatorAddress1, amount: validator1StakeAmount }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				const { pendingUnlocks } = await stakerStore.get(
					createStoreGetter(stateStore),
					senderAddress,
				);

				expect(pendingUnlocks).toHaveLength(0);
			});

			it('should order stakerData.stakes', async () => {
				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress: validatorAddress2, amount: validator2StakeAmount },
						{ validatorAddress: validatorAddress1, amount: validator1StakeAmount },
					],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				const { stakes } = await stakerStore.get(createStoreGetter(stateStore), senderAddress);

				const stakesCopy = stakes.slice(0);
				stakesCopy.sort((a: any, b: any) => a.validatorAddress.compare(b.validatorAddress));

				expect(stakes).toStrictEqual(stakesCopy);
			});

			it('should correctly update validator totalStake when a staker is upstaking for the first time', async () => {
				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress: validatorAddress1, amount: validator1StakeAmount },
						{ validatorAddress: validatorAddress2, amount: validator2StakeAmount },
					],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				const { totalStake: totalStake1 } = await validatorStore.get(
					createStoreGetter(stateStore),
					validatorAddress1,
				);
				const { totalStake: totalStake2 } = await validatorStore.get(
					createStoreGetter(stateStore),
					validatorAddress2,
				);

				expect(totalStake1).toBe(validator1StakeAmount);
				expect(totalStake2).toBe(validator2StakeAmount);
			});

			it("should increase staker's stakes.amount and validator's totalStake when an existing staker further increases their stake", async () => {
				const previousStakeAmount = liskToBeddows(120);
				const newStakeAmount = liskToBeddows(88);

				const validatorAccount: ValidatorAccount = {
					...validator1,
					totalStake: previousStakeAmount,
					selfStake: liskToBeddows(50),
				};
				const stakerData: StakerData = {
					stakes: [
						{
							validatorAddress: validatorAddress1,
							amount: previousStakeAmount,
							sharingCoefficients: validatorAccount.sharingCoefficients,
						},
					],
					pendingUnlocks: [],
				};

				await stakerStore.set(createStoreGetter(stateStore), senderAddress, stakerData);
				await validatorStore.set(
					createStoreGetter(stateStore),
					validatorAddress1,
					validatorAccount,
				);

				transactionParamsDecoded = {
					stakes: [{ validatorAddress: validatorAddress1, amount: newStakeAmount }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				const { totalStake } = await validatorStore.get(
					createStoreGetter(stateStore),
					validatorAddress1,
				);
				const { stakes } = await stakerStore.get(createStoreGetter(stateStore), senderAddress);

				expect(totalStake).toBe(previousStakeAmount + newStakeAmount);
				expect(stakes[0].amount).toBe(previousStakeAmount + newStakeAmount);
			});

			it('should create a new entry in staker store, when a new staker upstakes', async () => {
				transactionParamsDecoded = {
					stakes: [{ validatorAddress: validatorAddress1, amount: validator1StakeAmount }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await expect(
					stakerStore.get(createStoreGetter(stateStore), senderAddress),
				).rejects.toThrow();

				await command.execute(context);
				const { stakes } = await stakerStore.get(createStoreGetter(stateStore), senderAddress);
				expect(stakes[0]).toEqual({
					validatorAddress: validatorAddress1,
					amount: validator1StakeAmount,
					sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
				});
			});
		});

		describe('when transaction.params.stakes contain negative amount which decreases StakerData.stakes[x].amount to 0', () => {
			beforeEach(async () => {
				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress: validatorAddress1, amount: validator1StakeAmount },
						{ validatorAddress: validatorAddress2, amount: validator2StakeAmount },
					],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress: validatorAddress1, amount: validator1StakeAmount * BigInt(-1) },
						{ validatorAddress: validatorAddress2, amount: validator2StakeAmount * BigInt(-1) },
					],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				tokenLockMock.mockClear();
			});

			it('should emit ValidatorStakedEvent with STAKE_SUCCESSFUL result', async () => {
				await expect(command.execute(context)).resolves.toBeUndefined();

				for (let i = 0; i < 2; i += 2) {
					checkEventResult(
						context.eventQueue,
						2,
						ValidatorStakedEvent,
						0,
						{
							senderAddress,
							validatorAddress: transactionParamsDecoded.stakes[i].validatorAddress,
							amount: transactionParamsDecoded.stakes[i].amount,
						},
						PoSEventResult.STAKE_SUCCESSFUL,
					);
				}
			});

			it('should not change account balance', async () => {
				await command.execute(context);

				expect(tokenLockMock).toHaveBeenCalledTimes(0);
			});

			it('should remove stake which has zero amount', async () => {
				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress: validatorAddress1, amount: validator1StakeAmount * BigInt(-1) },
					],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				const stakerData = await stakerStore.get(createStoreGetter(stateStore), senderAddress);

				expect(stakerData.stakes).toHaveLength(1);
				expect(stakerData.stakes[0].validatorAddress).not.toEqual(validatorAddress1);
			});

			it('should update stake which has non-zero amount', async () => {
				const downStakeAmount = liskToBeddows(10);

				transactionParamsDecoded = {
					stakes: [{ validatorAddress: validatorAddress1, amount: downStakeAmount * BigInt(-1) }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				const stakerData = await stakerStore.get(createStoreGetter(stateStore), senderAddress);

				expect(
					stakerData.stakes.find(val => val.validatorAddress.equals(validatorAddress1)),
				).toEqual({
					validatorAddress: validatorAddress1,
					amount: validator1StakeAmount - downStakeAmount,
					sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
				});
			});

			it('should make account to have correct unlocking', async () => {
				await command.execute(context);

				const stakerData = await stakerStore.get(createStoreGetter(stateStore), senderAddress);

				expect(stakerData.pendingUnlocks).toHaveLength(2);
				expect(stakerData.pendingUnlocks).toEqual(
					[
						{
							validatorAddress: validatorAddress1,
							amount: validator1StakeAmount,
							unstakeHeight: lastBlockHeight,
						},
						{
							validatorAddress: validatorAddress2,
							amount: validator2StakeAmount,
							unstakeHeight: lastBlockHeight,
						},
					].sort((a, b) => a.validatorAddress.compare(b.validatorAddress)),
				);
			});

			it('should order stakerData.pendingUnlocks', async () => {
				await command.execute(context);

				const stakerData = await stakerStore.get(createStoreGetter(stateStore), senderAddress);

				expect(stakerData.pendingUnlocks).toHaveLength(2);
				expect(stakerData.pendingUnlocks.map((d: any) => d.validatorAddress)).toEqual(
					[validatorAddress1, validatorAddress2].sort((a, b) => a.compare(b)),
				);
			});

			it('should make downstaked validator account to have correct totalStake', async () => {
				await command.execute(context);

				const validatorData1 = await validatorStore.get(
					createStoreGetter(stateStore),
					validatorAddress1,
				);
				const validatorData2 = await validatorStore.get(
					createStoreGetter(stateStore),
					validatorAddress2,
				);

				expect(validatorData1.totalStake).toEqual(BigInt(0));
				expect(validatorData2.totalStake).toEqual(BigInt(0));
			});

			it('should throw error and emit ValidatorStakedEvent with STAKE_FAILED_INVALID_UNSTAKE_PARAMETERS result when downstaked validator is not already upstaked', async () => {
				const downStakeAmount = liskToBeddows(10);

				transactionParamsDecoded = {
					stakes: [{ validatorAddress: validatorAddress3, amount: downStakeAmount * BigInt(-1) }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await expect(command.execute(context)).rejects.toThrow(
					'Cannot cast downstake to validator who is not upstaked.',
				);

				checkEventResult(
					context.eventQueue,
					1,
					ValidatorStakedEvent,
					0,
					{
						senderAddress,
						validatorAddress: transactionParamsDecoded.stakes[0].validatorAddress,
						amount: transactionParamsDecoded.stakes[0].amount,
					},
					PoSEventResult.STAKE_FAILED_INVALID_UNSTAKE_PARAMETERS,
				);
			});
		});

		describe('when transaction.params.stakes contain negative and positive amount', () => {
			const positiveStakeValidator1 = liskToBeddows(10);
			const negativeStakeValidator2 = liskToBeddows(-20);
			beforeEach(async () => {
				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress: validatorAddress1, amount: validator1StakeAmount },
						{ validatorAddress: validatorAddress2, amount: validator2StakeAmount },
					],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress: validatorAddress1, amount: positiveStakeValidator1 },
						{ validatorAddress: validatorAddress2, amount: negativeStakeValidator2 },
					].sort((a, b) => -1 * a.validatorAddress.compare(b.validatorAddress)),
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				tokenLockMock.mockClear();
			});

			it('should assign reward to staker for downstake and upstake for already staked validator', async () => {
				await expect(command.execute(context)).resolves.toBeUndefined();

				expect(mockAssignStakeRewards).toHaveBeenCalledTimes(2);
			});

			it('should assign sharingCoefficients of the validator to the corresponding stake of the staker for that validator', async () => {
				const sharingCoefficients = [
					{
						tokenID: Buffer.alloc(8),
						coefficient: Buffer.alloc(24, 0),
					},
					{
						tokenID: Buffer.alloc(8),
						coefficient: Buffer.alloc(24, 1),
					},
				];

				validator1.sharingCoefficients = sharingCoefficients;
				validator2.sharingCoefficients = sharingCoefficients;

				await validatorStore.set(createStoreGetter(stateStore), validatorAddress1, validator1);
				await validatorStore.set(createStoreGetter(stateStore), validatorAddress2, validator2);

				await expect(command.execute(context)).resolves.toBeUndefined();

				const { stakes } = await stakerStore.get(createStoreGetter(stateStore), senderAddress);

				expect(
					stakes.find(stake => stake.validatorAddress.equals(validatorAddress1))
						?.sharingCoefficients,
				).toEqual(sharingCoefficients);
				expect(
					stakes.find(stake => stake.validatorAddress.equals(validatorAddress2))
						?.sharingCoefficients,
				).toEqual(sharingCoefficients);
			});

			it('should not assign rewards to staker for first upstake for the validator', async () => {
				transactionParamsDecoded = {
					stakes: [{ validatorAddress: validatorAddress3, amount: positiveStakeValidator1 }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await expect(command.execute(context)).resolves.toBeUndefined();
			});

			it('should update staked validator in EligibleValidatorStore', async () => {
				const validatorAddress = utils.getRandomBytes(20);
				const selfStake = BigInt(2) + BigInt(defaultConfig.minWeightStandby);

				const val = {
					...validator1,
					selfStake,
					totalStake: BigInt(1) + BigInt(100) * BigInt(defaultConfig.minWeightStandby),
				};
				const expectedWeight = BigInt(10) * selfStake;
				await validatorStore.set(createStoreGetter(stateStore), validatorAddress, val);

				transactionParamsDecoded = {
					stakes: [{ validatorAddress, amount: positiveStakeValidator1 }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				const eligibleValidatorStore = pos.stores.get(EligibleValidatorsStore);

				expect(
					await eligibleValidatorStore.get(
						context,
						eligibleValidatorStore.getKey(validatorAddress, expectedWeight),
					),
				).toBeDefined();

				transactionParamsDecoded = {
					stakes: [{ validatorAddress, amount: BigInt(-2) }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				expect(
					await eligibleValidatorStore.get(
						context,
						eligibleValidatorStore.getKey(validatorAddress, expectedWeight),
					),
				).toBeDefined();
			});

			it('should make staker to have correct balance', async () => {
				await command.execute(context);

				expect(tokenLockMock).toHaveBeenCalledTimes(1);
				expect(tokenLockMock).toHaveBeenCalledWith(
					expect.anything(),
					senderAddress,
					MODULE_NAME_POS,
					posTokenID,
					positiveStakeValidator1,
				);
			});

			it('should make staker to have correct unlocking', async () => {
				await command.execute(context);

				const stakerData = await stakerStore.get(createStoreGetter(stateStore), senderAddress);
				expect(stakerData.pendingUnlocks).toHaveLength(1);
				expect(stakerData.pendingUnlocks).toEqual([
					{
						validatorAddress: validatorAddress2,
						amount: BigInt(-1) * negativeStakeValidator2,
						unstakeHeight: lastBlockHeight,
					},
				]);
			});

			it('should make upstaked validator account to have correct totalStake', async () => {
				await command.execute(context);

				const updatedValidator1 = await validatorStore.get(
					createStoreGetter(stateStore),
					validatorAddress1,
				);

				expect(updatedValidator1.totalStake).toEqual(
					validator1StakeAmount + positiveStakeValidator1,
				);
			});

			it('should make downstaked validator account to have correct totalStake', async () => {
				await command.execute(context);

				const validatorData2 = await validatorStore.get(
					createStoreGetter(stateStore),
					validatorAddress2,
				);

				expect(validatorData2.totalStake).toEqual(validator2StakeAmount + negativeStakeValidator2);
			});
		});

		describe('when transaction.params.stakes contain invalid data', () => {
			beforeEach(() => {
				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress: validatorAddress1, amount: validator1StakeAmount },
						{ validatorAddress: validatorAddress2, amount: validator2StakeAmount },
					].sort((a, b) => -1 * a.validatorAddress.compare(b.validatorAddress)),
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				tokenLockMock.mockClear();
			});

			describe('when transaction.params.stakes contain validator address which is not registered', () => {
				it('should throw error and emit ValidatorStakedEevnt with STAKE_FAILED_NON_REGISTERED_VALIDATOR failure', async () => {
					const nonExistingValidatorAddress = utils.getRandomBytes(20);

					transactionParamsDecoded = {
						...transactionParamsDecoded,
						stakes: [{ validatorAddress: nonExistingValidatorAddress, amount: liskToBeddows(76) }],
					};
					transaction.params = codec.encode(command.schema, transactionParamsDecoded);
					context = createTransactionContext({
						transaction,
						stateStore,
						header: {
							height: lastBlockHeight,
						} as any,
					}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

					await expect(command.execute(context)).rejects.toThrow(
						'Invalid stake: no registered validator with the specified address',
					);

					checkEventResult(
						context.eventQueue,
						1,
						ValidatorStakedEvent,
						0,
						{
							senderAddress,
							validatorAddress: transactionParamsDecoded.stakes[0].validatorAddress,
							amount: transactionParamsDecoded.stakes[0].amount,
						},
						PoSEventResult.STAKE_FAILED_NON_REGISTERED_VALIDATOR,
					);
				});
			});

			describe('when transaction.params.stakes positive amount makes StakerData.stakes array contain more than 10 elements', () => {
				it('should throw error and emit ValidatorStakedEvent with STAKE_FAILED_TOO_MANY_SENT_STAKES failure', async () => {
					const stakes = [];

					for (let i = 0; i < 12; i += 1) {
						const validatorAddress = utils.getRandomBytes(20);

						const validatorInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someValidator${i}`,
							reportMisbehaviorHeights: [],
							selfStake: BigInt(0),
							totalStake: BigInt(0),
							commission: 0,
							lastCommissionIncreaseHeight: 0,
							sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
						};

						await validatorStore.set(
							createStoreGetter(stateStore),
							validatorAddress,
							validatorInfo,
						);
						stakes.push({
							validatorAddress,
							amount: liskToBeddows(10),
						});
					}

					transactionParamsDecoded = { stakes };
					transaction.params = codec.encode(command.schema, transactionParamsDecoded);
					context = createTransactionContext({
						transaction,
						stateStore,
					}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

					await expect(command.execute(context)).rejects.toThrow('Sender can only stake upto 10.');

					checkEventResult(
						context.eventQueue,
						11,
						ValidatorStakedEvent,
						10,
						{
							senderAddress,
							validatorAddress: transactionParamsDecoded.stakes[10].validatorAddress,
							amount: transactionParamsDecoded.stakes[10].amount,
						},
						PoSEventResult.STAKE_FAILED_TOO_MANY_SENT_STAKES,
					);
				});
			});

			describe('when transaction.params.stakes negative amount decrease StakerData.stakes array entries, yet positive amount makes account exceeds more than 10', () => {
				it('should throw error and emit ValidatorStakedEvent with STAKE_FAILED_TOO_MANY_SENT_STAKES failure', async () => {
					const initialValidatorAmount = 8;
					const stakerData = await stakerStore.getOrDefault(
						createStoreGetter(stateStore),
						senderAddress,
					);

					// Suppose account already staked for 8 validators
					for (let i = 0; i < initialValidatorAmount; i += 1) {
						const validatorAddress = utils.getRandomBytes(20);

						const validatorInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someValidator${i}`,
							reportMisbehaviorHeights: [],
							selfStake: BigInt(0),
							totalStake: BigInt(0),
							commission: 0,
							lastCommissionIncreaseHeight: 0,
							sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
						};

						await validatorStore.set(
							createStoreGetter(stateStore),
							validatorAddress,
							validatorInfo,
						);

						const stake = {
							validatorAddress,
							amount: liskToBeddows(20),
							sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
						};
						stakerData.stakes.push(stake);
					}

					await stakerStore.set(createStoreGetter(stateStore), senderAddress, stakerData);

					// We have 2 negative stakes
					const stakes = [
						{
							validatorAddress: stakerData.stakes[0].validatorAddress,
							amount: liskToBeddows(-10),
						},
						{
							validatorAddress: stakerData.stakes[1].validatorAddress,
							amount: liskToBeddows(-10),
						},
					];

					// We have 3 positive stakes
					for (let i = 0; i < 3; i += 1) {
						const validatorAddress = utils.getRandomBytes(20);

						const validatorInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someValidator${i + initialValidatorAmount}`,
							reportMisbehaviorHeights: [],
							selfStake: BigInt(0),
							totalStake: BigInt(0),
							commission: 0,
							lastCommissionIncreaseHeight: 0,
							sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
						};

						await validatorStore.set(
							createStoreGetter(stateStore),
							validatorAddress,
							validatorInfo,
						);

						stakes.push({
							validatorAddress,
							amount: liskToBeddows(10),
						});
					}

					// Account already contains 8 positive stakes
					// now we added 2 negative stakes and 3 new positive stakes
					// which will make total positive stakes to grow over 10
					transactionParamsDecoded = { stakes };
					transaction.params = codec.encode(command.schema, transactionParamsDecoded);
					context = createTransactionContext({
						transaction,
						stateStore,
					}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

					await expect(command.execute(context)).rejects.toThrow('Sender can only stake upto 10.');

					checkEventResult(
						context.eventQueue,
						5,
						ValidatorStakedEvent,
						4,
						{
							senderAddress,
							validatorAddress: stakes[4].validatorAddress,
							amount: stakes[4].amount,
						},
						PoSEventResult.STAKE_FAILED_TOO_MANY_SENT_STAKES,
					);
				});
			});

			describe('when transaction.params.stakes has negative amount and makes stakerData.pendingUnlocks more than 20 entries', () => {
				it('should throw error and emit ValidatorStakedEvent with STAKE_FAILED_TOO_MANY_PENDING_UNLOCKS failure', async () => {
					const initialValidatorAmountForUnlocks = 19;
					const stakerData = await stakerStore.getOrDefault(
						createStoreGetter(stateStore),
						senderAddress,
					);

					// Suppose account already 19 unlocking
					for (let i = 0; i < initialValidatorAmountForUnlocks; i += 1) {
						const validatorAddress = utils.getRandomBytes(20);

						const validatorInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someValidator${i}`,
							reportMisbehaviorHeights: [],
							selfStake: BigInt(0),
							totalStake: BigInt(0),
							commission: 0,
							lastCommissionIncreaseHeight: 0,
							sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
						};

						await validatorStore.set(
							createStoreGetter(stateStore),
							validatorAddress,
							validatorInfo,
						);

						const pendingUnlock = {
							validatorAddress,
							amount: liskToBeddows(20),
							unstakeHeight: i,
						};
						stakerData.pendingUnlocks.push(pendingUnlock);
					}

					// Suppose account have 5 positive stakes
					for (let i = 0; i < 5; i += 1) {
						const validatorAddress = utils.getRandomBytes(20);

						const validatorInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someValidator${i}`,
							reportMisbehaviorHeights: [],
							selfStake: BigInt(0),
							totalStake: BigInt(0),
							commission: 0,
							lastCommissionIncreaseHeight: 0,
							sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
						};

						await validatorStore.set(
							createStoreGetter(stateStore),
							validatorAddress,
							validatorInfo,
						);

						const stake = {
							validatorAddress,
							amount: liskToBeddows(20),
							sharingCoefficients: [],
						};
						stakerData.stakes.push(stake);
					}

					await stakerStore.set(createStoreGetter(stateStore), senderAddress, stakerData);

					// We have 2 negative stakes
					const stakes = [
						{
							validatorAddress: stakerData.stakes[0].validatorAddress,
							amount: liskToBeddows(-10),
						},
						{
							validatorAddress: stakerData.stakes[1].validatorAddress,
							amount: liskToBeddows(-10),
						},
					];

					// Account already contains 19 unlocking and 5 positive stakes
					// now we added 2 negative stakes
					// which will make total unlocking to grow over 20
					transactionParamsDecoded = { stakes };
					transaction.params = codec.encode(command.schema, transactionParamsDecoded);
					context = createTransactionContext({
						transaction,
						stateStore,
					}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

					await expect(command.execute(context)).rejects.toThrow(
						`Pending unlocks cannot exceed ${defaultConfig.maxNumberPendingUnlocks}.`,
					);

					checkEventResult(
						context.eventQueue,
						2,
						ValidatorStakedEvent,
						1,
						{
							senderAddress,
							validatorAddress: stakes[1].validatorAddress,
							amount: stakes[1].amount,
						},
						PoSEventResult.STAKE_FAILED_TOO_MANY_PENDING_UNLOCKS,
					);

					expect(mockAssignStakeRewards).toHaveBeenCalledTimes(stakes.length);
				});
			});

			describe('when transaction.params.stakes negative amount exceeds the previously staked amount', () => {
				it('should throw error and emit ValidatorStakedEvent with STAKE_FAILED_INVALID_UNSTAKE_PARAMETERS', async () => {
					const stakerData = await stakerStore.getOrDefault(
						createStoreGetter(stateStore),
						senderAddress,
					);
					stakerData.stakes.push({
						validatorAddress: validatorAddress1,
						amount: liskToBeddows(70),
						sharingCoefficients: [],
					});
					await stakerStore.set(createStoreGetter(stateStore), senderAddress, stakerData);

					transactionParamsDecoded = {
						stakes: [
							{
								validatorAddress: validatorAddress1,
								amount: liskToBeddows(-80),
							},
						],
					};
					transaction.params = codec.encode(command.schema, transactionParamsDecoded);
					context = createTransactionContext({
						transaction,
						stateStore,
					}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

					await expect(command.execute(context)).rejects.toThrow(
						'The unstake amount exceeds the staked amount for this validator.',
					);

					checkEventResult(
						context.eventQueue,
						1,
						ValidatorStakedEvent,
						0,
						{
							senderAddress,
							validatorAddress: transactionParamsDecoded.stakes[0].validatorAddress,
							amount: transactionParamsDecoded.stakes[0].amount,
						},
						PoSEventResult.STAKE_FAILED_INVALID_UNSTAKE_PARAMETERS,
					);
				});
			});
		});

		describe('when transaction.params.stakes contains self-stake', () => {
			const senderStakeAmountPositive = liskToBeddows(80);
			const senderStakeAmountNegative = liskToBeddows(20);
			let totalStake: bigint;
			let selfStake: bigint;
			beforeEach(async () => {
				totalStake = BigInt(20);
				selfStake = BigInt(20);

				const validatorInfo = {
					...validator1,
					totalStake,
					selfStake,
				};
				await validatorStore.set(createStoreGetter(stateStore), senderAddress, validatorInfo);

				transactionParamsDecoded = {
					stakes: [{ validatorAddress: senderAddress, amount: senderStakeAmountPositive }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				tokenLockMock.mockClear();
			});

			it('should update stakes and totalStake', async () => {
				await command.execute(context);

				const validatorData = await validatorStore.get(
					createStoreGetter(stateStore),
					senderAddress,
				);
				const stakerData = await stakerStore.getOrDefault(
					createStoreGetter(stateStore),
					senderAddress,
				);

				expect(validatorData.totalStake).toEqual(totalStake + senderStakeAmountPositive);
				expect(stakerData.stakes).toHaveLength(1);
				expect(tokenLockMock).toHaveBeenCalledWith(
					expect.anything(),
					senderAddress,
					MODULE_NAME_POS,
					posTokenID,
					senderStakeAmountPositive,
				);
			});

			it('should change validatorData.selfStake and totalStake with positive stake', async () => {
				await command.execute(context);

				const validatorData = await validatorStore.get(
					createStoreGetter(stateStore),
					senderAddress,
				);

				expect(validatorData.totalStake).toEqual(totalStake + senderStakeAmountPositive);
				expect(validatorData.selfStake).toEqual(selfStake + senderStakeAmountPositive);
			});

			it('should change validatorData.selfStake, totalStake and unlocking with negative stake', async () => {
				await command.execute(context);

				transactionParamsDecoded = {
					stakes: [
						{ validatorAddress: senderAddress, amount: senderStakeAmountNegative * BigInt(-1) },
					],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				const validatorData = await validatorStore.get(
					createStoreGetter(stateStore),
					senderAddress,
				);
				const stakerData = await stakerStore.getOrDefault(
					createStoreGetter(stateStore),
					senderAddress,
				);

				expect(validatorData.totalStake).toEqual(
					totalStake + senderStakeAmountPositive - senderStakeAmountNegative,
				);
				expect(validatorData.selfStake).toEqual(
					totalStake + senderStakeAmountPositive - senderStakeAmountNegative,
				);
				expect(stakerData.stakes).toHaveLength(1);
				expect(stakerData.stakes).toEqual([
					{
						validatorAddress: senderAddress,
						amount: senderStakeAmountPositive - senderStakeAmountNegative,
						sharingCoefficients: [
							{
								tokenID: Buffer.alloc(8),
								coefficient: Buffer.alloc(24),
							},
						],
					},
				]);
				expect(stakerData.pendingUnlocks).toHaveLength(1);
				expect(stakerData.pendingUnlocks).toEqual([
					{
						validatorAddress: senderAddress,
						amount: senderStakeAmountNegative,
						unstakeHeight: lastBlockHeight,
					},
				]);
			});
		});

		describe('when transaction.params.stakes does not contain self-stake', () => {
			const senderStakeAmountPositive = liskToBeddows(80);
			const senderStakeAmountNegative = liskToBeddows(20);
			const validatorSelfStake = liskToBeddows(2000);
			const validatorAddress = utils.getRandomBytes(20);
			let validatorInfo;
			beforeEach(async () => {
				validatorInfo = {
					consecutiveMissedBlocks: 0,
					isBanned: false,
					lastGeneratedHeight: 5,
					name: 'validator',
					reportMisbehaviorHeights: [],
					selfStake: validatorSelfStake,
					totalStake: validatorSelfStake,
					commission: 0,
					lastCommissionIncreaseHeight: 0,
					sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
				};

				await validatorStore.set(createStoreGetter(stateStore), validatorAddress, validatorInfo);

				transactionParamsDecoded = {
					stakes: [{ validatorAddress, amount: senderStakeAmountPositive }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				tokenLockMock.mockClear();
			});

			it('should not change validatorData.selfStake but should update totalStake with positive stake', async () => {
				await command.execute(context);

				const validatorData = await validatorStore.get(
					createStoreGetter(stateStore),
					validatorAddress,
				);

				expect(validatorData.totalStake).toEqual(senderStakeAmountPositive + validatorSelfStake);
				expect(validatorData.selfStake).toEqual(validatorSelfStake);
			});

			it('should not change validatorData.selfStake but should change totalStake and unlocking with negative stake', async () => {
				await command.execute(context);

				transactionParamsDecoded = {
					stakes: [{ validatorAddress, amount: senderStakeAmountNegative * BigInt(-1) }],
				};
				transaction.params = codec.encode(command.schema, transactionParamsDecoded);
				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<StakeTransactionParams>(command.schema);

				await command.execute(context);

				const validatorData = await validatorStore.get(
					createStoreGetter(stateStore),
					validatorAddress,
				);
				const stakerData = await stakerStore.getOrDefault(
					createStoreGetter(stateStore),
					senderAddress,
				);

				expect(validatorData.totalStake).toEqual(
					senderStakeAmountPositive - senderStakeAmountNegative + validatorSelfStake,
				);
				expect(validatorData.selfStake).toEqual(validatorSelfStake);
				expect(stakerData.stakes).toHaveLength(1);
				expect(stakerData.stakes).toEqual([
					{
						validatorAddress,
						amount: senderStakeAmountPositive - senderStakeAmountNegative,
						sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				]);
				expect(stakerData.pendingUnlocks).toHaveLength(1);
				expect(stakerData.pendingUnlocks).toEqual([
					{
						validatorAddress,
						amount: senderStakeAmountNegative,
						unstakeHeight: lastBlockHeight,
					},
				]);
			});
		});
	});
});
