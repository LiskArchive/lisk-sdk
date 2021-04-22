/*
 * Copyright © 2020 Lisk Foundation
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

import { validator } from '@liskhq/lisk-validator';
import { objects } from '@liskhq/lisk-utils';
import { ApplyAssetContext, ValidateAssetContext } from '../../../../../src/types';
import { VoteTransactionAsset } from '../../../../../src/modules/dpos/transaction_assets/vote_transaction_asset';
import {
	DPOSAccountProps,
	DPoSModule,
	VoteTransactionAssetContext,
} from '../../../../../src/modules/dpos';
import { liskToBeddows } from '../../../../utils/assets';
import * as testing from '../../../../../src/testing';

const { StateStoreMock } = testing.mocks;

describe('VoteTransactionAsset', () => {
	const lastBlockHeight = 200;
	let transactionAsset: VoteTransactionAsset;
	let applyContext: ApplyAssetContext<VoteTransactionAssetContext>;
	let validateContext: ValidateAssetContext<VoteTransactionAssetContext>;
	let sender: any;
	let stateStoreMock: testing.mocks.StateStoreMock;
	const delegate1 = testing.fixtures.createDefaultAccount([DPoSModule], {
		dpos: { delegate: { username: 'delegate1' } },
	});
	const delegate2 = testing.fixtures.createDefaultAccount([DPoSModule], {
		dpos: { delegate: { username: 'delegate2' } },
	});
	const delegate3 = testing.fixtures.createDefaultAccount([DPoSModule], {
		dpos: { delegate: { username: 'delegate3' } },
	});

	beforeEach(() => {
		sender = testing.fixtures.createDefaultAccount([DPoSModule]);
		stateStoreMock = new StateStoreMock({
			accounts: objects.cloneDeep([sender, delegate1, delegate2, delegate3]),
			lastBlockHeaders: [{ height: lastBlockHeight }] as any,
		});
		transactionAsset = new VoteTransactionAsset();

		const transaction = {
			senderAddress: sender.address,
		} as any;

		const asset = {
			votes: [],
		};

		applyContext = testing.createApplyAssetContext({
			transaction,
			asset,
			stateStore: stateStoreMock,
		});

		validateContext = testing.createValidateAssetContext<VoteTransactionAssetContext>({
			asset,
			transaction,
		});

		jest.spyOn(applyContext.reducerHandler, 'invoke');
		jest.spyOn(stateStoreMock.account, 'get');
		jest.spyOn(stateStoreMock.account, 'set');
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(1);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('voteDelegate');
		});

		it('should have valid schema', () => {
			expect(transactionAsset.schema).toMatchSnapshot();
		});
	});

	describe('validate', () => {
		describe('schema validation', () => {
			describe('when asset.votes does not include any vote', () => {
				it('should return errors', () => {
					validateContext.asset = {
						votes: [],
					};

					const errors = validator.validate(transactionAsset.schema, validateContext.asset);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude('must NOT have fewer than 1 items');
				});
			});

			describe('when asset.votes includes more than 20 elements', () => {
				it('should return errors', () => {
					// Arrange
					validateContext.asset = {
						votes: Array(21)
							.fill(0)
							.map(() => ({ delegateAddress: delegate1.address, amount: liskToBeddows(0) })),
					};

					const errors = validator.validate(transactionAsset.schema, validateContext.asset);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude('must NOT have more than 20 items');
				});
			});

			describe('when asset.votes includes amount which is less than int64 range', () => {
				it('should return errors', () => {
					// Arrange
					validateContext.asset = {
						votes: [
							{
								delegateAddress: delegate1.address,
								amount: BigInt(-1) * BigInt(2) ** BigInt(63) - BigInt(1),
							},
						],
					};

					// Act & Assert
					const errors = validator.validate(transactionAsset.schema, validateContext.asset);
					expect(errors[0].message).toInclude('should pass "dataType" keyword validation');
				});
			});

			describe('when asset.votes includes amount which is greater than int64 range', () => {
				it('should return errors', () => {
					// Arrange
					validateContext.asset = {
						votes: [
							{
								delegateAddress: delegate1.address,
								amount: BigInt(2) ** BigInt(63) + BigInt(1),
							},
						],
					};

					// Act & Assert
					const errors = validator.validate(transactionAsset.schema, validateContext.asset);
					expect(errors[0].message).toInclude('should pass "dataType" keyword validation');
				});
			});
		});

		describe('when asset.votes contains valid contents', () => {
			it('should not throw errors with valid upvote case', () => {
				// Arrange
				validateContext.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: liskToBeddows(20) }],
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).not.toThrow();
			});

			it('should not throw errors with valid downvote case', () => {
				// Arrange
				validateContext.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: liskToBeddows(-20) }],
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).not.toThrow();
			});

			it('should not throw errors with valid mix votes case', () => {
				// Arrange
				validateContext.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: liskToBeddows(-20) },
						{ delegateAddress: delegate2.address, amount: liskToBeddows(20) },
					],
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).not.toThrow();
			});
		});

		describe('when asset.votes includes more than 10 positive votes', () => {
			it('should throw error', () => {
				// Arrange
				validateContext.asset = {
					votes: Array(11)
						.fill(0)
						.map(() => ({ delegateAddress: delegate1.address, amount: liskToBeddows(10) })),
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).toThrow(
					'Upvote can only be casted upto 10',
				);
			});
		});

		describe('when asset.votes includes more than 10 negative votes', () => {
			it('should throw error', () => {
				// Arrange
				validateContext.asset = {
					votes: Array(11)
						.fill(0)
						.map(() => ({ delegateAddress: delegate1.address, amount: liskToBeddows(-10) })),
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).toThrow(
					'Downvote can only be casted upto 10',
				);
			});
		});

		describe('when asset.votes includes duplicate delegates within positive amount', () => {
			it('should throw error', () => {
				// Arrange
				validateContext.asset = {
					votes: Array(2)
						.fill(0)
						.map(() => ({ delegateAddress: delegate1.address, amount: liskToBeddows(-10) })),
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).toThrow(
					'Delegate address must be unique',
				);
			});
		});

		describe('when asset.votes includes duplicate delegates within positive and negative amount', () => {
			it('should throw error', () => {
				// Arrange
				validateContext.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: liskToBeddows(-10) },
						{ delegateAddress: delegate1.address, amount: liskToBeddows(20) },
					],
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).toThrow(
					'Delegate address must be unique',
				);
			});
		});

		describe('when asset.votes includes zero amount', () => {
			it('should throw error', () => {
				// Arrange
				validateContext.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: liskToBeddows(0) }],
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).toThrow('Amount cannot be 0');
			});
		});

		describe('when asset.votes includes positive amount which is not multiple of 10 * 10^8', () => {
			it('should throw error', () => {
				// Arrange
				validateContext.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: BigInt(20) }],
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).toThrow(
					'Amount should be multiple of 10 * 10^8',
				);
			});
		});

		describe('when asset.votes includes negative amount which is not multiple of 10 * 10^8', () => {
			it('should throw error', () => {
				// Arrange
				validateContext.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: BigInt(-20) }],
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).toThrow(
					'Amount should be multiple of 10 * 10^8',
				);
			});
		});
	});

	describe('apply', () => {
		const delegate1VoteAmount = liskToBeddows(90);
		const delegate2VoteAmount = liskToBeddows(50);

		beforeEach(() => {
			applyContext.asset = {
				votes: [
					{ delegateAddress: delegate1.address, amount: delegate1VoteAmount },
					{ delegateAddress: delegate2.address, amount: delegate2VoteAmount },
				].sort((a, b) => a.delegateAddress.compare(b.delegateAddress)),
			};
		});

		describe('when asset.votes contain positive amount', () => {
			it('should not throw error', async () => {
				await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
			});

			it('should throw error if vote amount is more than balance', async () => {
				(applyContext.reducerHandler.invoke as jest.Mock).mockImplementation(() => {
					throw new Error('Do not have enough balance');
				});

				await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
					'Do not have enough balance',
				);
			});

			it('should make account to have correct balance', async () => {
				await transactionAsset.apply(applyContext);

				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledTimes(2);
				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:debit', {
					address: applyContext.transaction.senderAddress,
					amount: delegate1VoteAmount,
				});
				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:debit', {
					address: applyContext.transaction.senderAddress,
					amount: delegate2VoteAmount,
				});
			});

			it('should not change account.dpos.unlocking', async () => {
				await transactionAsset.apply(applyContext);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(updatedSender.dpos.unlocking).toHaveLength(0);
			});

			it('should order account.dpos.sentVotes', async () => {
				applyContext.asset = {
					votes: [...applyContext.asset.votes].reverse(),
				};

				await transactionAsset.apply(applyContext);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				const senderVotesCopy = updatedSender.dpos.sentVotes.slice(0);
				senderVotesCopy.sort((a: any, b: any) => a.delegateAddress.compare(b.delegateAddress));
				expect(updatedSender.dpos.sentVotes).toStrictEqual(senderVotesCopy);
			});

			it('should make upvoted delegate account to have correct totalVotesReceived', async () => {
				await transactionAsset.apply(applyContext);

				const updatedDelegate1 = await stateStoreMock.account.get<DPOSAccountProps>(
					delegate1.address,
				);
				const updatedDelegate2 = await stateStoreMock.account.get<DPOSAccountProps>(
					delegate2.address,
				);

				expect(updatedDelegate1.dpos.delegate.totalVotesReceived).toEqual(delegate1VoteAmount);
				expect(updatedDelegate2.dpos.delegate.totalVotesReceived).toEqual(delegate2VoteAmount);
			});

			it('should create vote object when it does not exist before', async () => {
				await transactionAsset.apply(applyContext);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);

				expect(sender.dpos.sentVotes).toEqual([]);
				expect(updatedSender.dpos.sentVotes).toEqual(applyContext.asset.votes);
			});

			it('should update vote object when it exists before and create if it does not exist', async () => {
				await transactionAsset.apply(applyContext);
				// Send votes second time
				await transactionAsset.apply(applyContext);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(sender.dpos.sentVotes).toEqual([]);
				expect(updatedSender.dpos.sentVotes[0]).toEqual({
					delegateAddress: applyContext.asset.votes[0].delegateAddress,
					amount: applyContext.asset.votes[0].amount * BigInt(2),
				});
				expect(updatedSender.dpos.sentVotes[1]).toEqual({
					delegateAddress: applyContext.asset.votes[1].delegateAddress,
					amount: applyContext.asset.votes[1].amount * BigInt(2),
				});
			});
		});

		describe('when asset.votes contain negative amount which makes account.dpos.sentVotes to be 0 entries', () => {
			beforeEach(async () => {
				const votesContext = objects.cloneDeep(applyContext);
				votesContext.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: delegate1VoteAmount },
						{ delegateAddress: delegate2.address, amount: delegate2VoteAmount },
					],
				};
				await transactionAsset.apply(votesContext);

				// Clears mock calls for earlier apply asset
				(applyContext.reducerHandler.invoke as jest.Mock).mockClear();

				applyContext.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: BigInt(-1) * delegate1VoteAmount },
						{ delegateAddress: delegate2.address, amount: BigInt(-1) * delegate2VoteAmount },
					].sort((a, b) => -1 * a.delegateAddress.compare(b.delegateAddress)),
				};
			});

			it('should not throw error', async () => {
				await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
			});

			it('should not change account balance', async () => {
				await transactionAsset.apply(applyContext);

				expect(applyContext.reducerHandler.invoke).not.toHaveBeenCalled();
			});

			it('should remove vote which has zero amount', async () => {
				applyContext.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: BigInt(-1) * delegate1VoteAmount }],
				};

				await transactionAsset.apply(applyContext);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(updatedSender.dpos.sentVotes).toHaveLength(1);
				expect(updatedSender.dpos.sentVotes[0].delegateAddress).not.toEqual(delegate1.address);
			});

			it('should update vote which has non-zero amount', async () => {
				const downVoteAmount = liskToBeddows(10);
				applyContext.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: BigInt(-1) * downVoteAmount }],
				};

				await transactionAsset.apply(applyContext);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(updatedSender.dpos.sentVotes).toHaveLength(2);
				expect(
					updatedSender.dpos.sentVotes.find(v => v.delegateAddress.equals(delegate1.address)),
				).toEqual({
					delegateAddress: delegate1.address,
					amount: delegate1VoteAmount - downVoteAmount,
				});
			});

			it('should make account to have correct unlocking', async () => {
				await transactionAsset.apply(applyContext);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(updatedSender.dpos.unlocking).toHaveLength(2);
				expect(updatedSender.dpos.unlocking).toEqual(
					[
						{
							delegateAddress: delegate1.address,
							amount: delegate1VoteAmount,
							unvoteHeight: lastBlockHeight + 1,
						},
						{
							delegateAddress: delegate2.address,
							amount: delegate2VoteAmount,
							unvoteHeight: lastBlockHeight + 1,
						},
					].sort((a, b) => a.delegateAddress.compare(b.delegateAddress)),
				);
			});

			it('should order account.dpos.unlocking', async () => {
				await transactionAsset.apply(applyContext);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(updatedSender.dpos.unlocking).toHaveLength(2);
				expect(updatedSender.dpos.unlocking.map(d => d.delegateAddress)).toEqual(
					[delegate1.address, delegate2.address].sort((a, b) => a.compare(b)),
				);
			});

			it('should make downvoted delegate account to have correct totalVotesReceived', async () => {
				await transactionAsset.apply(applyContext);

				const updatedDelegate1 = await stateStoreMock.account.get<DPOSAccountProps>(
					delegate1.address,
				);
				const updatedDelegate2 = await stateStoreMock.account.get<DPOSAccountProps>(
					delegate2.address,
				);

				expect(updatedDelegate1.dpos.delegate.totalVotesReceived).toEqual(BigInt(0));
				expect(updatedDelegate2.dpos.delegate.totalVotesReceived).toEqual(BigInt(0));
			});

			it('should throw error when downvoted delegate is not already upvoted', async () => {
				applyContext.asset = {
					votes: [{ delegateAddress: delegate3.address, amount: BigInt(-1) * delegate1VoteAmount }],
				};

				await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
					'Cannot cast downvote to delegate who is not upvoted',
				);
			});
		});

		describe('when asset.votes contain negative and positive amount', () => {
			const positiveVoteDelegate1 = liskToBeddows(10);
			const negativeVoteDelegate2 = liskToBeddows(-20);

			beforeEach(async () => {
				const votesContext = objects.cloneDeep(applyContext);
				votesContext.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: delegate1VoteAmount },
						{ delegateAddress: delegate2.address, amount: delegate2VoteAmount },
					],
				};
				await transactionAsset.apply(votesContext);

				// Clears mock calls for earlier apply asset
				(applyContext.reducerHandler.invoke as jest.Mock).mockClear();

				applyContext.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: positiveVoteDelegate1 },
						{ delegateAddress: delegate2.address, amount: negativeVoteDelegate2 },
					].sort((a, b) => -1 * a.delegateAddress.compare(b.delegateAddress)),
				};
			});

			it('should not throw error', async () => {
				await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
			});

			it('should make account to have correct balance', async () => {
				await transactionAsset.apply(applyContext);

				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledTimes(1);
				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:debit', {
					address: applyContext.transaction.senderAddress,
					amount: positiveVoteDelegate1,
				});
			});

			it('should make account to have correct unlocking', async () => {
				await transactionAsset.apply(applyContext);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(updatedSender.dpos.unlocking).toHaveLength(1);
				expect(updatedSender.dpos.unlocking).toEqual([
					{
						delegateAddress: delegate2.address,
						amount: BigInt(-1) * negativeVoteDelegate2,
						unvoteHeight: lastBlockHeight + 1,
					},
				]);
			});

			it('should make upvoted delegate account to have correct totalVotesReceived', async () => {
				await transactionAsset.apply(applyContext);

				const updatedDelegate1 = await stateStoreMock.account.get<DPOSAccountProps>(
					delegate1.address,
				);

				expect(updatedDelegate1.dpos.delegate.totalVotesReceived).toEqual(
					delegate1VoteAmount + positiveVoteDelegate1,
				);
			});

			it('should make downvoted delegate account to have correct totalVotesReceived', async () => {
				await transactionAsset.apply(applyContext);

				const updatedDelegate2 = await stateStoreMock.account.get<DPOSAccountProps>(
					delegate2.address,
				);

				expect(updatedDelegate2.dpos.delegate.totalVotesReceived).toEqual(
					delegate2VoteAmount + negativeVoteDelegate2,
				);
			});
		});

		describe('when asset.votes contain invalid data', () => {
			beforeEach(() => {
				applyContext.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: delegate1VoteAmount },
						{ delegateAddress: delegate2.address, amount: delegate2VoteAmount },
					].sort((a, b) => -1 * a.delegateAddress.compare(b.delegateAddress)),
				};
			});

			describe('when asset.votes contain delegate address which account does not exists', () => {
				it('should throw error', async () => {
					const nonExistingAccount = testing.fixtures.createDefaultAccount([DPoSModule], {
						dpos: { delegate: { username: '' } },
					});
					applyContext.asset = {
						votes: [
							...applyContext.asset.votes,
							{ delegateAddress: nonExistingAccount.address, amount: liskToBeddows(76) },
						],
					};

					await expect(transactionAsset.apply(applyContext)).rejects.toThrow('Account not defined');
				});
			});

			describe('when asset.votes contain delegate address which is not registered delegate', () => {
				it('should throw error', async () => {
					const nonRegisteredDelegate = testing.fixtures.createDefaultAccount([DPoSModule], {
						dpos: { delegate: { username: '' } },
					});
					await stateStoreMock.account.set(nonRegisteredDelegate.address, nonRegisteredDelegate);
					applyContext.asset = {
						votes: [
							...applyContext.asset.votes,
							{ delegateAddress: nonRegisteredDelegate.address, amount: liskToBeddows(76) },
						],
					};

					await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
						`Voted delegate address ${nonRegisteredDelegate.address.toString(
							'hex',
						)} is not registered`,
					);
				});
			});

			describe('when asset.votes positive amount makes account.dpos.sentVotes entries more than 10', () => {
				it('should throw error', async () => {
					const votes = [];

					for (let i = 0; i < 12; i += 1) {
						const delegate = testing.fixtures.createDefaultAccount([DPoSModule], {
							dpos: { delegate: { username: `newdelegate${i}` } },
						});
						await stateStoreMock.account.set(delegate.address, delegate);
						votes.push({
							delegateAddress: delegate.address,
							amount: liskToBeddows(10),
						});
					}

					applyContext.asset = {
						votes,
					};

					await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
						'Account can only vote upto 10',
					);
				});
			});

			describe('when asset.votes negative amount decrease account.dpos.sentVotes entries yet positive amount makes account exceeds more than 10', () => {
				it('should throw error', async () => {
					const updatedSender = objects.cloneDeep(sender);
					// Suppose account already voted for 8 delegates
					for (let i = 0; i < 8; i += 1) {
						const delegate = testing.fixtures.createDefaultAccount([DPoSModule], {
							dpos: { delegate: { username: `existingdelegate${i}` } },
						});

						await stateStoreMock.account.set(delegate.address, delegate);

						updatedSender.dpos.sentVotes.push({
							delegateAddress: delegate.address,
							amount: liskToBeddows(20),
						});
					}
					await stateStoreMock.account.set(sender.address, updatedSender);

					// We have 2 negative votes
					const votes = [
						{
							delegateAddress: updatedSender.dpos.sentVotes[0].delegateAddress,
							amount: liskToBeddows(-10),
						},
						{
							delegateAddress: updatedSender.dpos.sentVotes[1].delegateAddress,
							amount: liskToBeddows(-10),
						},
					];

					// We have 3 positive votes
					for (let i = 0; i < 3; i += 1) {
						const delegate = testing.fixtures.createDefaultAccount([DPoSModule], {
							dpos: { delegate: { username: `newdelegate${i}` } },
						});
						await stateStoreMock.account.set(delegate.address, delegate);
						votes.push({
							delegateAddress: delegate.address,
							amount: liskToBeddows(10),
						});
					}

					applyContext.asset = {
						// Account already contains 8 positive votes
						// now we added 2 negative votes and 3 new positive votes
						// which will make total positive votes to grow over 10
						votes,
					};

					await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
						'Account can only vote upto 10',
					);
				});
			});

			describe('when asset.votes negative amount and makes account.dpos.unlocking more than 20 entries', () => {
				it('should throw error', async () => {
					const updatedSender = objects.cloneDeep(sender);
					// Suppose account already 19 unlocking
					for (let i = 0; i < 19; i += 1) {
						const delegate = testing.fixtures.createDefaultAccount([DPoSModule], {
							dpos: { delegate: { username: `existingdelegate${i}` } },
						});

						await stateStoreMock.account.set(delegate.address, delegate);

						updatedSender.dpos.unlocking.push({
							delegateAddress: delegate.address,
							amount: liskToBeddows(20),
							unvoteHeight: i,
						});
					}
					// Suppose account have 5 positive votes
					for (let i = 0; i < 5; i += 1) {
						const delegate = testing.fixtures.createDefaultAccount([DPoSModule], {
							dpos: { delegate: { username: `existingdelegate${i}` } },
						});

						await stateStoreMock.account.set(delegate.address, delegate);

						updatedSender.dpos.sentVotes.push({
							delegateAddress: delegate.address,
							amount: liskToBeddows(20),
						});
					}
					await stateStoreMock.account.set(sender.address, updatedSender);

					// We have 2 negative votes
					const votes = [
						{
							delegateAddress: updatedSender.dpos.sentVotes[0].delegateAddress,
							amount: liskToBeddows(-10),
						},
						{
							delegateAddress: updatedSender.dpos.sentVotes[1].delegateAddress,
							amount: liskToBeddows(-10),
						},
					];

					applyContext.asset = {
						// Account already contains 19 unlocking and 5 positive votes
						// now we added 2 negative votes
						// which will make total unlocking to grow over 20
						votes,
					};

					await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
						'Cannot downvote which exceeds account.dpos.unlocking to have more than 20',
					);
				});
			});

			describe('when asset.votes negative amount exceeds the previously voted amount', () => {
				it('should throw error', async () => {
					const updatedSender = objects.cloneDeep(sender);
					updatedSender.dpos.sentVotes.push({
						delegateAddress: delegate1.address,
						amount: liskToBeddows(70),
					});
					await stateStoreMock.account.set(sender.address, updatedSender);

					applyContext.asset = {
						// Negative vote for more than what was earlier voted
						votes: [
							{
								delegateAddress: delegate1.address,
								amount: liskToBeddows(-80),
							},
						],
					};

					await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
						'The downvote amount cannot be greater than upvoted amount.',
					);
				});
			});
		});

		describe('when asset.votes contains self-vote', () => {
			const senderVoteAmount = liskToBeddows(80);

			beforeEach(async () => {
				// Make sender a delegate
				const updatedSender = objects.cloneDeep(sender);
				updatedSender.dpos.delegate.username = 'sender_delegate';
				await stateStoreMock.account.set(sender.address, updatedSender);

				applyContext.asset = {
					votes: [{ delegateAddress: sender.address, amount: senderVoteAmount }],
				};
			});

			it('should update votes and totalVotesReceived', async () => {
				// Act
				await transactionAsset.apply(applyContext);

				// Assert
				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(updatedSender.dpos.delegate.totalVotesReceived).toEqual(senderVoteAmount);
				expect(updatedSender.dpos.sentVotes).toHaveLength(1);
				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:debit', {
					address: sender.address,
					amount: senderVoteAmount,
				});
			});
		});

		describe('when asset.votes contains self-downvote', () => {
			const senderUpVoteAmount = liskToBeddows(80);
			const senderDownVoteAmount = liskToBeddows(30);

			beforeEach(async () => {
				// Make sender a delegate and make it sure it have a self vote already
				const updatedSender = objects.cloneDeep(sender);
				updatedSender.dpos.delegate.username = 'sender_delegate';
				updatedSender.dpos.delegate.totalVotesReceived = senderUpVoteAmount;
				updatedSender.dpos.sentVotes = [
					{ delegateAddress: updatedSender.address, amount: senderUpVoteAmount },
				];
				await stateStoreMock.account.set(sender.address, updatedSender);

				applyContext.asset = {
					votes: [{ delegateAddress: sender.address, amount: BigInt(-1) * senderDownVoteAmount }],
				};
			});

			it('should update votes, totalVotesReceived and unlocking', async () => {
				// Act
				await transactionAsset.apply(applyContext);

				// Assert
				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(updatedSender.dpos.delegate.totalVotesReceived).toEqual(
					senderUpVoteAmount - senderDownVoteAmount,
				);
				expect(updatedSender.dpos.sentVotes).toHaveLength(1);
				expect(updatedSender.dpos.sentVotes).toEqual([
					{ delegateAddress: sender.address, amount: senderUpVoteAmount - senderDownVoteAmount },
				]);
				expect(updatedSender.dpos.unlocking).toHaveLength(1);
				expect(updatedSender.dpos.unlocking).toEqual([
					{
						delegateAddress: sender.address,
						amount: senderDownVoteAmount,
						unvoteHeight: lastBlockHeight + 1,
					},
				]);
				expect(applyContext.reducerHandler.invoke).not.toHaveBeenCalled();
			});
		});
	});
});
