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

const BigNum = require('@liskhq/bignum');
const { when } = require('jest-when');
const { Dpos, Slots } = require('../../../../../../../src/modules/chain/dpos');
const { constants, randomInt } = require('../../../../utils');
const {
	delegateAccounts,
	delegatePublicKeys,
	delegatesWhoForged,
	delegatesWhoForgedNone,
	uniqueDelegatesWhoForged,
	delegatesWhoForgedOnceMissedOnce,
	delegateWhoForgedLast,
} = require('./round_delegates');

describe('dpos.undo()', () => {
	const stubs = {};
	let dpos;
	let slots;
	beforeEach(() => {
		// Arrange
		stubs.storage = {
			entities: {
				Account: {
					get: jest.fn(),
					decreaseFieldBy: jest.fn(),
					update: jest.fn(),
				},
				RoundDelegates: {
					getRoundDelegates: jest.fn().mockReturnValue(delegatePublicKeys),
				},
				Round: {
					summedRound: jest.fn(),
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
			epochTime: constants.EPOCH_TIME,
			interval: constants.BLOCK_TIME,
			blocksPerRound: constants.ACTIVE_DELEGATES,
		});

		dpos = new Dpos({
			slots,
			...stubs,
			activeDelegates: constants.ACTIVE_DELEGATES,
		});
	});

	describe('Given block height is greater than "1" (NOT the genesis block)', () => {
		it('should decrease "producedBlocks" field by "1" for the generator delegate', async () => {
			// Arrange
			const block = {
				height: 2,
				generatorPublicKey: 'generatorPublicKey#RANDOM',
			};

			// Act
			await dpos.undo(block, stubs.tx);

			// Assert
			expect(
				stubs.storage.entities.Account.decreaseFieldBy,
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
			};

			// Act
			await dpos.undo(block, stubs.tx);

			// Assert
			expect(
				stubs.storage.entities.Account.decreaseFieldBy,
			).toHaveBeenCalledTimes(1);
			expect(
				stubs.storage.entities.Account.decreaseFieldBy,
			).toHaveBeenCalledWith(
				expect.any(Object),
				'producedBlocks',
				expect.any(String),
				expect.anything(),
			);

			expect(
				stubs.storage.entities.Account.decreaseFieldBy,
			).not.toHaveBeenCalledWith(expect.any(Object), 'missedBlocks');
			expect(
				stubs.storage.entities.Account.decreaseFieldBy,
			).not.toHaveBeenCalledWith(expect.any(Object), 'voteWeight');
			expect(stubs.storage.entities.Account.update).not.toHaveBeenCalled();
		});
	});

	describe('Given block is the last block of the round', () => {
		let lastBlockOfTheRound;
		let feePerDelegate;
		let rewardPerDelegate;
		let totalFee;
		let getTotalEarningsOfDelegate;
		beforeEach(() => {
			// Arrange
			lastBlockOfTheRound = {
				height: 202,
				generatorPublicKey: delegateWhoForgedLast.publicKey,
			};

			when(stubs.storage.entities.Account.get)
				.calledWith(
					{
						publicKey_in: delegatesWhoForged.map(({ publicKey }) => publicKey),
					},
					{ extended: true },
					stubs.tx,
				)
				.mockResolvedValue(delegatesWhoForged);

			delegateAccounts.forEach(account => {
				when(stubs.storage.entities.Account.get)
					.calledWith({
						publicKey: account.publicKey,
					})
					.mockResolvedValue(account);
			});

			feePerDelegate = randomInt(10, 100);
			totalFee = feePerDelegate * constants.ACTIVE_DELEGATES;

			// Delegates who forged got their rewards
			rewardPerDelegate = randomInt(1, 20);

			getTotalEarningsOfDelegate = account => {
				const blockCount = delegatesWhoForged.filter(
					d => d.publicKey === account.publicKey,
				).length;
				const reward = new BigNum(rewardPerDelegate * blockCount);
				const fee = new BigNum(feePerDelegate * blockCount);
				return {
					reward,
					fee,
				};
			};

			stubs.storage.entities.Round.summedRound.mockResolvedValue([
				{
					fees: totalFee, // dividable to ACTIVE_DELEGATE count
					rewards: delegatesWhoForged.map(() => rewardPerDelegate),
					delegates: delegatesWhoForged.map(account => account.publicKey),
				},
			]);
		});

		it('should decrease "missedBlocks" field by "1" for the delegates who didnt forge in the round', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRound, stubs.tx);

			// Assert
			expect(
				stubs.storage.entities.Account.decreaseFieldBy,
			).toHaveBeenCalledWith(
				{
					publicKey_in: delegatesWhoForgedNone.map(a => a.publicKey),
				},
				'missedBlocks',
				'1',
				stubs.tx,
			);
		});

		it('should undo distribution of reward and fee ONLY to the delegates who forged', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRound, stubs.tx);

			// Assert
			expect.assertions(constants.ACTIVE_DELEGATES);

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

		it('should undo distribution of reward and fee for delegate who forged once but missed once', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRound, stubs.tx);

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

		it('should undo distribution of rewards and fees (with correct balance) to delegates based on number of blocks they forged', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRound, stubs.tx);

			// Assert
			expect.assertions(uniqueDelegatesWhoForged.length);
			uniqueDelegatesWhoForged.forEach(account => {
				const { fee, reward } = getTotalEarningsOfDelegate(account);
				const amount = fee.plus(reward);
				const data = {
					balance: account.balance.minus(amount).toString(),
					fees: account.fees.minus(fee).toString(),
					rewards: account.rewards.minus(reward).toString(),
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

		it('should remove the remainingFee ONLY from the last delegate of the round who forged', async () => {
			// Arrange
			const remainingFee = randomInt(5, 10);
			stubs.storage.entities.Round.summedRound.mockResolvedValue([
				{
					fees: totalFee + remainingFee,
					rewards: delegatesWhoForged.map(() => rewardPerDelegate),
					delegates: delegatesWhoForged.map(a => a.publicKey),
				},
			]);

			// Act
			await dpos.undo(lastBlockOfTheRound, stubs.tx);

			// Assert
			expect.assertions(uniqueDelegatesWhoForged);
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
						.minus(feePerDelegate * 3 + remainingFee)
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
							fees: account.fees.minus(feePerDelegate * blockCount).toString(),
						}),
						{},
						stubs.tx,
					);
				});
		});

		it('should update vote weight of accounts that delegates who forged voted for', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRound, stubs.tx);

			// Assert
			expect.assertions(uniqueDelegatesWhoForged.length);
			uniqueDelegatesWhoForged.forEach(account => {
				const { fee, reward } = getTotalEarningsOfDelegate(account);
				const amount = fee.plus(reward);

				expect(
					stubs.storage.entities.Account.decreaseFieldBy,
				).toHaveBeenCalledWith(
					{
						publicKey_in: account.votedDelegatesPublicKeys,
					},
					'voteWeight',
					amount.toString(),
					stubs.tx,
				);
			});
		});

		describe('When all delegates successfully forges a block', () => {
			it('should NOT update "missedBlocks" for anyone', async () => {
				// Arrange
				stubs.storage.entities.Round.summedRound.mockResolvedValue([
					{
						fees: totalFee,
						rewards: delegateAccounts.map(() => randomInt(1, 20)),
						delegates: delegateAccounts.map(a => a.publicKey),
					},
				]);

				when(stubs.storage.entities.Account.get)
					.calledWith(
						{
							publicKey_in: delegateAccounts.map(({ publicKey }) => publicKey),
						},
						{ extended: true },
						stubs.tx,
					)
					.mockResolvedValue(delegateAccounts);

				// Act
				await dpos.undo(lastBlockOfTheRound, stubs.tx);

				expect(
					stubs.storage.entities.Account.decreaseFieldBy,
				).not.toHaveBeenCalledWith(expect.any, 'missedBlocks');
			});
		});

		describe('When summarizing round fails', () => {
			it('should throw the error message coming from summedRound method and not perform any update', async () => {
				// Arrange
				const err = new Error('dummyError');
				stubs.storage.entities.Round.summedRound.mockRejectedValue(err);

				// Act && Assert
				await expect(dpos.undo(lastBlockOfTheRound, stubs.tx)).rejects.toBe(
					err,
				);

				expect(stubs.storage.entities.Account.update).not.toHaveBeenCalled();
				expect(
					stubs.storage.entities.Account.decreaseFieldBy,
				).not.toHaveBeenCalledWith(expect.any, 'producedBlocks');
				expect(
					stubs.storage.entities.Account.decreaseFieldBy,
				).not.toHaveBeenCalledWith(expect.any(Object), 'missedBlocks');
				expect(
					stubs.storage.entities.Account.decreaseFieldBy,
				).not.toHaveBeenCalledWith(expect.any(Object), 'voteWeight');
			});
		});

		describe('Given the provided block is in an exception round', () => {
			let exceptionFactors;
			beforeEach(() => {
				// Arrange
				exceptionFactors = {
					rewards_factor: 2,
					fees_factor: 2,
					// setting bonus to a dividable amount
					fees_bonus: constants.ACTIVE_DELEGATES * 123,
				};
				const exceptionRound = slots.calcRound(lastBlockOfTheRound.height);
				const exceptions = {
					rounds: {
						[exceptionRound]: exceptionFactors,
					},
				};

				dpos = new Dpos({
					slots,
					...stubs,
					activeDelegates: constants.ACTIVE_DELEGATES,
					exceptions,
				});
			});

			it('should multiply delegate reward with "rewards_factor"', async () => {
				// Act
				await dpos.undo(lastBlockOfTheRound, stubs.tx);

				// Assert
				expect.assertions(uniqueDelegatesWhoForged.length);
				uniqueDelegatesWhoForged.forEach(account => {
					const { reward } = getTotalEarningsOfDelegate(account);
					// Undo will use -1 as we're undoing
					const exceptionReward =
						reward * (-1 * exceptionFactors.rewards_factor);
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

			it('should multiple "totalFee" with "fee_factor" and add "fee_bonus" and substract it from the account', async () => {
				// Act
				await dpos.undo(lastBlockOfTheRound, stubs.tx);

				uniqueDelegatesWhoForged.forEach(account => {
					const blockCount = delegatesWhoForged.filter(
						d => d.publicKey === account.publicKey,
					).length;

					const exceptionTotalFee =
						totalFee * exceptionFactors.fees_factor +
						exceptionFactors.fees_bonus;

					const earnedFee =
						(exceptionTotalFee / constants.ACTIVE_DELEGATES) * blockCount;

					const partialData = {
						fees: account.fees.minus(earnedFee).toString(),
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
