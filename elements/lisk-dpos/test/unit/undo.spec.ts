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
	delegatesWhoForged,
	delegatesWhoForgedNone,
	uniqueDelegatesWhoForged,
	delegatesWhoForgedOnceMissedOnce,
	delegateWhoForgedLast,
	sortedDelegateAccounts,
	votedDelegates,
} from '../utils/round_delegates';
import {
	BlockHeader,
	Account,
	ForgersList,
	RoundException,
} from '../../src/types';
import { StateStoreMock } from '../utils/state_store_mock';
import { CHAIN_STATE_FORGERS_LIST_KEY } from '../../src/constants';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

describe('dpos.undo()', () => {
	let dpos: Dpos;
	let blocksStub: any;
	let stateStore: StateStoreMock;

	beforeEach(() => {
		// Arrange
		blocksStub = {
			slots: new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME }) as any,
			dataAccess: {
				getBlockHeadersByHeightBetween: jest.fn().mockResolvedValue([]),
				getChainState: jest.fn().mockResolvedValue(undefined),
				getDelegateAccounts: jest.fn().mockResolvedValue([]),
			},
		};

		dpos = new Dpos({
			blocks: blocksStub,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset: DELEGATE_LIST_ROUND_OFFSET,
		});
		stateStore = new StateStoreMock([...sortedDelegateAccounts], {});
	});

	describe('Given block is the genesis block (height === 1)', () => {
		let genesisBlock: BlockHeader;
		let stateStore: StateStoreMock;
		let generator: Account;

		beforeEach(() => {
			generator = { ...delegateAccounts[0] };
			// Arrange
			genesisBlock = {
				height: 1,
			} as BlockHeader;
			stateStore = new StateStoreMock(
				[generator, ...sortedDelegateAccounts],
				{},
			);
		});

		it('should throw exception and NOT update "producedBlocks", "missedBlocks", "rewards", "fees", "votes"', async () => {
			// Act && Assert
			await expect(dpos.undo(genesisBlock, stateStore)).rejects.toThrow(
				'Cannot undo genesis block',
			);
		});
	});

	describe('Given block is NOT the genesis block (height > 1)', () => {
		let generator: Account;

		it('should decrease "producedBlocks" field by "1" for the generator delegate', async () => {
			// Arrange
			generator = { ...delegateAccounts[0], producedBlocks: 1 };
			const block = ({
				height: 2,
				generatorPublicKey: generator.publicKey,
			} as BlockHeader) as BlockHeader;

			stateStore = new StateStoreMock(
				[generator, ...sortedDelegateAccounts],
				{},
			);

			// Act
			await dpos.undo(block, stateStore);

			const account = await stateStore.account.get(generator.address);
			// Assert
			expect(account.producedBlocks).toEqual(0);
		});
	});

	describe('Given block is NOT the last block of the round', () => {
		let generator: Account;

		it('should NOT update "missedBlocks", "voteWeight", "rewards", "fees"', async () => {
			// Arrange
			generator = { ...delegateAccounts[0], producedBlocks: 1 };
			const block = {
				height: 2,
				generatorPublicKey: generator.publicKey,
			} as BlockHeader;
			stateStore = new StateStoreMock(
				[generator, ...sortedDelegateAccounts],
				{},
			);

			// Act
			await dpos.undo(block, stateStore);

			const account = await stateStore.account.get(generator.address);
			// Assert
			expect(account.missedBlocks).toEqual(generator.missedBlocks);
			expect(account.voteWeight).toEqual(generator.voteWeight);
			expect(account.rewards).toEqual(generator.rewards);
			expect(account.fees).toEqual(generator.fees);
		});

		it('should NOT delete delegate list for rounds which are after the current round', async () => {
			// Arrange
			generator = { ...delegateAccounts[0], producedBlocks: 1 };
			const block = {
				height: 2,
				generatorPublicKey: generator.publicKey,
			} as BlockHeader;
			stateStore = new StateStoreMock([generator, ...sortedDelegateAccounts], {
				[CHAIN_STATE_FORGERS_LIST_KEY]: JSON.stringify([
					{ round: 2, delegates: [] },
				]),
			});
			// Act
			await dpos.undo(block, stateStore);

			const chainState = await stateStore.chainState.get(
				CHAIN_STATE_FORGERS_LIST_KEY,
			);
			const res = JSON.parse(chainState as string);

			expect(res).toHaveLength(1);
		});
	});

	describe('Given block is the last block of the round', () => {
		let lastBlockOfTheRoundNine: BlockHeader;
		let feePerDelegate: bigint;
		let rewardPerDelegate: bigint;
		let totalFee: bigint;
		let getTotalEarningsOfDelegate: (
			account: Account,
		) => { reward: bigint; fee: bigint };
		beforeEach(() => {
			// Arrange
			stateStore = new StateStoreMock(
				[...delegateAccounts, ...votedDelegates],
				{
					[CHAIN_STATE_FORGERS_LIST_KEY]: JSON.stringify([
						{
							round: 8,
							delegates: sortedDelegateAccounts.map(d => d.publicKey),
						},
						{
							round: 9,
							delegates: sortedDelegateAccounts.map(d => d.publicKey),
						},
						{
							round: 10,
							delegates: sortedDelegateAccounts.map(d => d.publicKey),
						},
						{
							round: 11,
							delegates: sortedDelegateAccounts.map(d => d.publicKey),
						},
						{
							round: 12,
							delegates: sortedDelegateAccounts.map(d => d.publicKey),
						},
					]),
				},
			);

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
			} as BlockHeader;
			const forgedBlocks = delegatesWhoForged.map((delegate, i) => ({
				generatorPublicKey: delegate.publicKey,
				totalFee: feePerDelegate,
				reward: rewardPerDelegate,
				height: 809 + i,
			}));

			forgedBlocks.splice(forgedBlocks.length - 1);

			blocksStub.dataAccess.getBlockHeadersByHeightBetween.mockReturnValue(
				forgedBlocks,
			);
		});

		it('should decrease "missedBlocks" field by "1" for the delegates who did not forge in the round', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			expect.assertions(delegatesWhoForgedNone.length);
			for (const delegate of delegatesWhoForgedNone) {
				const account = await stateStore.account.get(delegate.address);
				// Assert
				expect(delegate.missedBlocks).toEqual(account.missedBlocks + 1);
			}
		});

		it('should undo distribution of reward and fee ONLY to the delegates who forged', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			// Assert
			expect.assertions(ACTIVE_DELEGATES * 2);

			// Assert Group 1/2
			for (const delegate of uniqueDelegatesWhoForged) {
				const account = await stateStore.account.get(delegate.address);
				const { reward, fee } = getTotalEarningsOfDelegate(account);
				expect(account.rewards).toEqual(BigInt(delegate.rewards) - reward);
				expect(account.fees).toEqual(BigInt(delegate.fees) - fee);
			}
			for (const delegate of delegatesWhoForgedNone) {
				const account = await stateStore.account.get(delegate.address);
				expect(account.rewards).toEqual(delegate.rewards);
				expect(account.fees).toEqual(delegate.fees);
			}
		});

		it('should undo distribution of reward and fee for delegate who forged once but missed once', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			// Assert
			expect.assertions(delegatesWhoForgedOnceMissedOnce.length * 2);

			for (const delegate of delegatesWhoForgedOnceMissedOnce) {
				const account = await stateStore.account.get(delegate.address);
				const { reward, fee } = getTotalEarningsOfDelegate(account);
				// Assert
				expect(account.rewards).toEqual(BigInt(delegate.rewards) - reward);
				expect(account.fees).toEqual(BigInt(delegate.fees) - fee);
			}
		});

		it('should undo distribution of rewards and fees (with correct balance) to delegates based on number of blocks they forged', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			// Assert
			expect.assertions(uniqueDelegatesWhoForged.length * 3);
			for (const delegate of uniqueDelegatesWhoForged) {
				const account = await stateStore.account.get(delegate.address);
				const { reward, fee } = getTotalEarningsOfDelegate(account);
				const amount = fee + reward;
				const data = {
					balance: BigInt(delegate.balance) - amount,
					fees: BigInt(delegate.fees) - fee,
					rewards: BigInt(delegate.rewards) - reward,
				};
				expect(account.rewards).toEqual(data.rewards);
				expect(account.fees).toEqual(data.fees);
				expect(account.balance).toEqual(data.balance);
			}
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

			blocksStub.dataAccess.getBlockHeadersByHeightBetween.mockReturnValue(
				forgedBlocks,
			);
			lastBlockOfTheRoundNine = {
				height: 909,
				generatorPublicKey: delegateWhoForgedLast.publicKey,
				totalFee: BigInt(feePerDelegate) + BigInt(remainingFee),
				reward: rewardPerDelegate,
			} as BlockHeader;

			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			// Assert
			expect.assertions(uniqueDelegatesWhoForged.length);
			const lastDelegate = await stateStore.account.get(
				delegateWhoForgedLast.address,
			);
			expect(lastDelegate.fees).toEqual(
				BigInt(delegateWhoForgedLast.fees) -
					(feePerDelegate * BigInt(3) + BigInt(remainingFee)),
			);
			for (const delegate of uniqueDelegatesWhoForged) {
				if (delegate.address === delegateWhoForgedLast.address) {
					continue;
				}
				const blockCount = delegatesWhoForged.filter(
					d => d.publicKey === delegate.publicKey,
				).length;
				const account = await stateStore.account.get(delegate.address);
				expect(account.fees).toEqual(
					BigInt(delegate.fees) - feePerDelegate * BigInt(blockCount),
				);
			}
		});

		it('should update vote weight of accounts that delegates who forged voted for', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

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
			for (const publicKey of Object.keys(publicKeysToUpdate)) {
				const amount = publicKeysToUpdate[publicKey];
				const account = await stateStore.account.get(
					getAddressFromPublicKey(publicKey),
				);
				// Assuming that the initial value was 0
				expect(account.voteWeight).toEqual(BigInt(`-${amount}`));
			}
		});

		it('should delete delegate list for rounds which are after the current round + offset', async () => {
			// Arrange
			const roundNo = dpos.rounds.calcRound(lastBlockOfTheRoundNine.height);

			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			// Assert
			const chainState =
				(await stateStore.chainState.get(CHAIN_STATE_FORGERS_LIST_KEY)) ?? '[]';
			const forgersList = JSON.parse(chainState as string) as ForgersList;
			const filteredList = forgersList.filter(
				fl => fl.round > roundNo + DELEGATE_LIST_ROUND_OFFSET,
			);
			expect(filteredList).toHaveLength(0);
		});

		it('should should emit EVENT_ROUND_CHANGED', async () => {
			// Arrange
			const eventCallbackStub = jest.fn();
			const newRound = lastBlockOfTheRoundNine.height / ACTIVE_DELEGATES;
			(dpos as any).events.on(constants.EVENT_ROUND_CHANGED, eventCallbackStub);

			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			// Assert
			expect(eventCallbackStub).toHaveBeenCalledWith({
				oldRound: newRound + 1,
				newRound,
			});
		});

		describe('When all delegates successfully forges a block', () => {
			it('should NOT update "missedBlocks" for anyone', async () => {
				// Arrange
				// Act
				await dpos.undo(lastBlockOfTheRoundNine, stateStore);

				for (const delegate of delegatesWhoForgedNone) {
					const account = await stateStore.account.get(delegate.address);
					expect(account.missedBlocks).toEqual(delegate.missedBlocks - 1);
				}
			});
		});

		describe('When summarizing round fails', () => {
			it('should throw the error message coming from summedRound method and not perform any update', async () => {
				// Arrange
				const err = new Error('dummyError');
				blocksStub.dataAccess.getBlockHeadersByHeightBetween.mockRejectedValue(
					err,
				);

				// Act && Assert
				await expect(
					dpos.undo(lastBlockOfTheRoundNine, stateStore),
				).rejects.toBe(err);
			});
		});

		describe('Given the provided block is in an exception round', () => {
			let exceptionFactors: RoundException;
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
					blocks: blocksStub,
					activeDelegates: ACTIVE_DELEGATES,
					delegateListRoundOffset: DELEGATE_LIST_ROUND_OFFSET,
					exceptions,
				});
			});

			it('should multiply delegate reward with "rewards_factor"', async () => {
				// Act
				await dpos.undo(lastBlockOfTheRoundNine, stateStore);

				// Assert
				expect.assertions(uniqueDelegatesWhoForged.length);
				for (const delegate of uniqueDelegatesWhoForged) {
					const { reward } = getTotalEarningsOfDelegate(delegate);
					// Undo will use -1 as we're undoing
					const exceptionReward =
						reward * BigInt(-1 * exceptionFactors.rewards_factor);
					const rewards = BigInt(delegate.rewards) + exceptionReward;
					const account = await stateStore.account.get(delegate.address);
					expect(account.rewards).toEqual(rewards);
				}
			});

			it('should multiple "totalFee" with "fee_factor" and add "fee_bonus" and substract it from the account', async () => {
				// Act
				await dpos.undo(lastBlockOfTheRoundNine, stateStore);

				for (const delegate of uniqueDelegatesWhoForged) {
					const blockCount = delegatesWhoForged.filter(
						d => d.publicKey === delegate.publicKey,
					).length;

					const exceptionTotalFee =
						totalFee * BigInt(exceptionFactors.fees_factor) +
						BigInt(exceptionFactors.fees_bonus);

					const earnedFee =
						(exceptionTotalFee / BigInt(ACTIVE_DELEGATES)) * BigInt(blockCount);

					const fees = BigInt(delegate.fees) - earnedFee;
					const account = await stateStore.account.get(delegate.address);
					expect(account.fees).toEqual(fees);
				}
			});
		});
	});
});
