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
 *
 */
import { codec } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import * as fixtures from '../fixtures/vote_transaction/vote_transaction_10_upvotes.json';

import { VoteTransaction, VoteAsset } from '../src/13_vote_transaction';
import { Status, Account, BaseTransaction } from '../src';
import { defaultAccount, StateStoreMock } from './utils/state_store_mock';
import { BaseTransactionInput, AccountAsset } from '../src/types';

describe('Vote transaction', () => {
	const validUpvoteTransactionScenario = fixtures.testCases[0];
	const validDownvoteTransactionScenario = fixtures.testCases[1];
	const validMixvoteTransactionScenario = fixtures.testCases[2];

	let decodedUpvoteTransaction: BaseTransactionInput<VoteAsset>;
	let decodedDownvoteTransaction: BaseTransactionInput<VoteAsset>;
	let decodedMixedvoteTransaction: BaseTransactionInput<VoteAsset>;

	beforeEach(() => {
		{
			const buffer = Buffer.from(
				validUpvoteTransactionScenario.output.transaction,
				'base64',
			);
			const id = hash(buffer);
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<VoteAsset>(
				VoteTransaction.ASSET_SCHEMA as any,
				decodedBaseTransaction.asset as Buffer,
			);
			decodedUpvoteTransaction = {
				...decodedBaseTransaction,
				asset: decodedAsset,
				id,
			};
		}
		{
			const buffer = Buffer.from(
				validDownvoteTransactionScenario.output.transaction,
				'base64',
			);
			const id = hash(buffer);
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<VoteAsset>(
				VoteTransaction.ASSET_SCHEMA as any,
				decodedBaseTransaction.asset as Buffer,
			);
			decodedDownvoteTransaction = {
				...decodedBaseTransaction,
				asset: decodedAsset,
				id,
			};
		}
		{
			const buffer = Buffer.from(
				fixtures.testCases[2].output.transaction,
				'base64',
			);
			const id = hash(buffer);
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<VoteAsset>(
				VoteTransaction.ASSET_SCHEMA as any,
				decodedBaseTransaction.asset as Buffer,
			);
			decodedMixedvoteTransaction = {
				...decodedBaseTransaction,
				asset: decodedAsset,
				id,
			};
		}
	});

	describe('validateAsset', () => {
		describe('when asset.votes contains valid contents', () => {
			it('should not return errors with valid upvote case', () => {
				const tx = new VoteTransaction({
					...decodedUpvoteTransaction,
				});
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.OK);
				expect(errors).toHaveLength(0);
			});

			it('should not return errors with valid downvote case', () => {
				const tx = new VoteTransaction({
					...decodedDownvoteTransaction,
				});
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.OK);
				expect(errors).toHaveLength(0);
			});

			it('should not return errors with valid mix votes case', () => {
				const tx = new VoteTransaction({
					...decodedMixedvoteTransaction,
				});
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.OK);
				expect(errors).toHaveLength(0);
			});
		});

		describe('when asset.votes does not include any vote', () => {
			it('should return errors', () => {
				const tx = new VoteTransaction({
					...decodedUpvoteTransaction,
				});
				(tx.asset as any).votes = [];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(
					'should NOT have fewer than 1 items',
				);
			});
		});

		describe('when asset.votes includes more than 20 elements', () => {
			it('should return errors', () => {
				const tx = new VoteTransaction({
					...decodedMixedvoteTransaction,
				});
				(tx.asset as any).votes = [
					...tx.asset.votes,
					{
						delegateAddress: '123L',
						amount: BigInt(10000000000),
					},
				];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(2);
				expect(errors[0].message).toInclude(
					'should NOT have more than 20 items',
				);
			});
		});

		describe('when asset.votes includes more than 10 positive votes', () => {
			it('should return errors', () => {
				const tx = new VoteTransaction({
					...decodedUpvoteTransaction,
				});
				(tx.asset as any).votes = [
					...tx.asset.votes,
					{
						delegateAddress: Buffer.from('123L'),
						amount: BigInt(10000000000),
					},
				];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(
					'Upvote can only be casted upto 10',
				);
			});
		});

		describe('when asset.votes includes more than 10 negative votes', () => {
			it('should return errors', () => {
				const tx = new VoteTransaction({
					...decodedDownvoteTransaction,
				});
				(tx.asset as any).votes = [
					...tx.asset.votes,
					{
						delegateAddress: Buffer.from('123L'),
						amount: BigInt(-10000000000),
					},
				];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(
					'Downvote can only be casted upto 10',
				);
			});
		});

		describe('when asset.votes includes duplicate delegates within positive amount', () => {
			it('should return errors', () => {
				const tx = new VoteTransaction({
					...decodedUpvoteTransaction,
					asset: {
						votes: [...decodedUpvoteTransaction.asset.votes.slice(0)],
					},
				});
				(tx.asset as any).votes[9] = {
					delegateAddress:
						decodedUpvoteTransaction.asset.votes[0].delegateAddress,
					amount: BigInt(230000000000),
				};
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude('Delegate address must be unique');
			});
		});

		describe('when asset.votes includes duplicate delegates within positive and negative amount', () => {
			it('should return errors', () => {
				const tx = new VoteTransaction({
					...decodedMixedvoteTransaction,
					asset: {
						votes: [...decodedMixedvoteTransaction.asset.votes.slice(0)],
					},
				});
				(tx.asset as any).votes[19] = {
					delegateAddress:
						decodedUpvoteTransaction.asset.votes[0].delegateAddress,
					amount: BigInt(-230000000000),
				};
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude('Delegate address must be unique');
			});
		});

		describe('when asset.votes includes zero amount', () => {
			it('should return errors', () => {
				const tx = new VoteTransaction({
					...decodedMixedvoteTransaction,
					asset: {
						votes: [...decodedMixedvoteTransaction.asset.votes.slice(0)],
					},
				});
				(tx.asset as any).votes[0] = {
					delegateAddress:
						decodedMixedvoteTransaction.asset.votes[0].delegateAddress,
					amount: BigInt(0),
				};
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude('Amount cannot be 0');
			});
		});

		// TODO: Enable after https://github.com/LiskHQ/lisk-sdk/issues/5263
		// eslint-disable-next-line jest/no-disabled-tests
		describe.skip('when asset.votes includes amount which is greater than int64 range', () => {
			it('should return errors', () => {
				const tx = new VoteTransaction({
					...decodedMixedvoteTransaction,
					asset: {
						votes: [...decodedMixedvoteTransaction.asset.votes.slice(0)],
					},
				});
				(tx.asset as any).votes[0] = {
					delegateAddress:
						decodedMixedvoteTransaction.asset.votes[0].delegateAddress,
					amount: BigInt(2) ** BigInt(63),
				};
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors[0].message).toInclude('should match format "int64"');
			});
		});

		// TODO: Enable after https://github.com/LiskHQ/lisk-sdk/issues/5263
		// eslint-disable-next-line jest/no-disabled-tests
		describe.skip('when asset.votes includes amount which is less than int64 range', () => {
			it('should return errors', () => {
				const tx = new VoteTransaction({
					...decodedMixedvoteTransaction,
					asset: {
						votes: [...decodedMixedvoteTransaction.asset.votes.slice(0)],
					},
				});
				(tx.asset as any).votes[0] = {
					delegateAddress:
						decodedMixedvoteTransaction.asset.votes[0].delegateAddress,
					amount: BigInt(-1) * BigInt(2) ** BigInt(63) - BigInt(1),
				};
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors[0].message).toInclude('should match format "int64"');
			});
		});

		describe('when asset.votes includes amount which is not multiple of 10 * 10^8', () => {
			it('should return errors', () => {
				const tx = new VoteTransaction({
					...decodedMixedvoteTransaction,
					asset: {
						votes: [...decodedMixedvoteTransaction.asset.votes.slice(0)],
					},
				});
				(tx.asset as any).votes[0] = {
					delegateAddress:
						decodedMixedvoteTransaction.asset.votes[0].delegateAddress,
					amount: BigInt(100000000),
				};
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors[0].message).toInclude(
					'Amount should be multiple of 10 * 10^8',
				);
			});
		});
	});

	// TODO: Update after updating protocol-specs
	describe('applyAsset', () => {
		const minBalance = BigInt('5000000');
		let store: StateStoreMock;
		let tx: VoteTransaction;

		describe('when asset.votes contain positive amount which makes account.votes to be 10 entries', () => {
			const originalVotes = BigInt('1000000000');

			beforeEach(async () => {
				tx = new VoteTransaction({
					...decodedUpvoteTransaction,
				});
				const totalSpending =
					BigInt(decodedUpvoteTransaction.fee) +
					decodedUpvoteTransaction.asset.votes.reduce((prev, current) => {
						if (BigInt(current.amount) > BigInt(0)) {
							return prev + BigInt(current.amount);
						}
						return prev;
					}, BigInt(0)) +
					minBalance;
				const sender = defaultAccount({
					nonce: BigInt(decodedUpvoteTransaction.nonce),
					address: Buffer.from(
						validUpvoteTransactionScenario.input.account.address,
						'base64',
					),
					balance: totalSpending,
					asset: {
						sentVotes: [
							{
								delegateAddress:
									decodedUpvoteTransaction.asset.votes[0].delegateAddress,
								amount: originalVotes,
							},
						],
					},
				});
				store = new StateStoreMock(
					[
						sender,
						...validUpvoteTransactionScenario.input.delegates.map(
							(delegate, i) =>
								defaultAccount({
									address: Buffer.from(delegate.address, 'base64'),
									publicKey: Buffer.from(delegate.publicKey, 'base64'),
									asset: {
										delegate: {
											username: `delegate_${i.toString()}`,
										},
									},
								}),
						),
					],
					{
						lastBlockHeader: { height: 10 } as any,
						networkIdentifier: Buffer.from(
							validUpvoteTransactionScenario.input.networkIdentifier,
							'base64',
						).toString('hex'),
					},
				);
				// Update delegate who originally have vote
				const delegate0 = await store.account.get<any>(
					decodedUpvoteTransaction.asset.votes[0].delegateAddress,
				);
				delegate0.asset.delegate.totalVotesReceived += BigInt('1000000000');
				store.account.set(delegate0.address, delegate0);
			});

			it('should not return error', async () => {
				const { errors, status } = await tx.apply(store);
				expect(status).toBe(Status.OK);
				expect(errors).toHaveLength(0);
			});

			it('should make account to have correct balance', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validUpvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect(sender.balance.toString()).toEqual(minBalance.toString());
			});

			it('should not change account.unlocking', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validUpvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect(sender.asset.unlocking).toHaveLength(0);
			});

			it('should order account.votes', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validUpvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				const senderVotesCopy = sender.asset.sentVotes.slice(0);
				senderVotesCopy.sort((a: any, b: any) =>
					a.delegateAddress.compare(b.delegateAddress),
				);
				expect(sender.asset.sentVotes).toStrictEqual(senderVotesCopy);
			});

			it('should make upvoted delegate account to have correct totalVotesReceived', async () => {
				await tx.apply(store);
				expect.assertions(10);
				for (const vote of decodedUpvoteTransaction.asset.votes) {
					const delegate = await store.account.get<AccountAsset>(
						vote.delegateAddress,
					);
					if (
						vote.delegateAddress.equals(
							decodedUpvoteTransaction.asset.votes[0].delegateAddress,
						)
					) {
						expect(
							delegate.asset.delegate.totalVotesReceived.toString(),
						).toEqual((originalVotes + BigInt(vote.amount)).toString());
					} else {
						expect(
							delegate.asset.delegate.totalVotesReceived.toString(),
						).toEqual(BigInt(vote.amount).toString());
					}
				}
			});

			it('should create vote object when it does not exist before', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validUpvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect(sender.asset.sentVotes).toHaveLength(10);
			});
			it('should update vote object when it exists before and create if it does not exist', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validUpvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect.assertions(10);
				for (const vote of sender.asset.sentVotes) {
					const relatedVote = decodedUpvoteTransaction.asset.votes.find(entry =>
						entry.delegateAddress.equals(vote.delegateAddress),
					) as {
						delegateAddress: Buffer;
						amount: bigint;
					};
					if (
						vote.delegateAddress.equals(
							decodedUpvoteTransaction.asset.votes[0].delegateAddress,
						)
					) {
						const totalAmount = originalVotes + BigInt(relatedVote.amount);
						expect(vote.amount.toString()).toEqual(totalAmount.toString());
					} else {
						expect(vote.amount.toString()).toEqual(
							BigInt(relatedVote.amount).toString(),
						);
					}
				}
			});
		});

		describe('when asset.votes contain negative amount which makes account.votes to be 0 entries', () => {
			const originalVotes = BigInt('3000000000');

			beforeEach(async () => {
				tx = new VoteTransaction({
					...decodedDownvoteTransaction,
				});
				const totalSpending =
					BigInt(decodedDownvoteTransaction.fee) + minBalance;
				const sender = defaultAccount({
					nonce: BigInt(decodedDownvoteTransaction.nonce),
					address: Buffer.from(
						validDownvoteTransactionScenario.input.account.address,
						'base64',
					),
					balance: totalSpending,
					asset: {
						sentVotes: [
							...decodedDownvoteTransaction.asset.votes.map(vote => {
								if (
									vote.delegateAddress.equals(
										decodedDownvoteTransaction.asset.votes[0].delegateAddress,
									)
								) {
									return {
										delegateAddress: vote.delegateAddress,
										amount: originalVotes + BigInt(vote.amount) * BigInt(-1),
									};
								}
								return {
									delegateAddress: vote.delegateAddress,
									amount: BigInt(vote.amount) * BigInt(-1),
								};
							}),
						],
						unlocking: [],
					},
				});
				sender.asset.sentVotes.sort((a, b) =>
					a.delegateAddress.compare(b.delegateAddress),
				);
				store = new StateStoreMock(
					[
						sender,
						...decodedDownvoteTransaction.asset.votes.map((delegate, i) =>
							defaultAccount({
								address: delegate.delegateAddress,
								asset: {
									delegate: {
										username: `delegate_${i.toString()}`,
										totalVotesReceived: BigInt(delegate.amount) * BigInt(-1),
									},
								},
							}),
						),
					],
					{
						lastBlockHeader: { height: 10 } as any,
						networkIdentifier: Buffer.from(
							validDownvoteTransactionScenario.input.networkIdentifier,
							'base64',
						).toString('hex'),
					},
				);
				// Update delegate who originally have vote
				const delegate0 = await store.account.get<AccountAsset>(
					decodedDownvoteTransaction.asset.votes[0].delegateAddress,
				);
				delegate0.asset.delegate.totalVotesReceived += originalVotes;
				store.account.set(delegate0.address, delegate0);
			});

			it('should not return error', async () => {
				const { errors, status } = await tx.apply(store);
				expect(status).toBe(Status.OK);
				expect(errors).toHaveLength(0);
			});

			it('should not change account balance', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validDownvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect(sender.balance.toString()).toEqual(minBalance.toString());
			});

			it('should remove vote which has zero amount', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validDownvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect(sender.asset.sentVotes).toHaveLength(1);
			});

			it('should update vote which has non-zero amount', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validDownvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect(sender.asset.sentVotes[0].amount.toString()).toEqual(
					originalVotes.toString(),
				);
			});

			it('should make account to have correct unlocking', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validDownvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect.assertions(1 + 10 * 2);
				expect(sender.asset.unlocking).toHaveLength(10);
				for (const unlock of sender.asset.unlocking) {
					expect(unlock.unvoteHeight).toEqual(
						store.chain.lastBlockHeader.height + 1,
					);
					expect(BigInt(unlock.amount) > BigInt(0)).toBeTrue();
				}
			});

			it('should order account.unlocking', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validDownvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				const expectedUnlock = decodedDownvoteTransaction.asset.votes.map(
					vote => ({
						delegateAddress: vote.delegateAddress,
						amount: BigInt(-1) * BigInt(vote.amount),
						unvoteHeight: store.chain.lastBlockHeader.height + 1,
					}),
				);
				expectedUnlock.sort((a, b) =>
					a.delegateAddress.compare(b.delegateAddress),
				);
				expect(sender.asset.unlocking).toStrictEqual(expectedUnlock);
			});

			it('should make downvoted delegate account to have correct totalVotesReceived', async () => {
				await tx.apply(store);
				expect.assertions(10);
				for (const vote of decodedDownvoteTransaction.asset.votes) {
					const delegate = await store.account.get<AccountAsset>(
						vote.delegateAddress,
					);
					if (
						vote.delegateAddress.equals(
							decodedDownvoteTransaction.asset.votes[0].delegateAddress,
						)
					) {
						expect(
							delegate.asset.delegate.totalVotesReceived.toString(),
						).toEqual(originalVotes.toString());
					} else {
						expect(
							delegate.asset.delegate.totalVotesReceived.toString(),
						).toEqual('0');
					}
				}
			});
		});

		describe('when asset.votes contain negative and positive amount which makes account.votes to be 10 entries', () => {
			beforeEach(() => {
				tx = new VoteTransaction({
					...decodedMixedvoteTransaction,
				});
				const totalSpending =
					BigInt(decodedMixedvoteTransaction.fee) +
					decodedMixedvoteTransaction.asset.votes.reduce((prev, current) => {
						if (BigInt(current.amount) > BigInt(0)) {
							return prev + BigInt(current.amount);
						}
						return prev;
					}, BigInt(0)) +
					minBalance;
				const sender = defaultAccount({
					nonce: BigInt(decodedMixedvoteTransaction.nonce),
					address: Buffer.from(
						validMixvoteTransactionScenario.input.account.address,
						'base64',
					),
					balance: totalSpending,
					asset: {
						sentVotes: [
							...decodedMixedvoteTransaction.asset.votes
								.filter(vote => BigInt(vote.amount) < BigInt(0))
								.map(vote => ({
									delegateAddress: vote.delegateAddress,
									amount: BigInt(vote.amount) * BigInt(-1),
								})),
						],
						unlocking: [
							{
								delegateAddress:
									decodedMixedvoteTransaction.asset.votes[0].delegateAddress,
								amount: BigInt('1000000000'),
								unvoteHeight: 3,
							},
						],
					},
				});
				sender.asset.sentVotes.sort((a, b) =>
					a.delegateAddress.compare(b.delegateAddress),
				);
				store = new StateStoreMock(
					[
						sender,
						...decodedMixedvoteTransaction.asset.votes.map((delegate, i) =>
							defaultAccount({
								address: delegate.delegateAddress,
								asset: {
									delegate: {
										username: `delegate_${i.toString()}`,
										totalVotesReceived:
											BigInt(delegate.amount) < BigInt(0)
												? BigInt(delegate.amount) * BigInt(-1)
												: BigInt(0),
									},
								},
							}),
						),
					],
					{
						lastBlockHeader: { height: 10 } as any,
						networkIdentifier: Buffer.from(
							validMixvoteTransactionScenario.input.networkIdentifier,
							'base64',
						).toString('hex'),
					},
				);
			});

			it('should not return error', async () => {
				const { errors, status } = await tx.apply(store);
				expect(status).toBe(Status.OK);
				expect(errors).toHaveLength(0);
			});

			it('should make account to have correct balance', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validMixvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect(sender.balance.toString()).toEqual(minBalance.toString());
			});

			it('should make account to have correct unlocking', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validMixvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect(sender.asset.unlocking).toHaveLength(11);
			});

			it('should order account.votes', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validMixvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				const senderVotesCopy = sender.asset.sentVotes.slice(0);
				senderVotesCopy.sort((a, b) =>
					a.delegateAddress.compare(b.delegateAddress),
				);
				expect(sender.asset.sentVotes).toStrictEqual(senderVotesCopy);
			});

			it('should order account.unlocking', async () => {
				await tx.apply(store);
				const sender = await store.account.get<AccountAsset>(
					Buffer.from(
						validMixvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				const senderUnlockingCopy = sender.asset.unlocking.slice(0);
				senderUnlockingCopy.sort((a, b) =>
					a.delegateAddress.compare(b.delegateAddress),
				);
				expect(sender.asset.unlocking).toStrictEqual(senderUnlockingCopy);
			});

			it('should make upvoted delegate account to have correct totalVotesReceived', async () => {
				await tx.apply(store);
				const upvotes = decodedMixedvoteTransaction.asset.votes.filter(
					vote => BigInt(vote.amount) > BigInt(0),
				);
				for (const vote of upvotes) {
					const delegate = await store.account.get<AccountAsset>(
						vote.delegateAddress,
					);
					expect(delegate.asset.delegate.totalVotesReceived.toString()).toEqual(
						BigInt(vote.amount).toString(),
					);
				}
			});

			it('should make downvoted delegate account to have correct totalVotesReceived', async () => {
				await tx.apply(store);
				const downvotes = decodedMixedvoteTransaction.asset.votes.filter(
					vote => BigInt(vote.amount) < BigInt(0),
				);
				for (const vote of downvotes) {
					const delegate = await store.account.get<AccountAsset>(
						vote.delegateAddress,
					);
					expect(delegate.asset.delegate.totalVotesReceived.toString()).toEqual(
						'0',
					);
				}
			});
		});

		describe('given asset.votes contain invalid data', () => {
			let sender: Account<AccountAsset>;
			let totalSpending: bigint;

			beforeEach(() => {
				tx = new VoteTransaction({
					...decodedMixedvoteTransaction,
				});
				totalSpending =
					BigInt(decodedMixedvoteTransaction.fee) +
					decodedMixedvoteTransaction.asset.votes.reduce((prev, current) => {
						if (BigInt(current.amount) > BigInt(0)) {
							return prev + BigInt(current.amount);
						}
						return prev;
					}, BigInt(0)) +
					minBalance;
				sender = defaultAccount({
					nonce: BigInt(decodedMixedvoteTransaction.nonce),
					address: Buffer.from(
						validMixvoteTransactionScenario.input.account.address,
						'base64',
					),
					balance: totalSpending,
					asset: {
						sentVotes: [
							...decodedMixedvoteTransaction.asset.votes
								.filter(vote => BigInt(vote.amount) < BigInt(0))
								.map(vote => ({
									delegateAddress: vote.delegateAddress,
									amount: BigInt(vote.amount) * BigInt(-1),
								})),
						],
						unlocking: [],
					},
				});
				sender.asset.sentVotes.sort((a: any, b: any) =>
					a.delegateAddress.compare(b.delegateAddress),
				);
				store = new StateStoreMock(
					[
						sender,
						...decodedMixedvoteTransaction.asset.votes.map((delegate, i) =>
							defaultAccount({
								address: delegate.delegateAddress,
								asset: {
									delegate: {
										username: `delegate_${i.toString()}`,
										totalVotesReceived:
											BigInt(delegate.amount) < BigInt(0)
												? BigInt(delegate.amount) * BigInt(-1)
												: BigInt(0),
									},
								},
							}),
						),
					],
					{
						lastBlockHeader: { height: 10 } as any,
						networkIdentifier: Buffer.from(
							validMixvoteTransactionScenario.input.networkIdentifier,
							'base64',
						).toString('hex'),
					},
				);
			});

			describe('when asset.votes contain delegate address which is not registered', () => {
				it('should return errors', async () => {
					const vote = decodedMixedvoteTransaction.asset.votes.find(
						v => BigInt(v.amount) > BigInt(0),
					);

					const invalidDelegate = await store.account.get<AccountAsset>(
						vote?.delegateAddress as Buffer,
					);
					store.account.set(
						invalidDelegate.address,
						defaultAccount({
							address: invalidDelegate.address,
						}),
					);

					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.FAIL);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude(
						'Voted delegate is not registered',
					);
				});
			});

			describe('when asset.votes positive amount makese account.votes entries more than 10', () => {
				it('should return errors', async () => {
					const invalidSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					invalidSender.asset.sentVotes.unshift({
						delegateAddress: Buffer.from('random address'),
						amount: BigInt('1000000000'),
					});
					store.account.set(invalidSender.address, invalidSender);

					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.FAIL);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude('Account can only vote upto 10');
				});
			});

			describe('when the last asset.votes amount makes sender not having sufficient balance', () => {
				it('should return errors', async () => {
					const invalidSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					invalidSender.balance -= BigInt(1);
					store.account.set(invalidSender.address, invalidSender);

					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.FAIL);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude(
						'Account does not have enough minimum remaining',
					);
				});
			});

			describe('when asset.votes negative amount decrease acount.votes entries yet positive amount makes account exceeds more than 10', () => {
				it('should return errors', async () => {
					const firstNegative = decodedMixedvoteTransaction.asset.votes.find(
						vote => BigInt(vote.amount) < BigInt(0),
					);
					const invalidSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					const index = invalidSender.asset.sentVotes.findIndex(v =>
						v.delegateAddress.equals(firstNegative?.delegateAddress as Buffer),
					);
					invalidSender.asset.sentVotes[index].amount += BigInt(1000000000);
					store.account.set(invalidSender.address, invalidSender);

					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.FAIL);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude('Account can only vote upto 10');
				});
			});

			describe('when asset.votes negative amount and makes account.unlocking more than 20 entries', () => {
				it('should return errors', async () => {
					const invalidSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					invalidSender.asset.unlocking = [
						{
							delegateAddress: Buffer.from('random address'),
							amount: BigInt(1000000000),
							unvoteHeight: 2,
						},
						...decodedMixedvoteTransaction.asset.votes
							.filter(vote => BigInt(vote.amount) < BigInt(0))
							.map(vote => ({
								delegateAddress: vote.delegateAddress,
								amount: BigInt(vote.amount) * BigInt(-1),
								unvoteHeight: 2,
							})),
					];
					sender.asset.unlocking.sort((a, b) => {
						if (a.delegateAddress !== b.delegateAddress) {
							return a.delegateAddress.compare(b.delegateAddress);
						}
						if (a.unvoteHeight !== b.unvoteHeight) {
							return b.unvoteHeight - a.unvoteHeight;
						}
						const diff = b.amount - a.amount;
						if (diff > BigInt(0)) {
							return 1;
						}
						if (diff < BigInt(0)) {
							return -1;
						}

						return 0;
					});
					store.account.set(invalidSender.address, invalidSender);

					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.FAIL);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude(
						'Cannot downvote which exceeds account.unlocking to have more than 20',
					);
				});
			});

			describe('when asset.votes negative amount exceeds the previously voted amount', () => {
				it('should return errors', async () => {
					const firstNegative = decodedMixedvoteTransaction.asset.votes.find(
						vote => BigInt(vote.amount) < BigInt(0),
					);
					const invalidSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					const index = invalidSender.asset.sentVotes.findIndex(v =>
						v.delegateAddress.equals(firstNegative?.delegateAddress as Buffer),
					);
					invalidSender.asset.sentVotes[index].amount -= BigInt(1000000000);
					store.account.set(invalidSender.address, invalidSender);

					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.FAIL);
					expect(errors).toHaveLength(2);
					expect(errors[0].message).toInclude(
						'Cannot downvote more than upvoted',
					);
				});
			});
		});

		describe('when asset.votes contains self-vote', () => {
			const senderBalnce = BigInt('1230000000000');
			const voteAmount = BigInt('1000000000000');

			beforeEach(() => {
				tx = new VoteTransaction({
					...decodedMixedvoteTransaction,
					asset: {
						votes: [
							{
								delegateAddress: Buffer.from(
									validMixvoteTransactionScenario.input.account.address,
									'base64',
								),
								amount: voteAmount,
							},
						],
					},
				});
				tx.sign(
					Buffer.from(
						validMixvoteTransactionScenario.input.networkIdentifier,
						'base64',
					),
					validMixvoteTransactionScenario.input.account.passphrase,
				);
				const sender = defaultAccount({
					nonce: BigInt(decodedMixedvoteTransaction.nonce),
					address: Buffer.from(
						validMixvoteTransactionScenario.input.account.address,
						'base64',
					),
					balance: senderBalnce,
					asset: {
						delegate: {
							username: 'delegate_0',
						},
					},
				});
				store = new StateStoreMock([sender], {
					lastBlockHeader: { height: 10 } as any,
					networkIdentifier: Buffer.from(
						validMixvoteTransactionScenario.input.networkIdentifier,
						'base64',
					).toString('hex'),
				});
			});

			it('should update votes and totalVotesReceived', async () => {
				// Act
				await tx.apply(store);

				// Assert
				const updatedSender = await store.account.get<AccountAsset>(
					Buffer.from(
						validMixvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect(
					updatedSender.asset.delegate.totalVotesReceived.toString(),
				).toEqual(voteAmount.toString());
				expect(updatedSender.asset.sentVotes).toHaveLength(1);
				expect(updatedSender.balance.toString()).toEqual(
					(senderBalnce - tx.fee - voteAmount).toString(),
				);
			});
		});

		describe('when asset.votes contains self-downvote', () => {
			const senderBalnce = BigInt('1230000000000');
			const voteAmount = BigInt('-1000000000000');

			beforeEach(() => {
				tx = new VoteTransaction({
					...decodedMixedvoteTransaction,
					asset: {
						votes: [
							{
								delegateAddress: Buffer.from(
									validMixvoteTransactionScenario.input.account.address,
									'base64',
								),
								amount: voteAmount,
							},
						],
					},
				});
				tx.sign(
					Buffer.from(
						validMixvoteTransactionScenario.input.networkIdentifier,
						'base64',
					),
					validMixvoteTransactionScenario.input.account.passphrase,
				);
				const sender = defaultAccount({
					nonce: BigInt(decodedMixedvoteTransaction.nonce),
					address: Buffer.from(
						validMixvoteTransactionScenario.input.account.address,
						'base64',
					),
					balance: senderBalnce,
					asset: {
						delegate: {
							totalVotesReceived: voteAmount * BigInt(-1),
							username: 'delegate_0',
						},
						sentVotes: [
							{
								delegateAddress: Buffer.from(
									validMixvoteTransactionScenario.input.account.address,
									'base64',
								),
								amount: voteAmount * BigInt(-1),
							},
						],
					},
				});
				store = new StateStoreMock([sender], {
					lastBlockHeader: { height: 10 } as any,
					networkIdentifier: Buffer.from(
						validMixvoteTransactionScenario.input.networkIdentifier,
						'base64',
					).toString('hex'),
				});
			});

			it('should update votes, totalVotesReceived and unlocking', async () => {
				// Act
				await tx.apply(store);

				// Assert
				const updatedSender = await store.account.get<AccountAsset>(
					Buffer.from(
						validMixvoteTransactionScenario.input.account.address,
						'base64',
					),
				);
				expect(
					updatedSender.asset.delegate.totalVotesReceived.toString(),
				).toEqual('0');
				expect(updatedSender.asset.sentVotes).toHaveLength(0);
				expect(updatedSender.asset.unlocking).toHaveLength(1);
				expect(updatedSender.asset.unlocking[0].unvoteHeight).toEqual(11);
				expect(updatedSender.asset.unlocking[0].amount.toString()).toEqual(
					(voteAmount * BigInt(-1)).toString(),
				);
				expect(updatedSender.balance.toString()).toEqual(
					(senderBalnce - tx.fee).toString(),
				);
			});
		});
	});
});
