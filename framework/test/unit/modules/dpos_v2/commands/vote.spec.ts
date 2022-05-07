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

import { NotFoundError, StateStore, Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getAddressFromPublicKey, getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { validator } from '@liskhq/lisk-validator';
import { when } from 'jest-when';
import { VoteCommand } from '../../../../../src/modules/dpos_v2/commands/vote';
import {
	COMMAND_ID_VOTE,
	MAX_UNLOCKING,
	MODULE_ID_DPOS,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_VOTER,
} from '../../../../../src/modules/dpos_v2/constants';
import { delegateStoreSchema, voterStoreSchema } from '../../../../../src/modules/dpos_v2/schemas';
import { DelegateAccount, VoteTransactionParams } from '../../../../../src/modules/dpos_v2/types';
import { getVoterOrDefault } from '../../../../../src/modules/dpos_v2/utils';
import { VerifyStatus } from '../../../../../src/node/state_machine/types';
import { createTransactionContext } from '../../../../../src/testing';
import { liskToBeddows } from '../../../../utils/assets';
import { DEFAULT_TOKEN_ID } from '../../../../utils/node/transaction';

describe('VoteCommand', () => {
	const lastBlockHeight = 200;
	const tokenIDDPoS = DEFAULT_TOKEN_ID;
	const senderPublicKey = getRandomBytes(32);
	const senderAddress = getAddressFromPublicKey(senderPublicKey);
	const delegateAddress1 = getRandomBytes(20);
	const delegateAddress2 = getRandomBytes(20);
	const delegateAddress3 = getRandomBytes(20);
	const delegate1VoteAmount = liskToBeddows(90);
	const delegate2VoteAmount = liskToBeddows(50);
	const getWithSchemaMock = jest.fn();
	const storeMock = jest.fn().mockReturnValue({
		getWithSchema: getWithSchemaMock,
	});

	let delegateInfo1: DelegateAccount;
	let delegateInfo2: DelegateAccount;
	let delegateInfo3: DelegateAccount;
	let voterStore: any;
	let delegateStore: any;
	let context: any;
	let transaction: any;
	let command: VoteCommand;
	let transactionParams: Buffer;
	let transactionParamsDecoded: any;
	let stateStore: any;
	let lockFn: any;

	beforeEach(async () => {
		lockFn = jest.fn();
		command = new VoteCommand(MODULE_ID_DPOS);
		command.addDependencies({
			tokenAPI: {
				lock: lockFn,
				unlock: jest.fn(),
				getAvailableBalance: jest.fn(),
				transfer: jest.fn(),
				getLockedAmount: jest.fn(),
			},
		});
		command.init({
			tokenIDDPoS: DEFAULT_TOKEN_ID,
		});

		stateStore = {
			getStore: storeMock,
		};

		delegateInfo1 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'someDelegate1',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(0),
		};

		delegateInfo2 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'someDelegate2',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(0),
		};

		delegateInfo3 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'someDelegate3',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(0),
		};

		when(getWithSchemaMock)
			.calledWith(delegateAddress1, delegateStoreSchema)
			.mockReturnValue(delegateInfo1);

		when(getWithSchemaMock)
			.calledWith(delegateAddress2, delegateStoreSchema)
			.mockReturnValue(delegateInfo2);

		when(getWithSchemaMock)
			.calledWith(senderAddress, voterStoreSchema)
			.mockRejectedValue(new NotFoundError(Buffer.alloc(0)));

		stateStore = new StateStore(new InMemoryKVStore());
		voterStore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_VOTER);
		delegateStore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);

		await delegateStore.setWithSchema(delegateAddress1, delegateInfo1, delegateStoreSchema);
		await delegateStore.setWithSchema(delegateAddress2, delegateInfo2, delegateStoreSchema);
		await delegateStore.setWithSchema(delegateAddress3, delegateInfo3, delegateStoreSchema);
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(command.id).toEqual(COMMAND_ID_VOTE);
		});

		it('should have valid name', () => {
			expect(command.name).toEqual('voteDelegate');
		});

		it('should have valid schema', () => {
			expect(command.schema).toMatchSnapshot();
		});
	});

	describe('verify', () => {
		beforeEach(() => {
			transaction = new Transaction({
				moduleID: MODULE_ID_DPOS,
				commandID: COMMAND_ID_VOTE,
				fee: BigInt(1500000),
				nonce: BigInt(0),
				params: Buffer.alloc(0),
				senderPublicKey: getRandomBytes(32),
				signatures: [],
			});
		});

		describe('schema validation', () => {
			describe('when transaction.params.votes does not include any vote', () => {
				beforeEach(() => {
					transactionParamsDecoded = {
						votes: [],
					};

					transactionParams = codec.encode(command.schema, transactionParamsDecoded);

					transaction.params = transactionParams;

					context = createTransactionContext({
						transaction,
						stateStore,
					}).createCommandExecuteContext<VoteTransactionParams>(command.schema);
				});

				it('should return errors', async () => {
					const verificationResult = await command.verify(context);
					expect((verificationResult.error as any).value).toHaveLength(1);
					expect((verificationResult.error as any).value[0].message).toInclude(
						'must NOT have fewer than 1 items',
					);
				});
			});

			describe('when transaction.params.votes includes more than 20 elements', () => {
				beforeEach(() => {
					transactionParamsDecoded = {
						votes: Array(21)
							.fill(0)
							.map(() => ({ delegateAddress: getRandomBytes(20), amount: liskToBeddows(0) })),
					};

					transactionParams = codec.encode(command.schema, transactionParamsDecoded);

					transaction.params = transactionParams;

					context = createTransactionContext({
						transaction,
						stateStore,
					}).createCommandExecuteContext<VoteTransactionParams>(command.schema);
				});

				it('should return errors', async () => {
					const verificationResult = await command.verify(context);
					expect((verificationResult.error as any).value).toHaveLength(1);
					expect((verificationResult.error as any).value[0].message).toInclude(
						'must NOT have more than 20 items',
					);
				});
			});

			describe('when transaction.params.votes includes amount which is less than int64 range', () => {
				beforeEach(() => {
					transactionParamsDecoded = {
						votes: [
							{
								delegateAddress: getRandomBytes(20),
								amount: BigInt(-1) * BigInt(2) ** BigInt(63) - BigInt(1),
							},
						],
					};
				});

				it('should return errors', () => {
					const errors = validator.validate(command.schema, transactionParamsDecoded);
					expect(errors[0].message).toInclude('should pass "dataType" keyword validation');
				});
			});

			describe('when transaction.params.votes includes amount which is greater than int64 range', () => {
				beforeEach(() => {
					transactionParamsDecoded = {
						votes: [
							{
								delegateAddress: getRandomBytes(20),
								amount: BigInt(2) ** BigInt(63) + BigInt(1),
							},
						],
					};
				});

				it('should return errors', () => {
					const errors = validator.validate(command.schema, transactionParamsDecoded);
					expect(errors[0].message).toInclude('should pass "dataType" keyword validation');
				});
			});
		});

		describe('when transaction.params.votes contains valid contents', () => {
			it('should not throw errors with valid upvote case', async () => {
				// Arrange
				transactionParamsDecoded = {
					votes: [{ delegateAddress: getRandomBytes(20), amount: liskToBeddows(20) }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.verify(context)).resolves.toHaveProperty('status', VerifyStatus.OK);
			});

			it('should not throw errors with valid downvote cast', async () => {
				// Arrange
				transactionParamsDecoded = {
					votes: [{ delegateAddress: getRandomBytes(20), amount: liskToBeddows(-20) }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.verify(context)).resolves.toHaveProperty('status', VerifyStatus.OK);
			});

			it('should not throw errors with valid mixed votes case', async () => {
				// Arrange
				transactionParamsDecoded = {
					votes: [
						{ delegateAddress: getRandomBytes(20), amount: liskToBeddows(20) },
						{ delegateAddress: getRandomBytes(20), amount: liskToBeddows(-20) },
					],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.verify(context)).resolves.toHaveProperty('status', VerifyStatus.OK);
			});
		});

		describe('when transaction.params.votes contains more than 10 positive votes', () => {
			it('should throw error', async () => {
				// Arrange
				transactionParamsDecoded = {
					votes: Array(11)
						.fill(0)
						.map(() => ({ delegateAddress: getRandomBytes(20), amount: liskToBeddows(10) })),
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Upvote can only be casted up to 10.',
				);
			});
		});

		describe('when transaction.params.votes contains more than 10 negative votes', () => {
			it('should throw error', async () => {
				// Arrange
				transactionParamsDecoded = {
					votes: Array(11)
						.fill(0)
						.map(() => ({ delegateAddress: getRandomBytes(20), amount: liskToBeddows(-10) })),
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Downvote can only be casted up to 10.',
				);
			});
		});

		describe('when transaction.params.votes includes duplicate delegates within positive amount', () => {
			it('should throw error', async () => {
				// Arrange
				const delegateAddress = getRandomBytes(20);
				transactionParamsDecoded = {
					votes: Array(2)
						.fill(0)
						.map(() => ({ delegateAddress, amount: liskToBeddows(10) })),
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Delegate address must be unique.',
				);
			});
		});

		describe('when transaction.params.votes includes duplicate delegates within positive and negative amount', () => {
			it('should throw error', async () => {
				// Arrange
				const delegateAddress = getRandomBytes(20);
				transactionParamsDecoded = {
					votes: [
						{ delegateAddress, amount: liskToBeddows(10) },
						{ delegateAddress, amount: liskToBeddows(-10) },
					],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Delegate address must be unique.',
				);
			});
		});

		describe('when transaction.params.votes includes zero amount', () => {
			it('should throw error', async () => {
				// Arrange
				const delegateAddress = getRandomBytes(20);
				transactionParamsDecoded = {
					votes: [{ delegateAddress, amount: liskToBeddows(0) }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Amount cannot be 0.',
				);
			});
		});

		describe('when transaction.params.votes includes positive amount which is not multiple of 10 * 10^8', () => {
			it('should throw an error', async () => {
				// Arrange
				const delegateAddress = getRandomBytes(20);
				transactionParamsDecoded = {
					votes: [{ delegateAddress, amount: BigInt(20) }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Amount should be multiple of 10 * 10^8.',
				);
			});
		});

		describe('when transaction.params.votes includes negative amount which is not multiple of 10 * 10^8', () => {
			it('should throw error', async () => {
				// Arrange
				const delegateAddress = getRandomBytes(20);
				transactionParamsDecoded = {
					votes: [{ delegateAddress, amount: BigInt(-20) }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
				}).createCommandVerifyContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.verify(context)).resolves.toHaveProperty(
					'error.message',
					'Amount should be multiple of 10 * 10^8.',
				);
			});
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			transaction = new Transaction({
				moduleID: MODULE_ID_DPOS,
				commandID: COMMAND_ID_VOTE,
				fee: BigInt(1500000),
				nonce: BigInt(0),
				params: transactionParams,
				senderPublicKey,
				signatures: [],
			});
		});
		describe('when transaction.params.votes contain positive amount', () => {
			it('should not throw error', async () => {
				// Arrange
				transactionParamsDecoded = {
					votes: [{ delegateAddress: delegateAddress1, amount: liskToBeddows(10) }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.execute(context)).resolves.toBeUndefined();
			});

			it('should throw error if vote amount is more than balance', async () => {
				// Arrange
				transactionParamsDecoded = {
					votes: [{ delegateAddress: getRandomBytes(20), amount: liskToBeddows(100) }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				lockFn.mockRejectedValue(new Error('Not enough balance to lock'));

				// Assert
				await expect(command.execute(context)).rejects.toThrow();
			});

			it('should make account to have correct balance', async () => {
				// Arrange
				transactionParamsDecoded = {
					votes: [
						{ delegateAddress: delegateAddress1, amount: delegate1VoteAmount },
						{ delegateAddress: delegateAddress2, amount: delegate2VoteAmount },
					],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				await command.execute(context);

				// Assert
				expect(lockFn).toHaveBeenCalledTimes(2);
				expect(lockFn).toHaveBeenCalledWith(
					expect.anything(),
					senderAddress,
					MODULE_ID_DPOS,
					tokenIDDPoS,
					delegate1VoteAmount,
				);
				expect(lockFn).toHaveBeenCalledWith(
					expect.anything(),
					senderAddress,
					MODULE_ID_DPOS,
					tokenIDDPoS,
					delegate2VoteAmount,
				);
			});

			it('should not change pendingUnlocks', async () => {
				// Arrange
				stateStore = new StateStore(new InMemoryKVStore());
				voterStore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_VOTER);
				delegateStore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);

				await delegateStore.setWithSchema(delegateAddress1, delegateInfo1, delegateStoreSchema);

				transactionParamsDecoded = {
					votes: [{ delegateAddress: delegateAddress1, amount: delegate1VoteAmount }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				await command.execute(context);

				const { pendingUnlocks } = await voterStore.getWithSchema(senderAddress, voterStoreSchema);

				// Assert
				expect(pendingUnlocks).toHaveLength(0);
			});

			it('should order voterData.sentVotes', async () => {
				// Arrange
				stateStore = new StateStore(new InMemoryKVStore());
				voterStore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_VOTER);
				delegateStore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);

				await delegateStore.setWithSchema(delegateAddress1, delegateInfo1, delegateStoreSchema);
				await delegateStore.setWithSchema(delegateAddress2, delegateInfo2, delegateStoreSchema);

				transactionParamsDecoded = {
					votes: [
						{ delegateAddress: delegateAddress2, amount: delegate2VoteAmount },
						{ delegateAddress: delegateAddress1, amount: delegate1VoteAmount },
					],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				await command.execute(context);

				const { sentVotes } = await voterStore.getWithSchema(senderAddress, voterStoreSchema);

				const sentVotesCopy = sentVotes.slice(0);
				sentVotesCopy.sort((a: any, b: any) => a.delegateAddress.compare(b.delegateAddress));

				// Assert
				expect(sentVotes).toStrictEqual(sentVotesCopy);
			});

			it('should make upvoted delegate account to have correct totalVotesReceived', async () => {
				// Arrange
				stateStore = new StateStore(new InMemoryKVStore());
				delegateStore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);

				await delegateStore.setWithSchema(delegateAddress1, delegateInfo1, delegateStoreSchema);
				await delegateStore.setWithSchema(delegateAddress2, delegateInfo2, delegateStoreSchema);

				transactionParamsDecoded = {
					votes: [
						{ delegateAddress: delegateAddress1, amount: delegate1VoteAmount },
						{ delegateAddress: delegateAddress2, amount: delegate2VoteAmount },
					],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				await command.execute(context);

				const { totalVotesReceived: totalVotesReceived1 } = await delegateStore.getWithSchema(
					delegateAddress1,
					delegateStoreSchema,
				);
				const { totalVotesReceived: totalVotesReceived2 } = await delegateStore.getWithSchema(
					delegateAddress2,
					delegateStoreSchema,
				);

				// Assert
				expect(totalVotesReceived1).toBe(delegate1VoteAmount);
				expect(totalVotesReceived2).toBe(delegate2VoteAmount);
			});

			it('should update vote object when it exists before and create if it does not exist', async () => {
				// Arrange
				stateStore = new StateStore(new InMemoryKVStore());
				voterStore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_VOTER);
				delegateStore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);

				await delegateStore.setWithSchema(delegateAddress1, delegateInfo1, delegateStoreSchema);
				transactionParamsDecoded = {
					votes: [{ delegateAddress: delegateAddress1, amount: delegate1VoteAmount }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(voterStore.getWithSchema(senderAddress, voterStoreSchema)).rejects.toThrow();

				await command.execute(context);
				const { sentVotes } = await voterStore.getWithSchema(senderAddress, voterStoreSchema);
				expect(sentVotes[0]).toEqual({
					delegateAddress: delegateAddress1,
					amount: delegate1VoteAmount,
				});
			});
		});

		describe('when transaction.params.votes contain negative amount which makes voterStore.sentVotes to be 0 entries', () => {
			beforeEach(async () => {
				transactionParamsDecoded = {
					votes: [
						{ delegateAddress: delegateAddress1, amount: delegate1VoteAmount },
						{ delegateAddress: delegateAddress2, amount: delegate2VoteAmount },
					],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				await command.execute(context);

				transactionParamsDecoded = {
					votes: [
						{ delegateAddress: delegateAddress1, amount: delegate1VoteAmount * BigInt(-1) },
						{ delegateAddress: delegateAddress2, amount: delegate2VoteAmount * BigInt(-1) },
					],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				lockFn.mockClear();
			});

			it('should not throw error', async () => {
				await expect(command.execute(context)).resolves.toBeUndefined();
			});

			it('should not change account balance', async () => {
				// Act
				await command.execute(context);

				// Assert
				expect(lockFn).toHaveBeenCalledTimes(0);
			});

			it('should remove vote which has zero amount', async () => {
				// Arrange
				transactionParamsDecoded = {
					votes: [{ delegateAddress: delegateAddress1, amount: delegate1VoteAmount * BigInt(-1) }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				await command.execute(context);

				const voterData = await voterStore.getWithSchema(senderAddress, voterStoreSchema);

				// Assert
				expect(voterData.sentVotes).toHaveLength(1);
				expect(voterData.sentVotes[0].delegateAddress).not.toEqual(delegateAddress1);
			});

			it('should update vote which has non-zero amount', async () => {
				// Arrange
				const downVoteAmount = liskToBeddows(10);

				transactionParamsDecoded = {
					votes: [{ delegateAddress: delegateAddress1, amount: downVoteAmount * BigInt(-1) }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				await command.execute(context);

				const voterData = await voterStore.getWithSchema(senderAddress, voterStoreSchema);

				// Assert
				expect(
					voterData.sentVotes.find((v: any) => v.delegateAddress.equals(delegateAddress1)),
				).toEqual({
					delegateAddress: delegateAddress1,
					amount: delegate1VoteAmount - downVoteAmount,
				});
			});

			it('should make account to have correct unlocking', async () => {
				// Arrange
				await command.execute(context);

				const voterData = await voterStore.getWithSchema(senderAddress, voterStoreSchema);

				// Assert
				expect(voterData.pendingUnlocks).toHaveLength(2);
				expect(voterData.pendingUnlocks).toEqual(
					[
						{
							delegateAddress: delegateAddress1,
							amount: delegate1VoteAmount,
							unvoteHeight: lastBlockHeight + 1,
						},
						{
							delegateAddress: delegateAddress2,
							amount: delegate2VoteAmount,
							unvoteHeight: lastBlockHeight + 1,
						},
					].sort((a, b) => a.delegateAddress.compare(b.delegateAddress)),
				);
			});

			it('should order voterData.pendingUnlocks', async () => {
				// Arrange
				await command.execute(context);

				const voterData = await voterStore.getWithSchema(senderAddress, voterStoreSchema);

				// Assert
				expect(voterData.pendingUnlocks).toHaveLength(2);
				expect(voterData.pendingUnlocks.map((d: any) => d.delegateAddress)).toEqual(
					[delegateAddress1, delegateAddress2].sort((a, b) => a.compare(b)),
				);
			});

			it('should make downvoted delegate account to have correct totalVotesReceived', async () => {
				// Arrange
				await command.execute(context);

				const delegateData1 = await delegateStore.getWithSchema(
					delegateAddress1,
					delegateStoreSchema,
				);
				const delegateData2 = await delegateStore.getWithSchema(
					delegateAddress2,
					delegateStoreSchema,
				);

				// Assert
				expect(delegateData1.totalVotesReceived).toEqual(BigInt(0));
				expect(delegateData2.totalVotesReceived).toEqual(BigInt(0));
			});

			it('should throw error when downvoted delegate is not already upvoted', async () => {
				// Arrange
				const downVoteAmount = liskToBeddows(10);

				transactionParamsDecoded = {
					votes: [{ delegateAddress: delegateAddress3, amount: downVoteAmount * BigInt(-1) }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				// Assert
				await expect(command.execute(context)).rejects.toThrow(
					'Cannot cast downvote to delegate who is not upvoted.',
				);
			});
		});

		describe('when transaction.params.votes contain negative and positive amount', () => {
			const positiveVoteDelegate1 = liskToBeddows(10);
			const negativeVoteDelegate2 = liskToBeddows(-20);
			beforeEach(async () => {
				transactionParamsDecoded = {
					votes: [
						{ delegateAddress: delegateAddress1, amount: delegate1VoteAmount },
						{ delegateAddress: delegateAddress2, amount: delegate2VoteAmount },
					],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				await command.execute(context);

				transactionParamsDecoded = {
					votes: [
						{ delegateAddress: delegateAddress1, amount: positiveVoteDelegate1 },
						{ delegateAddress: delegateAddress2, amount: negativeVoteDelegate2 },
					].sort((a, b) => -1 * a.delegateAddress.compare(b.delegateAddress)),
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				lockFn.mockClear();
			});
			it('should not throw error', async () => {
				await expect(command.execute(context)).resolves.toBeUndefined();
			});

			it('should make voter to have correct balance', async () => {
				// Arrange
				await command.execute(context);

				// Assert
				expect(lockFn).toHaveBeenCalledTimes(1);
				expect(lockFn).toHaveBeenCalledWith(
					expect.anything(),
					senderAddress,
					MODULE_ID_DPOS,
					tokenIDDPoS,
					positiveVoteDelegate1,
				);
			});

			it('should make voter to have correct unlocking', async () => {
				// Arrange
				await command.execute(context);

				const voterData = await voterStore.getWithSchema(senderAddress, voterStoreSchema);
				// Assert
				expect(voterData.pendingUnlocks).toHaveLength(1);
				expect(voterData.pendingUnlocks).toEqual([
					{
						delegateAddress: delegateAddress2,
						amount: BigInt(-1) * negativeVoteDelegate2,
						unvoteHeight: lastBlockHeight + 1,
					},
				]);
			});

			it('should make upvoted delegate account to have correct totalVotesReceived', async () => {
				// Arrange
				await command.execute(context);

				const delegateData1 = await delegateStore.getWithSchema(
					delegateAddress1,
					delegateStoreSchema,
				);

				// Assert
				expect(delegateData1.totalVotesReceived).toEqual(
					delegate1VoteAmount + positiveVoteDelegate1,
				);
			});

			it('should make downvoted delegate account to have correct totalVotesReceived', async () => {
				// Arrange
				await command.execute(context);

				const delegateData2 = await delegateStore.getWithSchema(
					delegateAddress2,
					delegateStoreSchema,
				);

				// Assert
				expect(delegateData2.totalVotesReceived).toEqual(
					delegate2VoteAmount + negativeVoteDelegate2,
				);
			});
		});

		describe('when transaction.params.votes contain invalid data', () => {
			beforeEach(() => {
				transactionParamsDecoded = {
					votes: [
						{ delegateAddress: delegateAddress1, amount: delegate1VoteAmount },
						{ delegateAddress: delegateAddress2, amount: delegate2VoteAmount },
					].sort((a, b) => -1 * a.delegateAddress.compare(b.delegateAddress)),
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				lockFn.mockClear();
			});

			describe('when transaction.params.votes contain delegate address which is not registered', () => {
				it('should throw error', async () => {
					// Arrange
					const nonExistingDelegateAddress = getRandomBytes(20);

					transactionParamsDecoded = {
						...transactionParamsDecoded,
						votes: [{ delegateAddress: nonExistingDelegateAddress, amount: liskToBeddows(76) }],
					};

					transactionParams = codec.encode(command.schema, transactionParamsDecoded);

					transaction.params = transactionParams;

					context = createTransactionContext({
						transaction,
						stateStore,
						header: {
							height: lastBlockHeight,
						} as any,
					}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

					// Assert
					await expect(command.execute(context)).rejects.toThrow();
				});
			});

			describe('when transaction.params.votes positive amount makes voterData.sentVotes entries more than 10', () => {
				it('should throw error', async () => {
					// Arrange
					const votes = [];

					for (let i = 0; i < 12; i += 1) {
						const delegateAddress = getRandomBytes(20);

						const delegateInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someDelegate${i}`,
							pomHeights: [],
							selfVotes: BigInt(0),
							totalVotesReceived: BigInt(0),
						};

						await delegateStore.setWithSchema(delegateAddress, delegateInfo, delegateStoreSchema);
						votes.push({
							delegateAddress,
							amount: liskToBeddows(10),
						});
					}

					transactionParamsDecoded = { votes };

					transactionParams = codec.encode(command.schema, transactionParamsDecoded);

					transaction.params = transactionParams;

					context = createTransactionContext({
						transaction,
						stateStore,
					}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

					// Assert
					await expect(command.execute(context)).rejects.toThrow('Sender can only vote upto 10.');
				});
			});

			describe('when transaction.params.votes negative amount decrease voterData.sentVotes entries yet positive amount makes account exceeds more than 10', () => {
				it('should throw error', async () => {
					// Arrange
					const initialDelegateAmount = 8;
					const voterData = await getVoterOrDefault(voterStore, senderAddress);

					// Suppose account already voted for 8 delegates
					for (let i = 0; i < initialDelegateAmount; i += 1) {
						const delegateAddress = getRandomBytes(20);

						const delegateInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someDelegate${i}`,
							pomHeights: [],
							selfVotes: BigInt(0),
							totalVotesReceived: BigInt(0),
						};

						await delegateStore.setWithSchema(delegateAddress, delegateInfo, delegateStoreSchema);

						const vote = {
							delegateAddress,
							amount: liskToBeddows(20),
						};
						voterData.sentVotes.push(vote);
					}

					await voterStore.setWithSchema(senderAddress, voterData, voterStoreSchema);

					// We have 2 negative votes
					const votes = [
						{
							delegateAddress: voterData.sentVotes[0].delegateAddress,
							amount: liskToBeddows(-10),
						},
						{
							delegateAddress: voterData.sentVotes[1].delegateAddress,
							amount: liskToBeddows(-10),
						},
					];

					// We have 3 positive votes
					for (let i = 0; i < 3; i += 1) {
						const delegateAddress = getRandomBytes(20);

						const delegateInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someDelegate${i + initialDelegateAmount}`,
							pomHeights: [],
							selfVotes: BigInt(0),
							totalVotesReceived: BigInt(0),
						};

						await delegateStore.setWithSchema(delegateAddress, delegateInfo, delegateStoreSchema);

						votes.push({
							delegateAddress,
							amount: liskToBeddows(10),
						});
					}

					// Account already contains 8 positive votes
					// now we added 2 negative votes and 3 new positive votes
					// which will make total positive votes to grow over 10
					transactionParamsDecoded = { votes };

					transactionParams = codec.encode(command.schema, transactionParamsDecoded);

					transaction.params = transactionParams;

					context = createTransactionContext({
						transaction,
						stateStore,
					}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

					// Assert
					await expect(command.execute(context)).rejects.toThrow('Sender can only vote upto 10.');
				});
			});

			describe('when transaction.params.votes has negative amount and makes voterData.pendingUnlocks more than 20 entries', () => {
				it('should throw error', async () => {
					// Arrange
					const initialDelegateAmountForUnlocks = 19;
					const voterData = await getVoterOrDefault(voterStore, senderAddress);

					// Suppose account already 19 unlocking
					for (let i = 0; i < initialDelegateAmountForUnlocks; i += 1) {
						const delegateAddress = getRandomBytes(20);

						const delegateInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someDelegate${i}`,
							pomHeights: [],
							selfVotes: BigInt(0),
							totalVotesReceived: BigInt(0),
						};

						await delegateStore.setWithSchema(delegateAddress, delegateInfo, delegateStoreSchema);

						const pendingUnlock = {
							delegateAddress,
							amount: liskToBeddows(20),
							unvoteHeight: i,
						};
						voterData.pendingUnlocks.push(pendingUnlock);
					}

					// Suppose account have 5 positive votes
					for (let i = 0; i < 5; i += 1) {
						const delegateAddress = getRandomBytes(20);

						const delegateInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someDelegate${i}`,
							pomHeights: [],
							selfVotes: BigInt(0),
							totalVotesReceived: BigInt(0),
						};

						await delegateStore.setWithSchema(delegateAddress, delegateInfo, delegateStoreSchema);

						const vote = {
							delegateAddress,
							amount: liskToBeddows(20),
						};
						voterData.sentVotes.push(vote);
					}

					await voterStore.setWithSchema(senderAddress, voterData, voterStoreSchema);

					// We have 2 negative votes
					const votes = [
						{
							delegateAddress: voterData.sentVotes[0].delegateAddress,
							amount: liskToBeddows(-10),
						},
						{
							delegateAddress: voterData.sentVotes[1].delegateAddress,
							amount: liskToBeddows(-10),
						},
					];

					// Account already contains 19 unlocking and 5 positive votes
					// now we added 2 negative votes
					// which will make total unlocking to grow over 20
					transactionParamsDecoded = { votes };

					transactionParams = codec.encode(command.schema, transactionParamsDecoded);

					transaction.params = transactionParams;

					context = createTransactionContext({
						transaction,
						stateStore,
					}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

					// Assert
					await expect(command.execute(context)).rejects.toThrow(
						`Pending unlocks cannot exceed ${MAX_UNLOCKING.toString()}.`,
					);
				});
			});

			describe('when transaction.params.votes negative amount exceeds the previously voted amount', () => {
				it('should throw error', async () => {
					// Arrange
					const voterData = await getVoterOrDefault(voterStore, senderAddress);
					voterData.sentVotes.push({
						delegateAddress: delegateAddress1,
						amount: liskToBeddows(70),
					});
					await voterStore.setWithSchema(senderAddress, voterData, voterStoreSchema);

					transactionParamsDecoded = {
						votes: [
							{
								delegateAddress: delegateAddress1,
								amount: liskToBeddows(-80),
							},
						],
					};

					transactionParams = codec.encode(command.schema, transactionParamsDecoded);

					transaction.params = transactionParams;

					context = createTransactionContext({
						transaction,
						stateStore,
					}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

					// Assert
					await expect(command.execute(context)).rejects.toThrow(
						'The downvote amount cannot be greater than upvoted amount.',
					);
				});
			});
		});

		describe('when transaction.params.votes contains self-vote', () => {
			const senderVoteAmountPositive = liskToBeddows(80);
			const senderVoteAmountNegative = liskToBeddows(20);
			let delegateInfo: any;
			beforeEach(async () => {
				delegateInfo = {
					consecutiveMissedBlocks: 0,
					isBanned: false,
					lastGeneratedHeight: 5,
					name: 'delegate',
					pomHeights: [],
					selfVotes: BigInt(0),
					totalVotesReceived: BigInt(0),
				};

				await delegateStore.setWithSchema(senderAddress, delegateInfo, delegateStoreSchema);

				transactionParamsDecoded = {
					votes: [{ delegateAddress: senderAddress, amount: senderVoteAmountPositive }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				lockFn.mockClear();
			});

			it('should update votes and totalVotesReceived', async () => {
				// Act & Assign
				await command.execute(context);

				const delegateData = await delegateStore.getWithSchema(senderAddress, delegateStoreSchema);
				const voterData = await getVoterOrDefault(voterStore, senderAddress);
				// Assert
				expect(delegateData.totalVotesReceived).toEqual(senderVoteAmountPositive);
				expect(voterData.sentVotes).toHaveLength(1);
				expect(lockFn).toHaveBeenCalledWith(
					expect.anything(),
					senderAddress,
					MODULE_ID_DPOS,
					tokenIDDPoS,
					senderVoteAmountPositive,
				);
			});

			it('should change delegateData.selfVotes and totalVotesReceived with positive vote', async () => {
				// Act & Assign
				await command.execute(context);

				const delegateData = await delegateStore.getWithSchema(senderAddress, delegateStoreSchema);
				// Assert
				expect(delegateData.totalVotesReceived).toEqual(senderVoteAmountPositive);
				expect(delegateData.selfVotes).toEqual(senderVoteAmountPositive);
			});

			it('should change delegateData.selfVotes, totalVotesReceived and unlocking with negative vote', async () => {
				// Act & Assign
				await command.execute(context);

				transactionParamsDecoded = {
					votes: [
						{ delegateAddress: senderAddress, amount: senderVoteAmountNegative * BigInt(-1) },
					],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				await command.execute(context);

				const delegateData = await delegateStore.getWithSchema(senderAddress, delegateStoreSchema);
				const voterData = await getVoterOrDefault(voterStore, senderAddress);

				// Assert
				expect(delegateData.totalVotesReceived).toEqual(
					senderVoteAmountPositive - senderVoteAmountNegative,
				);
				expect(delegateData.selfVotes).toEqual(senderVoteAmountPositive - senderVoteAmountNegative);
				expect(voterData.sentVotes).toHaveLength(1);
				expect(voterData.sentVotes).toEqual([
					{
						delegateAddress: senderAddress,
						amount: senderVoteAmountPositive - senderVoteAmountNegative,
					},
				]);
				expect(voterData.pendingUnlocks).toHaveLength(1);
				expect(voterData.pendingUnlocks).toEqual([
					{
						delegateAddress: senderAddress,
						amount: senderVoteAmountNegative,
						unvoteHeight: lastBlockHeight + 1,
					},
				]);
			});
		});

		describe('when transaction.params.votes does not contain self-vote', () => {
			const senderVoteAmountPositive = liskToBeddows(80);
			const senderVoteAmountNegative = liskToBeddows(20);
			const delegateSelfVote = liskToBeddows(2000);
			const delegateAddress = getRandomBytes(20);
			let delegateInfo: any;
			beforeEach(async () => {
				delegateInfo = {
					consecutiveMissedBlocks: 0,
					isBanned: false,
					lastGeneratedHeight: 5,
					name: 'delegate',
					pomHeights: [],
					selfVotes: delegateSelfVote,
					totalVotesReceived: delegateSelfVote,
				};

				await delegateStore.setWithSchema(delegateAddress, delegateInfo, delegateStoreSchema);

				transactionParamsDecoded = {
					votes: [{ delegateAddress, amount: senderVoteAmountPositive }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				lockFn.mockClear();
			});

			it('should not change delegateData.selfVotes but should update totalVotesReceived with positive vote', async () => {
				// Act & Assign
				await command.execute(context);

				const delegateData = await delegateStore.getWithSchema(
					delegateAddress,
					delegateStoreSchema,
				);
				// Assert
				expect(delegateData.totalVotesReceived).toEqual(
					senderVoteAmountPositive + delegateSelfVote,
				);
				expect(delegateData.selfVotes).toEqual(delegateSelfVote);
			});

			it('should not change delegateData.selfVotes but should change totalVotesReceived and unlocking with negative vote', async () => {
				// Act & Assign
				await command.execute(context);

				transactionParamsDecoded = {
					votes: [{ delegateAddress, amount: senderVoteAmountNegative * BigInt(-1) }],
				};

				transactionParams = codec.encode(command.schema, transactionParamsDecoded);

				transaction.params = transactionParams;

				context = createTransactionContext({
					transaction,
					stateStore,
					header: {
						height: lastBlockHeight,
					} as any,
				}).createCommandExecuteContext<VoteTransactionParams>(command.schema);

				await command.execute(context);

				const delegateData = await delegateStore.getWithSchema(
					delegateAddress,
					delegateStoreSchema,
				);
				const voterData = await getVoterOrDefault(voterStore, senderAddress);

				// Assert
				expect(delegateData.totalVotesReceived).toEqual(
					senderVoteAmountPositive - senderVoteAmountNegative + delegateSelfVote,
				);
				expect(delegateData.selfVotes).toEqual(delegateSelfVote);
				expect(voterData.sentVotes).toHaveLength(1);
				expect(voterData.sentVotes).toEqual([
					{
						delegateAddress,
						amount: senderVoteAmountPositive - senderVoteAmountNegative,
					},
				]);
				expect(voterData.pendingUnlocks).toHaveLength(1);
				expect(voterData.pendingUnlocks).toEqual([
					{
						delegateAddress,
						amount: senderVoteAmountNegative,
						unvoteHeight: lastBlockHeight + 1,
					},
				]);
			});
		});
	});
});
