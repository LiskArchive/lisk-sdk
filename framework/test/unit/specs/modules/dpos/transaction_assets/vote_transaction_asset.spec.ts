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
import { ApplyAssetInput, ValidateAssetInput } from '../../../../../../src/modules';
import { createFakeDefaultAccount } from '../../../../../utils/node';
import { StateStoreMock } from '../../../../../utils/node/state_store_mock';
import {
	VoteTransactionAsset,
	VoteTransactionAssetInput,
} from '../../../../../../src/modules/dpos/transaction_assets/vote_transaction_asset';
import { DPOSAccountProps } from '../../../../../../src/modules/dpos';
import { Account } from '../../../../../../src/modules/base_asset';

const liskToBeddows = (lisk: number) => BigInt(10) * BigInt(10) ** BigInt(8) * BigInt(lisk);

describe('VoteTransactionAsset', () => {
	const lastBlockHeight = 200;
	let transactionAsset: VoteTransactionAsset;
	let applyInput: ApplyAssetInput<VoteTransactionAssetInput>;
	let validateInput: ValidateAssetInput<VoteTransactionAssetInput>;
	let sender: any;
	let stateStoreMock: StateStoreMock;
	const delegate1 = createFakeDefaultAccount({ dpos: { delegate: { username: 'delegate1' } } });
	const delegate2 = createFakeDefaultAccount({ dpos: { delegate: { username: 'delegate2' } } });
	const delegate3 = createFakeDefaultAccount({ dpos: { delegate: { username: 'delegate3' } } });

	beforeEach(() => {
		sender = createFakeDefaultAccount({});
		stateStoreMock = new StateStoreMock(
			objects.cloneDeep([sender, delegate1, delegate2, delegate3]),
			{
				lastBlockHeaders: [{ height: lastBlockHeight }] as any,
			},
		);
		transactionAsset = new VoteTransactionAsset();
		applyInput = {
			senderID: sender.address,
			asset: {
				votes: [],
			},
			stateStore: stateStoreMock as any,
			reducerHandler: {
				invoke: jest.fn(),
			},
		} as any;
		validateInput = { asset: { votes: [] } } as any;

		jest.spyOn(stateStoreMock.account, 'get');
		jest.spyOn(stateStoreMock.account, 'set');
	});

	describe('constructor', () => {
		it('should have valid type', () => {
			expect(transactionAsset.type).toEqual(1);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('vote');
		});

		it('should have valid accountSchema', () => {
			expect(transactionAsset.assetSchema).toMatchSnapshot();
		});

		it('should have valid baseFee', () => {
			expect(transactionAsset.baseFee).toEqual(BigInt(0));
		});
	});

	describe('validateAsset', () => {
		describe('schema validation', () => {
			describe('when asset.votes does not include any vote', () => {
				it('should return errors', () => {
					validateInput.asset = {
						votes: [],
					};

					const errors = validator.validate(transactionAsset.assetSchema, validateInput.asset);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude('should NOT have fewer than 1 items');
				});
			});

			describe('when asset.votes includes more than 20 elements', () => {
				it('should return errors', () => {
					// Arrange
					validateInput.asset = {
						votes: Array(21)
							.fill(0)
							.map(() => ({ delegateAddress: delegate1.address, amount: liskToBeddows(0) })),
					};

					const errors = validator.validate(transactionAsset.assetSchema, validateInput.asset);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude('should NOT have more than 20 items');
				});
			});

			describe('when asset.votes includes amount which is less than int64 range', () => {
				it('should return errors', () => {
					// Arrange
					validateInput.asset = {
						votes: [
							{
								delegateAddress: delegate1.address,
								amount: BigInt(-1) * BigInt(2) ** BigInt(63) - BigInt(1),
							},
						],
					};

					// Act & Assert
					const errors = validator.validate(transactionAsset.assetSchema, validateInput.asset);
					expect(errors[0].message).toInclude('should pass "dataType" keyword validation');
				});
			});

			describe('when asset.votes includes amount which is greater than int64 range', () => {
				it('should return errors', () => {
					// Arrange
					validateInput.asset = {
						votes: [
							{
								delegateAddress: delegate1.address,
								amount: BigInt(2) ** BigInt(63) + BigInt(1),
							},
						],
					};

					// Act & Assert
					const errors = validator.validate(transactionAsset.assetSchema, validateInput.asset);
					expect(errors[0].message).toInclude('should pass "dataType" keyword validation');
				});
			});
		});

		describe('when asset.votes contains valid contents', () => {
			it('should not throw errors with valid upvote case', () => {
				// Arrange
				validateInput.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: liskToBeddows(20) }],
				};

				// Act & Assert
				expect(() => transactionAsset.validateAsset(validateInput)).not.toThrow();
			});

			it('should not throw errors with valid downvote case', () => {
				// Arrange
				validateInput.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: liskToBeddows(-20) }],
				};

				// Act & Assert
				expect(() => transactionAsset.validateAsset(validateInput)).not.toThrow();
			});

			it('should not throw errors with valid mix votes case', () => {
				// Arrange
				validateInput.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: liskToBeddows(-20) },
						{ delegateAddress: delegate2.address, amount: liskToBeddows(20) },
					],
				};

				// Act & Assert
				expect(() => transactionAsset.validateAsset(validateInput)).not.toThrow();
			});
		});

		describe('when asset.votes includes more than 10 positive votes', () => {
			it('should throw error', () => {
				// Arrange
				validateInput.asset = {
					votes: Array(11)
						.fill(0)
						.map(() => ({ delegateAddress: delegate1.address, amount: liskToBeddows(10) })),
				};

				// Act & Assert
				expect(() => transactionAsset.validateAsset(validateInput)).toThrow(
					'Upvote can only be casted upto 10',
				);
			});
		});

		describe('when asset.votes includes more than 10 negative votes', () => {
			it('should throw error', () => {
				// Arrange
				validateInput.asset = {
					votes: Array(11)
						.fill(0)
						.map(() => ({ delegateAddress: delegate1.address, amount: liskToBeddows(-10) })),
				};

				// Act & Assert
				expect(() => transactionAsset.validateAsset(validateInput)).toThrow(
					'Downvote can only be casted upto 10',
				);
			});
		});

		describe('when asset.votes includes duplicate delegates within positive amount', () => {
			it('should throw error', () => {
				// Arrange
				validateInput.asset = {
					votes: Array(2)
						.fill(0)
						.map(() => ({ delegateAddress: delegate1.address, amount: liskToBeddows(-10) })),
				};

				// Act & Assert
				expect(() => transactionAsset.validateAsset(validateInput)).toThrow(
					'Delegate address must be unique',
				);
			});
		});

		describe('when asset.votes includes duplicate delegates within positive and negative amount', () => {
			it('should throw error', () => {
				// Arrange
				validateInput.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: liskToBeddows(-10) },
						{ delegateAddress: delegate1.address, amount: liskToBeddows(20) },
					],
				};

				// Act & Assert
				expect(() => transactionAsset.validateAsset(validateInput)).toThrow(
					'Delegate address must be unique',
				);
			});
		});

		describe('when asset.votes includes zero amount', () => {
			it('should throw error', () => {
				// Arrange
				validateInput.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: liskToBeddows(0) }],
				};

				// Act & Assert
				expect(() => transactionAsset.validateAsset(validateInput)).toThrow('Amount cannot be 0');
			});
		});

		describe('when asset.votes includes amount which is not multiple of 10 * 10^8', () => {
			it('should throw error', () => {
				// Arrange
				validateInput.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: BigInt(20) }],
				};

				// Act & Assert
				expect(() => transactionAsset.validateAsset(validateInput)).toThrow(
					'Amount should be multiple of 10 * 10^8',
				);
			});
		});
	});

	describe('applyAsset', () => {
		const delegate1VoteAmount = liskToBeddows(90);
		const delegate2VoteAmount = liskToBeddows(50);

		beforeEach(() => {
			applyInput.asset = {
				votes: [
					{ delegateAddress: delegate1.address, amount: delegate1VoteAmount },
					{ delegateAddress: delegate2.address, amount: delegate2VoteAmount },
				].sort((a, b) => a.delegateAddress.compare(b.delegateAddress)),
			};
		});

		describe('when asset.votes contain positive amount', () => {
			it('should not throw error', async () => {
				await expect(transactionAsset.applyAsset(applyInput)).resolves.toBeUndefined();
			});

			it('should make account to have correct balance', async () => {
				await transactionAsset.applyAsset(applyInput);

				expect(applyInput.reducerHandler.invoke).toHaveBeenCalledTimes(2);
				expect(applyInput.reducerHandler.invoke).toHaveBeenCalledWith('token:debit', {
					address: applyInput.senderID,
					amount: delegate1VoteAmount,
				});
				expect(applyInput.reducerHandler.invoke).toHaveBeenCalledWith('token:debit', {
					address: applyInput.senderID,
					amount: delegate2VoteAmount,
				});
			});

			it('should not change account.dpos.unlocking', async () => {
				await transactionAsset.applyAsset(applyInput);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(updatedSender.dpos.unlocking).toHaveLength(0);
			});

			it('should order account.dpos.sentVotes', async () => {
				applyInput.asset = {
					votes: [...applyInput.asset.votes].reverse(),
				};

				await transactionAsset.applyAsset(applyInput);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				const senderVotesCopy = updatedSender.dpos.sentVotes.slice(0);
				senderVotesCopy.sort((a: any, b: any) => a.delegateAddress.compare(b.delegateAddress));
				expect(updatedSender.dpos.sentVotes).toStrictEqual(senderVotesCopy);
			});

			it('should make upvoted delegate account to have correct totalVotesReceived', async () => {
				await transactionAsset.applyAsset(applyInput);

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
				await transactionAsset.applyAsset(applyInput);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);

				expect(sender.dpos.sentVotes).toEqual([]);
				expect(updatedSender.dpos.sentVotes).toEqual(applyInput.asset.votes);
			});

			it('should update vote object when it exists before and create if it does not exist', async () => {
				await transactionAsset.applyAsset(applyInput);
				// Send votes second time
				await transactionAsset.applyAsset(applyInput);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(sender.dpos.sentVotes).toEqual([]);
				expect(updatedSender.dpos.sentVotes[0]).toEqual({
					delegateAddress: applyInput.asset.votes[0].delegateAddress,
					amount: applyInput.asset.votes[0].amount * BigInt(2),
				});
				expect(updatedSender.dpos.sentVotes[1]).toEqual({
					delegateAddress: applyInput.asset.votes[1].delegateAddress,
					amount: applyInput.asset.votes[1].amount * BigInt(2),
				});
			});
		});

		describe('when asset.votes contain negative amount which makes account.dpos.sentVotes to be 0 entries', () => {
			beforeEach(async () => {
				const votesInput = objects.cloneDeep(applyInput);
				votesInput.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: delegate1VoteAmount },
						{ delegateAddress: delegate2.address, amount: delegate2VoteAmount },
					],
				};
				await transactionAsset.applyAsset(votesInput);

				// Clears mock calls for earlier apply asset
				(applyInput.reducerHandler.invoke as jest.Mock).mockClear();

				applyInput.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: BigInt(-1) * delegate1VoteAmount },
						{ delegateAddress: delegate2.address, amount: BigInt(-1) * delegate2VoteAmount },
					].sort((a, b) => -1 * a.delegateAddress.compare(b.delegateAddress)),
				};
			});

			it('should not throw error', async () => {
				await expect(transactionAsset.applyAsset(applyInput)).resolves.toBeUndefined();
			});

			it('should not change account balance', async () => {
				await transactionAsset.applyAsset(applyInput);

				expect(applyInput.reducerHandler.invoke).not.toHaveBeenCalled();
			});

			it('should remove vote which has zero amount', async () => {
				applyInput.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: BigInt(-1) * delegate1VoteAmount }],
				};

				await transactionAsset.applyAsset(applyInput);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(updatedSender.dpos.sentVotes).toHaveLength(1);
				expect(updatedSender.dpos.sentVotes[0].delegateAddress).not.toEqual(delegate1.address);
			});

			it('should update vote which has non-zero amount', async () => {
				const downVoteAmount = liskToBeddows(10);
				applyInput.asset = {
					votes: [{ delegateAddress: delegate1.address, amount: BigInt(-1) * downVoteAmount }],
				};

				await transactionAsset.applyAsset(applyInput);

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
				await transactionAsset.applyAsset(applyInput);

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
				await transactionAsset.applyAsset(applyInput);

				const updatedSender = await stateStoreMock.account.get<DPOSAccountProps>(sender.address);
				expect(updatedSender.dpos.unlocking).toHaveLength(2);
				expect(updatedSender.dpos.unlocking.map(d => d.delegateAddress)).toEqual(
					[delegate1.address, delegate2.address].sort((a, b) => a.compare(b)),
				);
			});

			it('should make downvoted delegate account to have correct totalVotesReceived', async () => {
				await transactionAsset.applyAsset(applyInput);

				const updatedDelegate1 = await stateStoreMock.account.get<DPOSAccountProps>(
					delegate1.address,
				);
				const updatedDelegate2 = await stateStoreMock.account.get<DPOSAccountProps>(
					delegate2.address,
				);

				expect(updatedDelegate1.dpos.delegate.totalVotesReceived).toEqual(BigInt(0));
				expect(updatedDelegate2.dpos.delegate.totalVotesReceived).toEqual(BigInt(0));
			});
		});

		describe('when asset.votes contain negative and positive amount ', () => {
			const positiveVoteDelegate1 = liskToBeddows(10);
			const negativeVoteDelegate2 = liskToBeddows(-20);

			beforeEach(async () => {
				const votesInput = objects.cloneDeep(applyInput);
				votesInput.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: delegate1VoteAmount },
						{ delegateAddress: delegate2.address, amount: delegate2VoteAmount },
					],
				};
				await transactionAsset.applyAsset(votesInput);

				// Clears mock calls for earlier apply asset
				(applyInput.reducerHandler.invoke as jest.Mock).mockClear();

				applyInput.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: positiveVoteDelegate1 },
						{ delegateAddress: delegate2.address, amount: negativeVoteDelegate2 },
					].sort((a, b) => -1 * a.delegateAddress.compare(b.delegateAddress)),
				};
			});

			it('should not throw error', async () => {
				await expect(transactionAsset.applyAsset(applyInput)).resolves.toBeUndefined();
			});

			it('should make account to have correct balance', async () => {
				await transactionAsset.applyAsset(applyInput);

				expect(applyInput.reducerHandler.invoke).toHaveBeenCalledTimes(1);
				expect(applyInput.reducerHandler.invoke).toHaveBeenCalledWith('token:debit', {
					address: applyInput.senderID,
					amount: positiveVoteDelegate1,
				});
			});

			it('should make account to have correct unlocking', async () => {
				await transactionAsset.applyAsset(applyInput);

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
				await transactionAsset.applyAsset(applyInput);

				const updatedDelegate1 = await stateStoreMock.account.get<DPOSAccountProps>(
					delegate1.address,
				);

				expect(updatedDelegate1.dpos.delegate.totalVotesReceived).toEqual(
					delegate1VoteAmount + positiveVoteDelegate1,
				);
			});

			it('should make downvoted delegate account to have correct totalVotesReceived', async () => {
				await transactionAsset.applyAsset(applyInput);

				const updatedDelegate2 = await stateStoreMock.account.get<DPOSAccountProps>(
					delegate2.address,
				);

				expect(updatedDelegate2.dpos.delegate.totalVotesReceived).toEqual(
					delegate2VoteAmount + negativeVoteDelegate2,
				);
			});
		});

		describe('given asset.votes contain invalid data', () => {
			beforeEach(() => {
				applyInput.asset = {
					votes: [
						{ delegateAddress: delegate1.address, amount: delegate1VoteAmount },
						{ delegateAddress: delegate2.address, amount: delegate2VoteAmount },
					].sort((a, b) => -1 * a.delegateAddress.compare(b.delegateAddress)),
				};
			});

			describe('when asset.votes contain delegate address which account does not exists', () => {
				it('should throw error', async () => {
					const nonExistingAccount = createFakeDefaultAccount({
						dpos: { delegate: { username: '' } },
					});
					applyInput.asset = {
						votes: [
							...applyInput.asset.votes,
							{ delegateAddress: nonExistingAccount.address, amount: liskToBeddows(76) },
						],
					};

					await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
						'Account not defined',
					);
				});
			});

			describe('when asset.votes contain delegate address which is not registered delegate', () => {
				it('should throw error', async () => {
					const nonRegisteredDelegate = createFakeDefaultAccount({
						dpos: { delegate: { username: '' } },
					});
					stateStoreMock.account.set(nonRegisteredDelegate.address, nonRegisteredDelegate);
					applyInput.asset = {
						votes: [
							...applyInput.asset.votes,
							{ delegateAddress: nonRegisteredDelegate.address, amount: liskToBeddows(76) },
						],
					};

					await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
						`Voted delegate is not registered. Address: ${nonRegisteredDelegate.address.toString(
							'base64',
						)}`,
					);
				});
			});

			describe('when asset.votes positive amount makes account.dpos.sentVotes entries more than 10', () => {
				it('should throw error', async () => {
					const votes = [];

					for (let i = 0; i < 12; i += 1) {
						const delegate = createFakeDefaultAccount({
							dpos: { delegate: { username: `newdelegate${i}` } },
						});
						stateStoreMock.account.set(delegate.address, delegate);
						votes.push({
							delegateAddress: delegate.address,
							amount: liskToBeddows(10),
						});
					}

					applyInput.asset = {
						votes,
					};

					await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
						'Account can only vote upto 10',
					);
				});
			});

			// TODO: Handle this test case elsewhere
			describe('when the last asset.votes amount makes sender not having sufficient balance', () => {
				it.todo('should throw error');
			});

			describe('when asset.votes negative amount decrease account.dpos.sentVotes entries yet positive amount makes account exceeds more than 10', () => {
				it('should throw error', async () => {
					const updatedSender = objects.cloneDeep(sender) as Account<DPOSAccountProps>;
					// Suppose account already voted for 8 delegates
					for (let i = 0; i < 8; i += 1) {
						const delegate = createFakeDefaultAccount({
							dpos: { delegate: { username: `existingdelegate${i}` } },
						});

						stateStoreMock.account.set(delegate.address, delegate);

						updatedSender.dpos.sentVotes.push({
							delegateAddress: delegate.address,
							amount: liskToBeddows(20),
						});
					}
					stateStoreMock.account.set(sender.address, updatedSender);

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
						const delegate = createFakeDefaultAccount({
							dpos: { delegate: { username: `newdelegate${i}` } },
						});
						stateStoreMock.account.set(delegate.address, delegate);
						votes.push({
							delegateAddress: delegate.address,
							amount: liskToBeddows(10),
						});
					}

					applyInput.asset = {
						// Account already contains 8 positive votes
						// now we added 2 negative votes and 3 new positive votes
						// which will make total positive votes to grow over 10
						votes,
					};

					await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
						'Account can only vote upto 10',
					);
				});
			});

			describe('when asset.votes negative amount and makes account.dpos.unlocking more than 20 entries', () => {
				it('should throw error', async () => {
					const updatedSender = objects.cloneDeep(sender) as Account<DPOSAccountProps>;
					// Suppose account already 19 unlocking
					for (let i = 0; i < 19; i += 1) {
						const delegate = createFakeDefaultAccount({
							dpos: { delegate: { username: `existingdelegate${i}` } },
						});

						stateStoreMock.account.set(delegate.address, delegate);

						updatedSender.dpos.unlocking.push({
							delegateAddress: delegate.address,
							amount: liskToBeddows(20),
							unvoteHeight: i,
						});
					}
					// Suppose account have 5 positive votes
					for (let i = 0; i < 5; i += 1) {
						const delegate = createFakeDefaultAccount({
							dpos: { delegate: { username: `existingdelegate${i}` } },
						});

						stateStoreMock.account.set(delegate.address, delegate);

						updatedSender.dpos.sentVotes.push({
							delegateAddress: delegate.address,
							amount: liskToBeddows(20),
						});
					}
					stateStoreMock.account.set(sender.address, updatedSender);

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

					applyInput.asset = {
						// Account already contains 19 unlocking and 5 positive votes
						// now we added 2 negative votes
						// which will make total unlocking to grow over 20
						votes,
					};

					await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
						'Cannot downvote which exceeds account.dpos.unlocking to have more than 20',
					);
				});
			});

			describe('when asset.votes negative amount exceeds the previously voted amount', () => {
				it('should throw error', async () => {
					const updatedSender = objects.cloneDeep(sender) as Account<DPOSAccountProps>;
					updatedSender.dpos.sentVotes.push({
						delegateAddress: delegate1.address,
						amount: liskToBeddows(70),
					});
					stateStoreMock.account.set(sender.address, updatedSender);

					applyInput.asset = {
						// Negative vote for more than what was earlier voted
						votes: [
							{
								delegateAddress: delegate1.address,
								amount: liskToBeddows(-80),
							},
						],
					};

					await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
						'Cannot downvote more than upvoted',
					);
				});
			});
		});

		describe('when asset.votes contains self-vote', () => {
			const senderVoteAmount = liskToBeddows(80);

			beforeEach(() => {
				// Make sender a delegate
				const updatedSender = objects.cloneDeep(sender);
				updatedSender.dpos.delegate.username = 'sender_delegate';
				stateStoreMock.account.set(sender.address, updatedSender);

				applyInput.asset = {
					votes: [{ delegateAddress: sender.address, amount: senderVoteAmount }],
				};
			});

			it('should update votes and totalVotesReceived', async () => {
				// Act
				await transactionAsset.applyAsset(applyInput);

				// Assert
				const updatedSender = await stateStoreMock.account.get<Account<DPOSAccountProps>>(
					sender.address,
				);
				expect(updatedSender.dpos.delegate.totalVotesReceived).toEqual(senderVoteAmount);
				expect(updatedSender.dpos.sentVotes).toHaveLength(1);
				expect(applyInput.reducerHandler.invoke).toHaveBeenCalledWith('token:debit', {
					address: sender.address,
					amount: senderVoteAmount,
				});
			});
		});

		describe('when asset.votes contains self-downvote', () => {
			const senderUpVoteAmount = liskToBeddows(80);
			const senderDownVoteAmount = liskToBeddows(30);

			beforeEach(() => {
				// Make sender a delegate and make it sure it have a self vote already
				const updatedSender = objects.cloneDeep(sender);
				updatedSender.dpos.delegate.username = 'sender_delegate';
				updatedSender.dpos.delegate.totalVotesReceived = senderUpVoteAmount;
				updatedSender.dpos.sentVotes = [
					{ delegateAddress: updatedSender.address, amount: senderUpVoteAmount },
				];
				stateStoreMock.account.set(sender.address, updatedSender);

				applyInput.asset = {
					votes: [{ delegateAddress: sender.address, amount: BigInt(-1) * senderDownVoteAmount }],
				};
			});

			it('should update votes, totalVotesReceived and unlocking', async () => {
				// Act
				await transactionAsset.applyAsset(applyInput);

				// Assert
				const updatedSender = await stateStoreMock.account.get<Account<DPOSAccountProps>>(
					sender.address,
				);
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
				expect(applyInput.reducerHandler.invoke).not.toHaveBeenCalled();
			});
		});
	});
});
