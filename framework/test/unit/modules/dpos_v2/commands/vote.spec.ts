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
import { VoteDelegateCommand, VerifyStatus, DPoSModule } from '../../../../../src';
import { MAX_UNLOCKING, MODULE_NAME_DPOS } from '../../../../../src/modules/dpos_v2/constants';
import { DelegateAccount, DelegateStore } from '../../../../../src/modules/dpos_v2/stores/delegate';
import { VoterStore } from '../../../../../src/modules/dpos_v2/stores/voter';
import { VoteTransactionParams } from '../../../../../src/modules/dpos_v2/types';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';

import { createTransactionContext } from '../../../../../src/testing';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';
import { liskToBeddows } from '../../../../utils/assets';
import { DEFAULT_LOCAL_ID } from '../../../../utils/mocks/transaction';

describe('VoteCommand', () => {
	const dpos = new DPoSModule();

	const lastBlockHeight = 200;
	const governanceTokenID = DEFAULT_LOCAL_ID;
	const senderPublicKey = utils.getRandomBytes(32);
	const senderAddress = address.getAddressFromPublicKey(senderPublicKey);
	const delegateAddress1 = utils.getRandomBytes(20);
	const delegateAddress2 = utils.getRandomBytes(20);
	const delegateAddress3 = utils.getRandomBytes(20);
	const delegate1VoteAmount = liskToBeddows(90);
	const delegate2VoteAmount = liskToBeddows(50);

	let delegateInfo1: DelegateAccount;
	let delegateInfo2: DelegateAccount;
	let delegateInfo3: DelegateAccount;
	let voterStore: VoterStore;
	let delegateStore: DelegateStore;
	let context: any;
	let transaction: any;
	let command: VoteDelegateCommand;
	let transactionParams: Buffer;
	let transactionParamsDecoded: any;
	let stateStore: PrefixedStateReadWriter;
	let lockFn: any;

	beforeEach(async () => {
		lockFn = jest.fn();
		command = new VoteDelegateCommand(dpos.stores, dpos.events);
		command.addDependencies({
			tokenMethod: {
				lock: lockFn,
				unlock: jest.fn(),
				getAvailableBalance: jest.fn(),
				transfer: jest.fn(),
				getLockedAmount: jest.fn(),
			},
		});
		command.init({
			governanceTokenID: DEFAULT_LOCAL_ID,
		});

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

		delegateInfo1 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'someDelegate1',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(0),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
		};

		delegateInfo2 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'someDelegate2',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(0),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
		};

		delegateInfo3 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'someDelegate3',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(0),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
		};

		delegateStore = dpos.stores.get(DelegateStore);

		await delegateStore.set(createStoreGetter(stateStore), delegateAddress1, delegateInfo1);
		await delegateStore.set(createStoreGetter(stateStore), delegateAddress2, delegateInfo2);

		voterStore = dpos.stores.get(VoterStore);
		delegateStore = dpos.stores.get(DelegateStore);

		await delegateStore.set(createStoreGetter(stateStore), delegateAddress1, delegateInfo1);
		await delegateStore.set(createStoreGetter(stateStore), delegateAddress2, delegateInfo2);
		await delegateStore.set(createStoreGetter(stateStore), delegateAddress3, delegateInfo3);
	});

	describe('constructor', () => {
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
				module: 'dpos',
				command: 'vote',
				fee: BigInt(1500000),
				nonce: BigInt(0),
				params: Buffer.alloc(0),
				senderPublicKey: utils.getRandomBytes(32),
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
					expect((verificationResult.error as any).value.message).toInclude(
						'must NOT have fewer than 1 items',
					);
				});
			});

			describe('when transaction.params.votes includes more than 20 elements', () => {
				beforeEach(() => {
					transactionParamsDecoded = {
						votes: Array(21)
							.fill(0)
							.map(() => ({ delegateAddress: utils.getRandomBytes(20), amount: liskToBeddows(0) })),
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
					expect((verificationResult.error as any).value.message).toInclude(
						'must NOT have more than 20 items',
					);
				});
			});

			describe('when transaction.params.votes includes amount which is less than int64 range', () => {
				beforeEach(() => {
					transactionParamsDecoded = {
						votes: [
							{
								delegateAddress: utils.getRandomBytes(20),
								amount: BigInt(-1) * BigInt(2) ** BigInt(63) - BigInt(1),
							},
						],
					};
				});

				it('should return errors', () => {
					expect(() => validator.validate(command.schema, transactionParamsDecoded)).toThrow(
						'should pass "dataType" keyword validation',
					);
				});
			});

			describe('when transaction.params.votes includes amount which is greater than int64 range', () => {
				beforeEach(() => {
					transactionParamsDecoded = {
						votes: [
							{
								delegateAddress: utils.getRandomBytes(20),
								amount: BigInt(2) ** BigInt(63) + BigInt(1),
							},
						],
					};
				});

				it('should return errors', () => {
					expect(() => validator.validate(command.schema, transactionParamsDecoded)).toThrow(
						'should pass "dataType" keyword validation',
					);
				});
			});
		});

		describe('when transaction.params.votes contains valid contents', () => {
			it('should not throw errors with valid upvote case', async () => {
				// Arrange
				transactionParamsDecoded = {
					votes: [{ delegateAddress: utils.getRandomBytes(20), amount: liskToBeddows(20) }],
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
					votes: [{ delegateAddress: utils.getRandomBytes(20), amount: liskToBeddows(-20) }],
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
						{ delegateAddress: utils.getRandomBytes(20), amount: liskToBeddows(20) },
						{ delegateAddress: utils.getRandomBytes(20), amount: liskToBeddows(-20) },
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
						.map(() => ({ delegateAddress: utils.getRandomBytes(20), amount: liskToBeddows(10) })),
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
						.map(() => ({ delegateAddress: utils.getRandomBytes(20), amount: liskToBeddows(-10) })),
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
				const delegateAddress = utils.getRandomBytes(20);
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
				const delegateAddress = utils.getRandomBytes(20);
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
				const delegateAddress = utils.getRandomBytes(20);
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
				const delegateAddress = utils.getRandomBytes(20);
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
				const delegateAddress = utils.getRandomBytes(20);
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

	// TODO: Issue #7666
	describe.skip('execute', () => {
		beforeEach(() => {
			transaction = new Transaction({
				module: 'dpos',
				command: 'vote',
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
					votes: [{ delegateAddress: utils.getRandomBytes(20), amount: liskToBeddows(100) }],
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
					MODULE_NAME_DPOS,
					governanceTokenID,
					delegate1VoteAmount,
				);
				expect(lockFn).toHaveBeenCalledWith(
					expect.anything(),
					senderAddress,
					MODULE_NAME_DPOS,
					governanceTokenID,
					delegate2VoteAmount,
				);
			});

			it('should not change pendingUnlocks', async () => {
				// Arrange
				voterStore = dpos.stores.get(VoterStore);
				delegateStore = dpos.stores.get(DelegateStore);

				await delegateStore.set(createStoreGetter(stateStore), delegateAddress1, delegateInfo1);

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

				const { pendingUnlocks } = await voterStore.get(
					createStoreGetter(stateStore),
					senderAddress,
				);

				// Assert
				expect(pendingUnlocks).toHaveLength(0);
			});

			it('should order voterData.sentVotes', async () => {
				// Arrange
				voterStore = dpos.stores.get(VoterStore);
				delegateStore = dpos.stores.get(DelegateStore);

				await delegateStore.set(createStoreGetter(stateStore), delegateAddress1, delegateInfo1);
				await delegateStore.set(createStoreGetter(stateStore), delegateAddress2, delegateInfo2);

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

				const { sentVotes } = await voterStore.get(createStoreGetter(stateStore), senderAddress);

				const sentVotesCopy = sentVotes.slice(0);
				sentVotesCopy.sort((a: any, b: any) => a.delegateAddress.compare(b.delegateAddress));

				// Assert
				expect(sentVotes).toStrictEqual(sentVotesCopy);
			});

			it('should make upvoted delegate account to have correct totalVotesReceived', async () => {
				// Arrange
				delegateStore = dpos.stores.get(DelegateStore);

				await delegateStore.set(createStoreGetter(stateStore), delegateAddress1, delegateInfo1);
				await delegateStore.set(createStoreGetter(stateStore), delegateAddress2, delegateInfo2);

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

				const { totalVotesReceived: totalVotesReceived1 } = await delegateStore.get(
					createStoreGetter(stateStore),
					delegateAddress1,
				);
				const { totalVotesReceived: totalVotesReceived2 } = await delegateStore.get(
					createStoreGetter(stateStore),
					delegateAddress2,
				);

				// Assert
				expect(totalVotesReceived1).toBe(delegate1VoteAmount);
				expect(totalVotesReceived2).toBe(delegate2VoteAmount);
			});

			it('should update vote object when it exists before and create if it does not exist', async () => {
				// Arrange
				voterStore = dpos.stores.get(VoterStore);
				delegateStore = dpos.stores.get(DelegateStore);

				await delegateStore.set(createStoreGetter(stateStore), delegateAddress1, delegateInfo1);
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
				await expect(
					voterStore.get(createStoreGetter(stateStore), senderAddress),
				).rejects.toThrow();

				await command.execute(context);
				const { sentVotes } = await voterStore.get(createStoreGetter(stateStore), senderAddress);
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

				const voterData = await voterStore.get(createStoreGetter(stateStore), senderAddress);

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

				const voterData = await voterStore.get(createStoreGetter(stateStore), senderAddress);

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

				const voterData = await voterStore.get(createStoreGetter(stateStore), senderAddress);

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

				const voterData = await voterStore.get(createStoreGetter(stateStore), senderAddress);

				// Assert
				expect(voterData.pendingUnlocks).toHaveLength(2);
				expect(voterData.pendingUnlocks.map((d: any) => d.delegateAddress)).toEqual(
					[delegateAddress1, delegateAddress2].sort((a, b) => a.compare(b)),
				);
			});

			it('should make downvoted delegate account to have correct totalVotesReceived', async () => {
				// Arrange
				await command.execute(context);

				const delegateData1 = await delegateStore.get(
					createStoreGetter(stateStore),
					delegateAddress1,
				);
				const delegateData2 = await delegateStore.get(
					createStoreGetter(stateStore),
					delegateAddress2,
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
					MODULE_NAME_DPOS,
					governanceTokenID,
					positiveVoteDelegate1,
				);
			});

			it('should make voter to have correct unlocking', async () => {
				// Arrange
				await command.execute(context);

				const voterData = await voterStore.get(createStoreGetter(stateStore), senderAddress);
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

				const delegateData1 = await delegateStore.get(
					createStoreGetter(stateStore),
					delegateAddress1,
				);

				// Assert
				expect(delegateData1.totalVotesReceived).toEqual(
					delegate1VoteAmount + positiveVoteDelegate1,
				);
			});

			it('should make downvoted delegate account to have correct totalVotesReceived', async () => {
				// Arrange
				await command.execute(context);

				const delegateData2 = await delegateStore.get(
					createStoreGetter(stateStore),
					delegateAddress2,
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
					const nonExistingDelegateAddress = utils.getRandomBytes(20);

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
						const delegateAddress = utils.getRandomBytes(20);

						const delegateInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someDelegate${i}`,
							pomHeights: [],
							selfVotes: BigInt(0),
							totalVotesReceived: BigInt(0),
							commission: 0,
							lastCommissionIncreaseHeight: 0,
							sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
						};

						await delegateStore.set(createStoreGetter(stateStore), delegateAddress, delegateInfo);
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
					const voterData = await voterStore.getOrDefault(
						createStoreGetter(stateStore),
						senderAddress,
					);

					// Suppose account already voted for 8 delegates
					for (let i = 0; i < initialDelegateAmount; i += 1) {
						const delegateAddress = utils.getRandomBytes(20);

						const delegateInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someDelegate${i}`,
							pomHeights: [],
							selfVotes: BigInt(0),
							totalVotesReceived: BigInt(0),
							commission: 0,
							lastCommissionIncreaseHeight: 0,
							sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
						};

						await delegateStore.set(createStoreGetter(stateStore), delegateAddress, delegateInfo);

						const vote = {
							delegateAddress,
							amount: liskToBeddows(20),
							voteSharingCoefficients: [
								{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) },
							],
						};
						voterData.sentVotes.push(vote);
					}

					await voterStore.set(createStoreGetter(stateStore), senderAddress, voterData);

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
						const delegateAddress = utils.getRandomBytes(20);

						const delegateInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someDelegate${i + initialDelegateAmount}`,
							pomHeights: [],
							selfVotes: BigInt(0),
							totalVotesReceived: BigInt(0),
							commission: 0,
							lastCommissionIncreaseHeight: 0,
							sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
						};

						await delegateStore.set(createStoreGetter(stateStore), delegateAddress, delegateInfo);

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
					const voterData = await voterStore.getOrDefault(
						createStoreGetter(stateStore),
						senderAddress,
					);

					// Suppose account already 19 unlocking
					for (let i = 0; i < initialDelegateAmountForUnlocks; i += 1) {
						const delegateAddress = utils.getRandomBytes(20);

						const delegateInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someDelegate${i}`,
							pomHeights: [],
							selfVotes: BigInt(0),
							totalVotesReceived: BigInt(0),
							commission: 0,
							lastCommissionIncreaseHeight: 0,
							sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
						};

						await delegateStore.set(createStoreGetter(stateStore), delegateAddress, delegateInfo);

						const pendingUnlock = {
							delegateAddress,
							amount: liskToBeddows(20),
							unvoteHeight: i,
						};
						voterData.pendingUnlocks.push(pendingUnlock);
					}

					// Suppose account have 5 positive votes
					for (let i = 0; i < 5; i += 1) {
						const delegateAddress = utils.getRandomBytes(20);

						const delegateInfo = {
							consecutiveMissedBlocks: 0,
							isBanned: false,
							lastGeneratedHeight: 5,
							name: `someDelegate${i}`,
							pomHeights: [],
							selfVotes: BigInt(0),
							totalVotesReceived: BigInt(0),
							commission: 0,
							lastCommissionIncreaseHeight: 0,
							sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
						};

						await delegateStore.set(createStoreGetter(stateStore), delegateAddress, delegateInfo);

						const vote = {
							delegateAddress,
							amount: liskToBeddows(20),
							voteSharingCoefficients: [],
						};
						voterData.sentVotes.push(vote);
					}

					await voterStore.set(createStoreGetter(stateStore), senderAddress, voterData);

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
					const voterData = await voterStore.getOrDefault(
						createStoreGetter(stateStore),
						senderAddress,
					);
					voterData.sentVotes.push({
						delegateAddress: delegateAddress1,
						amount: liskToBeddows(70),
						voteSharingCoefficients: [],
					});
					await voterStore.set(createStoreGetter(stateStore), senderAddress, voterData);

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

				await delegateStore.set(createStoreGetter(stateStore), senderAddress, delegateInfo);

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

				const delegateData = await delegateStore.get(createStoreGetter(stateStore), senderAddress);
				const voterData = await voterStore.getOrDefault(
					createStoreGetter(stateStore),
					senderAddress,
				);
				// Assert
				expect(delegateData.totalVotesReceived).toEqual(senderVoteAmountPositive);
				expect(voterData.sentVotes).toHaveLength(1);
				expect(lockFn).toHaveBeenCalledWith(
					expect.anything(),
					senderAddress,
					MODULE_NAME_DPOS,
					governanceTokenID,
					senderVoteAmountPositive,
				);
			});

			it('should change delegateData.selfVotes and totalVotesReceived with positive vote', async () => {
				// Act & Assign
				await command.execute(context);

				const delegateData = await delegateStore.get(createStoreGetter(stateStore), senderAddress);
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

				const delegateData = await delegateStore.get(createStoreGetter(stateStore), senderAddress);
				const voterData = await voterStore.getOrDefault(
					createStoreGetter(stateStore),
					senderAddress,
				);

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
			const delegateAddress = utils.getRandomBytes(20);
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

				await delegateStore.set(createStoreGetter(stateStore), delegateAddress, delegateInfo);

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

				const delegateData = await delegateStore.get(
					createStoreGetter(stateStore),
					delegateAddress,
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

				const delegateData = await delegateStore.get(
					createStoreGetter(stateStore),
					delegateAddress,
				);
				const voterData = await voterStore.getOrDefault(
					createStoreGetter(stateStore),
					senderAddress,
				);

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
