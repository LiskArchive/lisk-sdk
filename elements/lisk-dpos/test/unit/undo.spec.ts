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
import { Slots } from '@liskhq/lisk-chain';
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
	delegateWhoForgedLast,
	sortedDelegateAccounts,
	votedDelegates,
} from '../utils/round_delegates';
import { Block, Account, ForgersList } from '../../src/types';
import { StateStoreMock } from '../utils/state_store_mock';
import { CHAIN_STATE_FORGERS_LIST_KEY } from '../../src/constants';

describe('dpos.undo()', () => {
	let dpos: Dpos;
	let chainStub: any;
	let stateStore: StateStoreMock;

	beforeEach(() => {
		// Arrange
		chainStub = {
			slots: new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME }) as any,
			getTotalEarningAndBurnt: jest
				.fn()
				.mockReturnValue({ totalEarning: BigInt(0), totalBurnt: BigInt(0) }),
			dataAccess: {
				getBlockHeadersByHeightBetween: jest.fn().mockResolvedValue([]),
				getChainState: jest.fn().mockResolvedValue(undefined),
				getDelegateAccounts: jest.fn().mockResolvedValue([]),
			},
		};

		dpos = new Dpos({
			chain: chainStub,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset: DELEGATE_LIST_ROUND_OFFSET,
		});
		stateStore = new StateStoreMock([...sortedDelegateAccounts], {});
	});

	describe('Given block is the genesis block (height === 1)', () => {
		let genesisBlock: Block;
		let stateStore: StateStoreMock;
		let generator: Account;

		beforeEach(() => {
			generator = { ...delegateAccounts[0] };
			// Arrange
			genesisBlock = {
				height: 1,
			} as Block;
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

	describe('Given block is NOT the last block of the round', () => {
		const totalEarning = BigInt(1230000000);

		let generator: Account;
		let block: Block;

		beforeEach(async () => {
			// Arrange
			generator = { ...delegateAccounts[0], producedBlocks: 1 };
			block = {
				height: 2,
				generatorPublicKey: generator.publicKey,
			} as Block;
			stateStore = new StateStoreMock(
				[
					generator,
					...votedDelegates.map(delegate => ({ ...delegate })),
					...sortedDelegateAccounts,
				],
				{
					[CHAIN_STATE_FORGERS_LIST_KEY]: JSON.stringify([
						{
							round: 1,
							delegates: sortedDelegateAccounts.map(d => d.publicKey),
						},
					]),
				},
			);

			chainStub.getTotalEarningAndBurnt.mockReturnValue({
				totalEarning,
				totalBurnt: BigInt(0),
			});
		});

		it('should NOT update "missedBlocks"', async () => {
			// Act
			await dpos.undo(block, stateStore);

			const account = await stateStore.account.get(generator.address);
			// Assert
			expect(account.missedBlocks).toEqual(generator.missedBlocks);
			expect(account.voteWeight).toEqual(generator.voteWeight);
			expect(account.rewards).toEqual(generator.rewards);
			expect(account.fees).toEqual(generator.fees);
		});

		it('should update vote weight of accounts that delegates who forged voted for', async () => {
			// Act
			await dpos.undo(block, stateStore);

			const votedDelegatesFromGenerator = votedDelegates.filter(delegate =>
				generator.votedDelegatesPublicKeys.includes(delegate.publicKey),
			);
			expect.assertions(votedDelegatesFromGenerator.length);
			for (const delegate of votedDelegatesFromGenerator) {
				const votedDelegate = await stateStore.account.get(delegate.address);
				expect(votedDelegate.voteWeight.toString()).toEqual(
					(delegate.voteWeight - totalEarning).toString(),
				);
			}
		});

		it('should NOT delete delegate list for rounds which are after the current round', async () => {
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
		let lastBlockOfTheRoundNine: Block;
		let feePerDelegate: bigint;
		let rewardPerDelegate: bigint;

		beforeEach(() => {
			// Arrange
			stateStore = new StateStoreMock(
				[
					...delegateAccounts,
					...votedDelegates.map(delegate => ({ ...delegate })),
				],
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

			// Delegates who forged got their rewards
			rewardPerDelegate = BigInt(randomInt(1, 20));

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

			chainStub.dataAccess.getBlockHeadersByHeightBetween.mockReturnValue(
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
	});
});
