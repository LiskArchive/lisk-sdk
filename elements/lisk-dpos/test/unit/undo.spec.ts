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

import { when } from 'jest-when';
import { Dpos, constants } from '../../src';
import { Slots } from '../../../lisk-blocks/src/slots';
import {
	EPOCH_TIME,
	ACTIVE_DELEGATES,
	BLOCK_TIME,
	DELEGATE_LIST_ROUND_OFFSET,
} from '../fixtures/constants';
import { randomInt } from '../utils/random_int';
import {
	delegateAccounts,
	delegatePublicKeys,
	delegatesWhoForged,
	delegatesWhoForgedNone,
	uniqueDelegatesWhoForged,
	delegatesWhoForgedOnceMissedOnce,
	delegateWhoForgedLast,
} from '../utils/round_delegates';
import { Block, Account } from '../../src/types';

describe('dpos.undo()', () => {
	const stubs = {} as any;
	let dpos: Dpos;
	let slots: Slots;
	beforeEach(() => {
		// Arrange
		stubs.storage = {
			entities: {
				Account: {
					get: jest.fn(),
					decreaseFieldBy: jest.fn(),
					update: jest.fn(),
				},
				Block: {
					get: jest.fn(),
				},
				RoundDelegates: {
					delete: jest.fn(),
					getActiveDelegatesForRound: jest
						.fn()
						.mockReturnValue(delegatePublicKeys),
				},
			},
		};

		stubs.logger = {
			debug: jest.fn(),
			log: jest.fn(),
			error: jest.fn(),
		};

		stubs.tx = jest.fn();

		const slots = new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME });
		const blocks = {
			slots,
		};

		dpos = new Dpos({
			blocks,
			...stubs,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset: DELEGATE_LIST_ROUND_OFFSET,
		});
	});

	describe('Given block is the genesis block (height === 1)', () => {
		let genesisBlock: Block;
		beforeEach(() => {
			// Arrange
			genesisBlock = {
				height: 1,
			} as Block;
		}) as Block;

		it('should throw exception and NOT update "producedBlocks", "missedBlocks", "rewards", "fees", "votes"', async () => {
			// Act && Assert
			await expect(dpos.undo(genesisBlock, { tx: stubs.tx })).rejects.toThrow(
				'Cannot undo genesis block',
			);

			// Assert
			expect(
				stubs.storage.entities.Account.decreaseFieldBy,
			).not.toHaveBeenCalled();

			expect(stubs.storage.entities.Account.update).not.toHaveBeenCalled();
		});
	});

	describe('Given block is NOT the genesis block (height > 1)', () => {
		it('should decrease "producedBlocks" field by "1" for the generator delegate', async () => {
			// Arrange
			const block = ({
				height: 2,
				generatorPublicKey: 'generatorPublicKey#RANDOM',
			} as Block) as Block;

			// Act
			await dpos.undo(block, { tx: stubs.tx });

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
			} as Block;

			// Act
			await dpos.undo(block, { tx: stubs.tx });

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

		it('should NOT delete delegate list for rounds which are after the current round', async () => {
			// Arrange
			const block = {
				height: 2,
				generatorPublicKey: 'generatorPublicKey#RANDOM',
			} as Block;

			// Act
			await dpos.undo(block, { tx: stubs.tx });

			// Assert
			expect(
				stubs.storage.entities.RoundDelegates.delete,
			).not.toHaveBeenCalled();
		});
	});

	describe('Given block is the last block of the round', () => {
		let lastBlockOfTheRoundNine: Block;
		let feePerDelegate: bigint;
		let rewardPerDelegate: bigint;
		let totalFee: bigint;
		let getTotalEarningsOfDelegate: (
			account: Account,
		) => { reward: bigint; fee: bigint };
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

			feePerDelegate = BigInt(randomInt(10, 100));
			totalFee = feePerDelegate * BigInt(ACTIVE_DELEGATES);

			// Delegates who forged got their rewards
			rewardPerDelegate = BigInt(randomInt(1, 20));

			getTotalEarningsOfDelegate = (account: Account) => {
				const blockCount = delegatesWhoForged.filter(
					d => d.publicKey === account.publicKey,
				).length;
				const reward = BigInt(rewardPerDelegate) * BigInt(blockCount);
				const fee = BigInt(feePerDelegate) * BigInt(blockCount);
				return {
					reward,
					fee,
				};
			};
			lastBlockOfTheRoundNine = {
				height: 909,
				generatorPublicKey: delegateWhoForgedLast.publicKey,
				totalFee: feePerDelegate,
				reward: rewardPerDelegate,
			} as Block;
			const forgedBlocks = delegatesWhoForged.map((delegate, i) => ({
				generatorPublicKey: delegate.publicKey,
				totalFee: feePerDelegate,
				reward: rewardPerDelegate,
				height: 809 + i,
			}));

			forgedBlocks.splice(forgedBlocks.length - 1);

			stubs.storage.entities.Block.get.mockReturnValue(forgedBlocks);
		});

		it('should decrease "missedBlocks" field by "1" for the delegates who did not forge in the round', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			expect(
				stubs.storage.entities.Account.decreaseFieldBy,
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

		it('should undo distribution of reward and fee ONLY to the delegates who forged', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx });

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

		it('should undo distribution of reward and fee for delegate who forged once but missed once', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx });

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
			await dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			expect.assertions(uniqueDelegatesWhoForged.length);
			uniqueDelegatesWhoForged.forEach(account => {
				const { fee, reward } = getTotalEarningsOfDelegate(account);
				const amount = fee + reward;
				const data = {
					balance: (account.balance - amount).toString(),
					fees: (account.fees - fee).toString(),
					rewards: (account.rewards - reward).toString(),
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
			const forgedBlocks = delegatesWhoForged.map((delegate, i) => ({
				generatorPublicKey: delegate.publicKey,
				totalFee: feePerDelegate,
				reward: rewardPerDelegate,
				height: 809 + i,
			}));
			forgedBlocks.splice(forgedBlocks.length - 1);

			stubs.storage.entities.Block.get.mockReturnValue(forgedBlocks);
			lastBlockOfTheRoundNine = {
				height: 909,
				generatorPublicKey: delegateWhoForgedLast.publicKey,
				totalFee: BigInt(feePerDelegate) + BigInt(remainingFee),
				reward: rewardPerDelegate,
			} as Block;

			// Act
			await dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx });

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
					fees: (
						delegateWhoForgedLast.fees -
						(feePerDelegate * BigInt(3) + BigInt(remainingFee))
					).toString(),
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
							fees: (
								account.fees -
								feePerDelegate * BigInt(blockCount)
							).toString(),
						}),
						{},
						stubs.tx,
					);
				});
		});

		it('should update vote weight of accounts that delegates who forged voted for', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx });

			const publicKeysToUpdate = uniqueDelegatesWhoForged.reduce(
				(accumulator: any, account) => {
					const { fee, reward } = getTotalEarningsOfDelegate(account);
					account.votedDelegatesPublicKeys.forEach(publicKey => {
						if (accumulator[publicKey]) {
							accumulator[publicKey] = accumulator[publicKey] + fee + reward;
						} else {
							accumulator[publicKey] = fee + reward;
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
					stubs.storage.entities.Account.decreaseFieldBy,
				).toHaveBeenCalledWith({ publicKey }, 'voteWeight', amount, stubs.tx);
			});
		});

		it('should delete delegate list for rounds which are after the current round', async () => {
			// Arrange
			const roundNo = (dpos as any).rounds.calcRound(
				lastBlockOfTheRoundNine.height,
			);

			// Act
			await dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			expect(stubs.storage.entities.RoundDelegates.delete).toHaveBeenCalledWith(
				{
					round_gt: roundNo,
				},
				{},
				stubs.tx,
			);
		});

		it('should should emit EVENT_ROUND_CHANGED', async () => {
			// Arrange
			const eventCallbackStub = jest.fn();
			const newRound = lastBlockOfTheRoundNine.height / ACTIVE_DELEGATES;
			(dpos as any).events.on(constants.EVENT_ROUND_CHANGED, eventCallbackStub);

			// Act
			await dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx });

			// Assert
			expect(eventCallbackStub).toHaveBeenCalledWith({
				oldRound: newRound + 1,
				newRound,
			});
		});

		describe('When all delegates successfully forges a block', () => {
			it('should NOT update "missedBlocks" for anyone', async () => {
				// Arrange
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
				await dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx });

				expect(
					stubs.storage.entities.Account.decreaseFieldBy,
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
					dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx }),
				).rejects.toBe(err);

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
			let exceptionFactors: { [key: string]: number };
			beforeEach(() => {
				// Arrange
				exceptionFactors = {
					rewards_factor: 2,
					fees_factor: 2,
					// setting bonus to a dividable amount
					fees_bonus: ACTIVE_DELEGATES * 123,
				};
				const exceptionRound = (dpos as any).rounds.calcRound(
					lastBlockOfTheRoundNine.height,
				);
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
				await dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx });

				// Assert
				expect.assertions(uniqueDelegatesWhoForged.length);
				uniqueDelegatesWhoForged.forEach(account => {
					const { reward } = getTotalEarningsOfDelegate(account);
					// Undo will use -1 as we're undoing
					const exceptionReward =
						reward * BigInt(-1 * exceptionFactors.rewards_factor);
					const partialData = {
						rewards: (account.rewards + exceptionReward).toString(),
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
				await dpos.undo(lastBlockOfTheRoundNine, { tx: stubs.tx });

				uniqueDelegatesWhoForged.forEach(account => {
					const blockCount = delegatesWhoForged.filter(
						d => d.publicKey === account.publicKey,
					).length;

					const exceptionTotalFee =
						totalFee * BigInt(exceptionFactors.fees_factor) +
						BigInt(exceptionFactors.fees_bonus);

					const earnedFee =
						(exceptionTotalFee / BigInt(ACTIVE_DELEGATES)) * BigInt(blockCount);

					const partialData = {
						fees: (account.fees - earnedFee).toString(),
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
