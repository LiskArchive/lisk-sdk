/*
 * Copyright © 2019 Lisk Foundation
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

'use strict';

import * as BigNum from '@liskhq/bignum';
import { when } from 'jest-when';
import { Dpos, Slots, constants } from '../../src';
import { BlockJSON, Account } from '../../src/types';
import {
	BLOCK_TIME,
	ACTIVE_DELEGATES,
	EPOCH_TIME,
	DELEGATE_LIST_ROUND_OFFSET,
} from '../fixtures/constants';
import { randomInt } from '../utils/random_int';
import {
	delegateAccounts,
	delegatePublicKeys,
	sortedDelegateAccounts,
	sortedDelegatePublicKeys,
	delegatesWhoForged,
	delegatesWhoForgedNone,
	uniqueDelegatesWhoForged,
	delegatesWhoForgedOnceMissedOnce,
	delegateWhoForgedLast,
} from '../utils/round_delegates';

describe('dpos.apply()', () => {
	const stubs = {} as any;
	let dpos: Dpos;
	let slots: Slots;

	beforeEach(() => {
		// Arrange
		stubs.storage = {
			entities: {
				Account: {
					get: jest.fn(),
					increaseFieldBy: jest.fn(),
					update: jest.fn(),
				},
				Block: {
					get: jest.fn().mockReturnValue([]),
				},
				RoundDelegates: {
					getActiveDelegatesForRound: jest
						.fn()
						.mockReturnValue(delegatePublicKeys),
					create: jest.fn(),
					delete: jest.fn(),
				},
			},
		};

		stubs.logger = {
			debug: jest.fn(),
			log: jest.fn(),
			error: jest.fn(),
		};

		stubs.tx = jest.fn();

		slots = new Slots({
			epochTime: EPOCH_TIME,
			interval: BLOCK_TIME,
			blocksPerRound: ACTIVE_DELEGATES,
		});

		dpos = new Dpos({
			slots,
			...stubs,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset: DELEGATE_LIST_ROUND_OFFSET,
		});
	});

	describe('Given block is the genesis block (height === 1)', () => {
		let genesisBlock: BlockJSON;
		beforeEach(() => {
			// Arrange
			genesisBlock = {
				height: 1,
			} as BlockJSON;

			when(stubs.storage.entities.Account.get)
				.calledWith(
					{
						isDelegate: true,
					},
					{
						limit: ACTIVE_DELEGATES,
						sort: ['voteWeight:desc', 'publicKey:asc'],
					},
				)
				.mockReturnValue(sortedDelegateAccounts);
		});

		it('should save round 1 active delegates list in round_delegates table by using delegate accounts', async () => {
			// Act
			await dpos.apply(genesisBlock, { tx: stubs.tx });

			// Assert
			expect(stubs.storage.entities.Account.get).toHaveBeenCalledWith(
				{ isDelegate: true },
				{
					limit: ACTIVE_DELEGATES,
					sort: ['voteWeight:desc', 'publicKey:asc'],
				},
				stubs.tx,
			);

			// we must delete the delegate list before creating the new one
			expect(
				stubs.storage.entities.RoundDelegates.delete,
			).toHaveBeenCalledBefore(stubs.storage.entities.RoundDelegates.create);

			expect(stubs.storage.entities.RoundDelegates.delete).toHaveBeenCalledWith(
				{ round: 1 },
				{},
				stubs.tx,
			);
			expect(stubs.storage.entities.RoundDelegates.create).toHaveBeenCalledWith(
				{
					round: 1,
					delegatePublicKeys: sortedDelegatePublicKeys,
				},
				{},
				stubs.tx,
			);
		});

		it('should resolve with "false"', async () => {
			// Act
			const result = await dpos.apply(genesisBlock, { tx: stubs.tx });

			// Assert
			expect(result).toBe(false);
		});

		it('should update "producedBlocks" but NOT update "missedBlocks", "voteWeight", "rewards", "fees"', async () => {
			// Act
			await dpos.apply(genesisBlock, { tx: stubs.tx });

			// Assert
			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).toHaveBeenCalledTimes(1);

			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).toHaveBeenCalledWith(
				{ publicKey: genesisBlock.generatorPublicKey },
				'producedBlocks',
				'1',
				stubs.tx,
			);

			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).not.toHaveBeenCalledWith(expect.any(Object), 'missedBlocks');

			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).not.toHaveBeenCalledWith(expect.any(Object), 'voteWeight');

			expect(stubs.storage.entities.Account.update).not.toHaveBeenCalled();
		});
	});

	describe('Given block height is greater than "1" (NOT the genesis block)', () => {
		it('should increase "producedBlocks" field by "1" for the generator delegate', async () => {
			// Arrange
			const block = {
				height: 2,
				generatorPublicKey: 'generatorPublicKey#RANDOM',
			} as BlockJSON;

			// Act
			await dpos.apply(block, { tx: stubs.tx });

			// Assert
			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).toHaveBeenCalledWith(
				{ publicKey: block.generatorPublicKey },
				'producedBlocks',
				'1',
				stubs.tx,
			);
		});
	});

	describe('Given block is NOT the last block of the round', () => {
		it('should NOT update "missedBlocks", "voteWeight", "rewards", "fees"', async () => {
			// Arrange
			const block = {
				height: 2,
				generatorPublicKey: 'generatorPublicKey#RANDOM',
			} as BlockJSON;

			// Act
			await dpos.apply(block, { tx: stubs.tx });

			// Assert
			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).toHaveBeenCalledTimes(1);
			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).toHaveBeenCalledWith(
				expect.any(Object),
				'producedBlocks',
				expect.any(String),
				expect.anything(),
			);

			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).not.toHaveBeenCalledWith(expect.any(Object), 'missedBlocks');
			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).not.toHaveBeenCalledWith(expect.any(Object), 'voteWeight');
			expect(stubs.storage.entities.Account.update).not.toHaveBeenCalled();
		});

		it('should NOT update "round_delegates" table', async () => {
			// Arrange
			const block = {
				height: 2,
				generatorPublicKey: 'generatorPublicKey#RANDOM',
			} as BlockJSON;

			// Act
			await dpos.apply(block, { tx: stubs.tx });

			// Assert
			expect(
				stubs.storage.entities.RoundDelegates.create,
			).not.toHaveBeenCalled();
			expect(
				stubs.storage.entities.RoundDelegates.delete,
			).not.toHaveBeenCalled();
		});
	});

	describe('Given block is the last block of the round', () => {
		let lastBlockOfTheRoundNine: BlockJSON;
		let feePerDelegate: BigNum;
		let rewardPerDelegate: BigNum;
		let totalFee: BigNum;
		let getTotalEarningsOfDelegate: (
			account: Account,
		) => { reward: BigNum; fee: BigNum };
		beforeEach(() => {
			// Arrange
			when(stubs.storage.entities.Account.get)
				.calledWith(
					{
						publicKey_in: uniqueDelegatesWhoForged.map(
							({ publicKey }) => publicKey,
						),
					},
					{},
					stubs.tx,
				)
				.mockReturnValue(delegatesWhoForged);

			when(stubs.storage.entities.Account.get)
				.calledWith(
					{
						isDelegate: true,
					},
					{
						limit: ACTIVE_DELEGATES,
						sort: ['voteWeight:desc', 'publicKey:asc'],
					},
				)
				.mockReturnValue(sortedDelegateAccounts);

			feePerDelegate = new BigNum(randomInt(10, 100));
			totalFee = feePerDelegate.mul(ACTIVE_DELEGATES);

			// Delegates who forged got their rewards
			rewardPerDelegate = new BigNum(randomInt(1, 20));

			getTotalEarningsOfDelegate = account => {
				const blockCount = delegatesWhoForged.filter(
					d => d.publicKey === account.publicKey,
				).length;
				const reward = rewardPerDelegate.mul(blockCount);
				const fee = feePerDelegate.mul(blockCount);
				return {
					reward,
					fee,
				};
			};

			const forgedBlocks = delegatesWhoForged.map((delegate, i) => ({
				generatorPublicKey: delegate.publicKey,
				totalFee: feePerDelegate,
				reward: rewardPerDelegate,
				height: 809 + i,
			}));
			forgedBlocks.splice(forgedBlocks.length - 1);

			lastBlockOfTheRoundNine = {
				height: 909,
				generatorPublicKey: delegateWhoForgedLast.publicKey,
				totalFee: feePerDelegate,
				reward: rewardPerDelegate,
			} as BlockJSON;

			stubs.storage.entities.Block.get.mockReturnValue(forgedBlocks);
		});

		it('should increase "missedBlocks" field by "1" for the delegates who did not forge in the round', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).toHaveBeenCalledWith(
				{
					publicKey_in: expect.arrayContaining(
						delegatesWhoForgedNone.map(a => a.publicKey),
					),
				},
				'missedBlocks',
				'1',
				stubs.tx,
			);
		});

		it('should distribute rewards and fees ONLY to the delegates who forged', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			expect.assertions(ACTIVE_DELEGATES);

			// Assert Group 1/2
			uniqueDelegatesWhoForged.forEach(account => {
				expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
					{
						publicKey: account.publicKey,
					},
					expect.any(Object),
					{},
					stubs.tx,
				);
			});

			// Assert Group 2/2
			delegatesWhoForgedNone.forEach(account => {
				expect(stubs.storage.entities.Account.update).not.toHaveBeenCalledWith({
					publicKey: account.publicKey,
				});
			});
		});

		it('should distribute reward and fee for delegate who forged once but missed once', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			expect.assertions(delegatesWhoForgedOnceMissedOnce.length);

			// Assert
			delegatesWhoForgedOnceMissedOnce.forEach(account => {
				expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
					{
						publicKey: account.publicKey,
					},
					expect.any(Object),
					{},
					stubs.tx,
				);
			});
		});

		it('should distribute more rewards and fees (with correct balance) to delegates based on number of blocks they forged', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			expect.assertions(uniqueDelegatesWhoForged.length);
			uniqueDelegatesWhoForged.forEach(account => {
				const { fee, reward } = getTotalEarningsOfDelegate(account);
				const amount = fee.plus(reward);
				const data = {
					balance: account.balance.plus(amount).toString(),
					fees: account.fees.plus(fee).toString(),
					rewards: account.rewards.plus(reward).toString(),
				};

				expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
					{
						publicKey: account.publicKey,
					},
					data,
					{},
					stubs.tx,
				);
			});
		});

		it('should give the remainingFee ONLY to the last delegate of the round who forged', async () => {
			// Arrange
			const remainingFee = randomInt(5, 10);
			const forgedBlocks = delegatesWhoForged.map((delegate, i) => ({
				generatorPublicKey: delegate.publicKey,
				totalFee: feePerDelegate,
				reward: rewardPerDelegate,
				height: 809 + i,
			}));

			lastBlockOfTheRoundNine = {
				height: 909,
				generatorPublicKey: delegateWhoForgedLast.publicKey,
				totalFee: new BigNum(feePerDelegate).add(remainingFee),
				reward: rewardPerDelegate,
			} as BlockJSON;
			forgedBlocks.splice(forgedBlocks.length - 1);

			stubs.storage.entities.Block.get.mockReturnValue(forgedBlocks);

			// Act
			await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			expect.assertions(uniqueDelegatesWhoForged.length);
			expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
				{
					publicKey: delegateWhoForgedLast.publicKey,
				},
				expect.objectContaining({
					/**
					 * Delegate who forged last also forged 3 times,
					 * Thus will get fee 3 times too.
					 */
					fees: delegateWhoForgedLast.fees
						.add(feePerDelegate.mul(3).add(remainingFee))
						.toString(),
				}),
				{},
				stubs.tx,
			);

			uniqueDelegatesWhoForged
				.filter(d => d.publicKey !== delegateWhoForgedLast.publicKey)
				.forEach(account => {
					const blockCount = delegatesWhoForged.filter(
						d => d.publicKey === account.publicKey,
					).length;
					expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
						{
							publicKey: account.publicKey,
						},
						expect.objectContaining({
							/**
							 * Rest of the delegates don't get the remaining fee
							 */
							fees: account.fees.add(feePerDelegate.mul(blockCount)).toString(),
						}),
						{},
						stubs.tx,
					);
				});
		});

		it('should update vote weight of accounts that delegates who forged voted for', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

			const publicKeysToUpdate = uniqueDelegatesWhoForged.reduce(
				(accumulator: any, account) => {
					const { fee, reward } = getTotalEarningsOfDelegate(account);
					account.votedDelegatesPublicKeys.forEach(publicKey => {
						if (accumulator[publicKey]) {
							accumulator[publicKey] = accumulator[publicKey].plus(
								fee.plus(reward),
							);
						} else {
							accumulator[publicKey] = fee.plus(reward);
						}
					});
					return accumulator;
				},
				{},
			);

			// Assert
			Object.keys(publicKeysToUpdate).forEach(publicKey => {
				const amount = publicKeysToUpdate[publicKey].toString();

				expect(
					stubs.storage.entities.Account.increaseFieldBy,
				).toHaveBeenCalledWith({ publicKey }, 'voteWeight', amount, stubs.tx);
			});
		});

		it('should save next round active delegates list in RoundDelegates entity after applying last block of round', async () => {
			// Arrange
			const currentRound = slots.calcRound(lastBlockOfTheRoundNine.height);
			const nextRound = slots.calcRound(lastBlockOfTheRoundNine.height + 1);

			// Act
			await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			// make sure we calculate round number correctly
			expect(nextRound).toBe(currentRound + 1);
			// we must delete the delegate list before creating the new one
			expect(
				stubs.storage.entities.RoundDelegates.delete,
			).toHaveBeenCalledBefore(stubs.storage.entities.RoundDelegates.create);

			expect(stubs.storage.entities.RoundDelegates.delete).toHaveBeenCalledWith(
				{
					round: nextRound,
				},
				{},
				stubs.tx,
			);
			expect(stubs.storage.entities.RoundDelegates.create).toHaveBeenCalledWith(
				{
					round: nextRound,
					delegatePublicKeys: sortedDelegatePublicKeys,
				},
				{},
				stubs.tx,
			);
		});

		it('should delete RoundDelegates entities older than (finalizedBlockRound - 2)', async () => {
			// Arrange
			const finalizedBlockRoundStub = 5;
			const bftRoundOffset = 2; // TODO: get from BFT constants
			const delegateActiveRoundLimit = 3;
			const expectedRound =
				finalizedBlockRoundStub - bftRoundOffset - delegateActiveRoundLimit;
			const expectedTx = undefined;
			(dpos as any).finalizedBlockRound = finalizedBlockRoundStub;

			// Act
			await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			expect(stubs.storage.entities.RoundDelegates.delete).toHaveBeenCalledWith(
				{
					round_lt: expectedRound,
				},
				{},
				expectedTx,
			);
		});

		it('should should emit EVENT_ROUND_CHANGED', async () => {
			// Arrange
			const eventCallback = jest.fn();
			const oldRound = lastBlockOfTheRoundNine.height / ACTIVE_DELEGATES;
			(dpos as any).events.on(constants.EVENT_ROUND_CHANGED, eventCallback);

			// Act
			await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			expect(eventCallback).toHaveBeenCalledWith({
				oldRound,
				newRound: oldRound + 1,
			});
		});

		describe('When all delegates successfully forges a block', () => {
			it('should NOT update "missedBlocks" for anyone', async () => {
				// Arrange
				const forgedBlocks = delegatesWhoForged.map((delegate, i) => ({
					generatorPublicKey: delegate.publicKey,
					totalFee: feePerDelegate,
					reward: rewardPerDelegate,
					height: 809 + i,
				}));
				forgedBlocks.splice(forgedBlocks.length - 1);

				stubs.storage.entities.Block.get.mockReturnValue(forgedBlocks);

				when(stubs.storage.entities.Account.get)
					.calledWith(
						{
							publicKey_in: delegateAccounts.map(({ publicKey }) => publicKey),
						},
						{},
						stubs.tx,
					)
					.mockReturnValue(delegateAccounts);

				// Act
				await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

				expect(
					stubs.storage.entities.Account.increaseFieldBy,
				).not.toHaveBeenCalledWith(expect.any, 'missedBlocks');
			});
		});

		describe('When summarizing round fails', () => {
			it('should throw the error message coming from summedRound method and not perform any update', async () => {
				// Arrange
				const err = new Error('dummyError');
				stubs.storage.entities.Block.get.mockRejectedValue(err);

				// Act && Assert
				await expect(
					dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx }),
				).rejects.toBe(err);

				expect(stubs.storage.entities.Account.update).not.toHaveBeenCalled();
				expect(
					stubs.storage.entities.Account.increaseFieldBy,
				).not.toHaveBeenCalledWith(expect.any, 'producedBlocks');
				expect(
					stubs.storage.entities.Account.increaseFieldBy,
				).not.toHaveBeenCalledWith(expect.any(Object), 'missedBlocks');
				expect(
					stubs.storage.entities.Account.increaseFieldBy,
				).not.toHaveBeenCalledWith(expect.any(Object), 'voteWeight');
			});
		});

		// Reference: https://github.com/LiskHQ/lisk-sdk/issues/2423
		describe('When summarizing round return value which is greater than Number.MAX_SAFE_INTEGER ', () => {
			beforeEach(async () => {
				feePerDelegate = new BigNum(Number.MAX_SAFE_INTEGER.toString()).add(
					randomInt(10, 1000),
				);
				totalFee = new BigNum(feePerDelegate).mul(ACTIVE_DELEGATES);

				rewardPerDelegate = new BigNum(Number.MAX_SAFE_INTEGER.toString()).add(
					randomInt(10, 1000),
				);

				const forgedBlocks = delegatesWhoForged.map((delegate, i) => ({
					generatorPublicKey: delegate.publicKey,
					totalFee: feePerDelegate,
					reward: rewardPerDelegate,
					height: 809 + i,
				}));
				forgedBlocks.splice(forgedBlocks.length - 1);

				lastBlockOfTheRoundNine = {
					height: 909,
					generatorPublicKey: delegateWhoForgedLast.publicKey,
					totalFee: feePerDelegate,
					reward: rewardPerDelegate,
				} as BlockJSON;

				stubs.storage.entities.Block.get.mockReturnValue(forgedBlocks);

				getTotalEarningsOfDelegate = account => {
					const blockCount = delegatesWhoForged.filter(
						d => d.publicKey === account.publicKey,
					).length;
					const reward = new BigNum(rewardPerDelegate).mul(blockCount);
					const fee = new BigNum(feePerDelegate).mul(blockCount);
					return {
						reward,
						fee,
					};
				};
			});

			it('should update vote weight of accounts that delegates with correct balance', async () => {
				// Act
				await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

				const publicKeysToUpdate = uniqueDelegatesWhoForged.reduce(
					(accumulator: any, account) => {
						const { fee, reward } = getTotalEarningsOfDelegate(account);
						account.votedDelegatesPublicKeys.forEach(publicKey => {
							if (accumulator[publicKey]) {
								accumulator[publicKey] = accumulator[publicKey].plus(
									fee.plus(reward),
								);
							} else {
								accumulator[publicKey] = fee.plus(reward);
							}
						});
						return accumulator;
					},
					{},
				);

				// Assert
				expect.assertions(publicKeysToUpdate.length);
				Object.keys(publicKeysToUpdate).forEach(publicKey => {
					const amount = publicKeysToUpdate[publicKey].toString();

					expect(
						stubs.storage.entities.Account.increaseFieldBy,
					).toHaveBeenCalledWith({ publicKey }, 'voteWeight', amount, stubs.tx);
				});
			});
		});

		describe('Given the provided block is in an exception round', () => {
			let exceptionFactors: { [key: string]: number };
			beforeEach(() => {
				// Arrange
				exceptionFactors = {
					rewards_factor: 2,
					fees_factor: 2,
					// setting bonus to a dividable amount
					fees_bonus: ACTIVE_DELEGATES * 123,
				};
				const exceptionRound = slots.calcRound(lastBlockOfTheRoundNine.height);
				const exceptions = {
					rounds: {
						[exceptionRound]: exceptionFactors,
					},
				};

				dpos = new Dpos({
					slots,
					...stubs,
					activeDelegates: ACTIVE_DELEGATES,
					delegateListRoundOffset: DELEGATE_LIST_ROUND_OFFSET,
					exceptions,
				});
			});

			it('should multiply delegate reward with "rewards_factor"', async () => {
				// Act
				await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

				// Assert
				expect.assertions(uniqueDelegatesWhoForged.length);
				uniqueDelegatesWhoForged.forEach(account => {
					const { reward } = getTotalEarningsOfDelegate(account);
					const exceptionReward = reward.mul(exceptionFactors.rewards_factor);
					const partialData = {
						rewards: account.rewards.add(exceptionReward).toString(),
					};

					// Assert
					expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
						{
							publicKey: account.publicKey,
						},
						expect.objectContaining(partialData),
						{},
						stubs.tx,
					);
				});
			});

			it('should multiply "totalFee" with "fee_factor" and add "fee_bonus"', async () => {
				// Act
				await dpos.apply(lastBlockOfTheRoundNine, { tx: stubs.tx });

				uniqueDelegatesWhoForged.forEach(account => {
					const blockCount = delegatesWhoForged.filter(
						d => d.publicKey === account.publicKey,
					).length;

					const exceptionTotalFee: BigNum = totalFee
						.mul(exceptionFactors.fees_factor)
						.add(exceptionFactors.fees_bonus);

					const earnedFee = exceptionTotalFee
						.div(new BigNum(ACTIVE_DELEGATES))
						.mul(blockCount);

					const partialData = {
						fees: account.fees.add(earnedFee).toString(),
					};

					// Assert
					expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
						{
							publicKey: account.publicKey,
						},
						expect.objectContaining(partialData),
						{},
						stubs.tx,
					);
				});
			});
		});
	});
});
