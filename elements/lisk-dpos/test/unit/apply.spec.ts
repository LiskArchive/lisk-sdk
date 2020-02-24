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
import { Slots } from '@liskhq/lisk-chain';
import { Account, ForgersList, Block } from '../../src/types';
import {
	BLOCK_TIME,
	ACTIVE_DELEGATES,
	EPOCH_TIME,
	DELEGATE_LIST_ROUND_OFFSET,
} from '../fixtures/constants';
import { randomInt } from '../utils/random_int';
import {
	delegateAccounts,
	sortedDelegateAccounts,
	delegatesWhoForged,
	delegatesWhoForgedNone,
	delegateWhoForgedLast,
	votedDelegates,
} from '../utils/round_delegates';
import { CHAIN_STATE_FORGERS_LIST_KEY } from '../../src/constants';
import { StateStoreMock } from '../utils/state_store_mock';

describe('dpos.apply()', () => {
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
				id: 'genesis-block',
				timestamp: 10,
				height: 1,
				generatorPublicKey: generator.publicKey,
				reward: BigInt(500000000),
				totalFee: BigInt(100000000),
				transactions: [],
			} as Block;

			stateStore = new StateStoreMock(
				[generator, ...sortedDelegateAccounts],
				{},
			);

			when(chainStub.dataAccess.getDelegateAccounts)
				.calledWith(ACTIVE_DELEGATES)
				.mockReturnValue([]);
		});

		it('should save round 1 + round offset active delegates list in chain state by using delegate accounts', async () => {
			// Act
			await dpos.apply(genesisBlock, stateStore);

			// Assert
			expect(chainStub.dataAccess.getDelegateAccounts).toHaveBeenCalledWith(
				ACTIVE_DELEGATES,
			);
			let forgerslList = [];
			for (let i = 0; i <= DELEGATE_LIST_ROUND_OFFSET; i++) {
				forgerslList.push({
					round: i + 1,
					delegates: sortedDelegateAccounts.map(d => d.publicKey),
				});
			}
			expect(stateStore.chainStateData).toEqual({
				[CHAIN_STATE_FORGERS_LIST_KEY]: JSON.stringify(forgerslList),
			});
		});

		it('should resolve with "false"', async () => {
			// Act
			const result = await dpos.apply(genesisBlock, stateStore);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('Given block is NOT the last block of the round', () => {
		const totalEarning = BigInt(1230000000);

		let generator: Account;
		let block: Block;
		let forgersList: ForgersList;

		beforeEach(() => {
			generator = { ...delegateAccounts[1] };
			// Arrange
			block = {
				height: 2,
				generatorPublicKey: generator.publicKey,
			} as Block;

			forgersList = [
				{
					round: 1,
					delegates: sortedDelegateAccounts.map(d => d.publicKey),
				},
				{
					round: 2,
					delegates: sortedDelegateAccounts.map(d => d.publicKey),
				},
			];

			chainStub.getTotalEarningAndBurnt.mockReturnValue({
				totalEarning,
				totalBurnt: BigInt(0),
			});

			stateStore = new StateStoreMock([generator, ...votedDelegates], {
				[CHAIN_STATE_FORGERS_LIST_KEY]: JSON.stringify(forgersList),
			});

			when(chainStub.dataAccess.getDelegateAccounts)
				.calledWith(ACTIVE_DELEGATES)
				.mockReturnValue(sortedDelegateAccounts);
		});

		it('should update vote weight of accounts that delegates who forged voted for', async () => {
			// Act
			await dpos.apply(block, stateStore);

			const votedDelegatesFromGenerator = votedDelegates.filter(delegate =>
				generator.votedDelegatesPublicKeys.includes(delegate.publicKey),
			);
			expect.assertions(votedDelegatesFromGenerator.length);
			for (const delegate of votedDelegatesFromGenerator) {
				const votedDelegate = await stateStore.account.get(delegate.address);
				expect(votedDelegate.voteWeight.toString()).toEqual(
					(delegate.voteWeight + totalEarning).toString(),
				);
			}
		});

		it('should NOT update "missedBlocks"', async () => {
			// Act
			await dpos.apply(block, stateStore);

			const generatorAccount = await stateStore.account.get(generator.address);
			// Assert
			expect(generatorAccount).toEqual({
				...generator,
			});
		});

		it('should NOT update forgers list', async () => {
			// Act
			await dpos.apply(block, stateStore);

			// Assert
			const chainState = await stateStore.chainState.get(
				CHAIN_STATE_FORGERS_LIST_KEY,
			);
			expect(chainState).toEqual(JSON.stringify(forgersList));
		});
	});

	describe('Given block is the last block of the round', () => {
		let lastBlockOfTheRoundNine: Block;
		let feePerDelegate: bigint;
		let rewardPerDelegate: bigint;

		beforeEach(() => {
			stateStore = new StateStoreMock(
				[...delegateAccounts, ...votedDelegates],
				{
					[CHAIN_STATE_FORGERS_LIST_KEY]: JSON.stringify([
						{
							round: 7,
							delegates: sortedDelegateAccounts.map(d => d.publicKey),
						},
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
					]),
				},
			);
			when(chainStub.dataAccess.getDelegateAccounts)
				.calledWith(ACTIVE_DELEGATES)
				.mockReturnValue(sortedDelegateAccounts);

			feePerDelegate = BigInt(randomInt(10, 100));

			// Delegates who forged got their rewards
			rewardPerDelegate = BigInt(randomInt(1, 20));

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
			} as Block;

			chainStub.dataAccess.getBlockHeadersByHeightBetween.mockReturnValue(
				forgedBlocks,
			);
		});

		it('should increase "missedBlocks" field by "1" for the delegates who did not forge in the round', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRoundNine, stateStore);

			// Assert
			expect.assertions(delegatesWhoForgedNone.length);
			for (const delegate of delegatesWhoForgedNone) {
				const { missedBlocks } = await stateStore.account.get(delegate.address);
				expect(missedBlocks).toEqual(1);
			}
		});

		it('should save next round + roundOffset active delegates list in frogers list after applying last block of round', async () => {
			// Arrange
			const currentRound = dpos.rounds.calcRound(
				lastBlockOfTheRoundNine.height,
			);
			const nextRound = dpos.rounds.calcRound(
				lastBlockOfTheRoundNine.height + 1,
			);

			// Act
			await dpos.apply(lastBlockOfTheRoundNine, stateStore);

			// Assert
			// make sure we calculate round number correctly
			expect(nextRound).toBe(currentRound + 1);
			// we must delete the delegate list before creating the new one
			const forgersListStr = await stateStore.chainState.get(
				CHAIN_STATE_FORGERS_LIST_KEY,
			);
			const forgersList: ForgersList = JSON.parse(forgersListStr as string);

			const forgers = forgersList.find(
				fl => fl.round === nextRound + DELEGATE_LIST_ROUND_OFFSET,
			);

			expect(forgers?.round).toEqual(nextRound + DELEGATE_LIST_ROUND_OFFSET);
		});

		it('should delete forgers list older than (finalizedBlockRound - 2)', async () => {
			// Arrange
			const finalizedBlockHeight = 1213;
			const finalizedBlockRound = Math.ceil(
				finalizedBlockHeight / ACTIVE_DELEGATES,
			);
			const bftRoundOffset = 2; // TODO: get from BFT constants
			const delegateActiveRoundLimit = 3;
			const expectedRound =
				finalizedBlockRound - bftRoundOffset - delegateActiveRoundLimit;

			// Check before finalize exist for test
			const forgersListBeforeStr = await stateStore.chainState.get(
				CHAIN_STATE_FORGERS_LIST_KEY,
			);
			const forgersBeforeList: ForgersList = JSON.parse(
				forgersListBeforeStr as string,
			);
			const filteredForgersBefore = forgersBeforeList.filter(
				fl => fl.round < expectedRound,
			);
			expect(filteredForgersBefore).toHaveLength(1);

			// Act
			await dpos.onBlockFinalized(stateStore, finalizedBlockHeight);

			const forgersListStr = await stateStore.chainState.get(
				CHAIN_STATE_FORGERS_LIST_KEY,
			);
			const forgersList: ForgersList = JSON.parse(forgersListStr as string);

			const filteredForgers = forgersList.filter(
				fl => fl.round < expectedRound,
			);

			// Assert
			expect(filteredForgers).toHaveLength(0);
		});

		it('should should emit EVENT_ROUND_CHANGED', async () => {
			// Arrange
			const eventCallback = jest.fn();
			const oldRound = lastBlockOfTheRoundNine.height / ACTIVE_DELEGATES;
			(dpos as any).events.on(constants.EVENT_ROUND_CHANGED, eventCallback);

			// Act
			await dpos.apply(lastBlockOfTheRoundNine, stateStore);

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

				chainStub.dataAccess.getBlockHeadersByHeightBetween.mockReturnValue(
					forgedBlocks,
				);

				// Act
				await dpos.apply(lastBlockOfTheRoundNine, stateStore);
				expect.assertions(delegatesWhoForged.length);
				for (const delegate of delegatesWhoForged) {
					expect(delegate.missedBlocks).toEqual(0);
				}
			});
		});
	});
});
