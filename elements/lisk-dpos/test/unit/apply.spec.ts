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

import * as randomSeedModule from '../../src/random_seed';
import { Dpos, constants } from '../../src';
import { Slots } from '@liskhq/lisk-chain';
import { Account, ForgersList, Block } from '../../src/types';
import {
	BLOCK_TIME,
	ACTIVE_DELEGATES,
	STANDBY_DELEGATES,
	EPOCH_TIME,
	DELEGATE_LIST_ROUND_OFFSET,
} from '../fixtures/constants';
import {
	getDelegateAccounts,
	getDelegateAccountsWithVotesReceived,
} from '../utils/round_delegates';
import {
	CONSENSUS_STATE_FORGERS_LIST_KEY,
	CONSENSUS_STATE_VOTE_WEIGHTS_KEY,
} from '../../src/constants';
import { StateStoreMock } from '../utils/state_store_mock';

describe('dpos.apply()', () => {
	const delegateAccounts = getDelegateAccountsWithVotesReceived(
		ACTIVE_DELEGATES + STANDBY_DELEGATES,
	);
	let dpos: Dpos;
	let chainStub: any;
	let stateStore: StateStoreMock;
	const randomSeed1 = Buffer.from('283f543e68fea3c08e976ef66acd3586');
	const randomSeed2 = Buffer.from('354c87fa7674a8061920b9daafce92af');

	beforeEach(() => {
		// Arrange
		chainStub = {
			slots: new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME }) as any,
			dataAccess: {
				getBlockHeadersByHeightBetween: jest.fn().mockResolvedValue([]),
				getConsensusState: jest.fn().mockResolvedValue(undefined),
				getDelegateAccounts: jest.fn().mockResolvedValue([]),
				getDelegates: jest.fn().mockResolvedValue([]),
			},
		};

		dpos = new Dpos({
			chain: chainStub,
		});

		stateStore = new StateStoreMock([...delegateAccounts], {});

		jest
			.spyOn(randomSeedModule, 'generateRandomSeeds')
			.mockReturnValue([randomSeed1, randomSeed2]);
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
				seedReveal: '',
				transactions: [],
			} as Block;

			stateStore = new StateStoreMock([generator, ...delegateAccounts], {});
		});

		it('should save round 1 + round offset vote weight list in the consensus state', async () => {
			// Act
			await dpos.apply(genesisBlock, stateStore);

			// Assert
			expect(chainStub.dataAccess.getDelegates).toHaveBeenCalledTimes(
				1 + DELEGATE_LIST_ROUND_OFFSET,
			);
			const voteWeightsStr = await stateStore.consensus.get(
				CONSENSUS_STATE_VOTE_WEIGHTS_KEY,
			);
			const voteWeights = JSON.parse(voteWeightsStr as string);
			expect(voteWeights).toHaveLength(1 + DELEGATE_LIST_ROUND_OFFSET);
			expect(voteWeights[0].round).toEqual(1);
			expect(voteWeights[1].round).toEqual(2);
			expect(voteWeights[2].round).toEqual(3);
		});

		it('should save round 1 forger list in the consensus state', async () => {
			// Act
			await dpos.apply(genesisBlock, stateStore);

			// Assert
			const forgersListStr = await stateStore.consensus.get(
				CONSENSUS_STATE_FORGERS_LIST_KEY,
			);
			const forgersList = JSON.parse(forgersListStr as string);
			expect(forgersList).toHaveLength(1);
			expect(forgersList[0].round).toEqual(1);
		});

		it('should resolve with "false"', async () => {
			// Act
			const result = await dpos.apply(genesisBlock, stateStore);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('Given block is NOT the last block of the round', () => {
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
					delegates: delegateAccounts.map(d => d.address),
					standby: [],
				},
				{
					round: 2,
					delegates: delegateAccounts.map(d => d.address),
					standby: [],
				},
			];
			const delegates = getDelegateAccountsWithVotesReceived(103);

			stateStore = new StateStoreMock([generator, ...delegates], {
				[CONSENSUS_STATE_FORGERS_LIST_KEY]: JSON.stringify(forgersList),
			});
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
			const consensusState = await stateStore.consensus.get(
				CONSENSUS_STATE_FORGERS_LIST_KEY,
			);
			expect(consensusState).toEqual(JSON.stringify(forgersList));
		});
	});

	describe('Given block is the last block of the round', () => {
		let lastBlockOfTheRoundNine: Block;
		let forgedDelegates: Account[];
		let missedDelegate: Account;

		beforeEach(() => {
			forgedDelegates = getDelegateAccountsWithVotesReceived(
				ACTIVE_DELEGATES + STANDBY_DELEGATES - 1,
			);
			// Make 1 delegate forge twice
			forgedDelegates.push({ ...forgedDelegates[10] });
			[missedDelegate] = getDelegateAccountsWithVotesReceived(1);
			stateStore = new StateStoreMock([...forgedDelegates, missedDelegate], {
				[CONSENSUS_STATE_VOTE_WEIGHTS_KEY]: JSON.stringify([
					{
						round: 10,
						delegates: forgedDelegates.map(d => ({
							address: d.address,
							voteWeight: d.totalVotesReceived.toString(),
						})),
					},
				]),
				[CONSENSUS_STATE_FORGERS_LIST_KEY]: JSON.stringify([
					{
						round: 7,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
					},
					{
						round: 8,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
					},
					{
						round: 9,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
					},
					{
						round: 10,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
					},
				]),
			});

			const forgedBlocks = forgedDelegates.map((delegate, i) => ({
				generatorPublicKey: delegate.publicKey,
				height: 825 + i,
			}));
			forgedBlocks.splice(forgedBlocks.length - 1);

			lastBlockOfTheRoundNine = {
				height: 927,
				generatorPublicKey:
					forgedDelegates[forgedDelegates.length - 1].publicKey,
			} as Block;

			chainStub.dataAccess.getBlockHeadersByHeightBetween.mockReturnValue(
				forgedBlocks,
			);
		});

		it('should increase "missedBlocks" field by "1" for the delegates who did not forge in the round', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRoundNine, stateStore);

			// Assert
			const { missedBlocks } = await stateStore.account.get(
				missedDelegate.address,
			);
			expect(missedBlocks).toEqual(1);
		});

		it('should save next round forgers in frogers list after applying last block of round', async () => {
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
			const forgersListStr = await stateStore.consensus.get(
				CONSENSUS_STATE_FORGERS_LIST_KEY,
			);
			const forgersList: ForgersList = JSON.parse(forgersListStr as string);

			const forgers = forgersList.find(fl => fl.round === nextRound);

			expect(forgers?.round).toEqual(nextRound);
		});

		it('should delete forgers list older than (finalizedBlockRound - 2)', async () => {
			// Arrange
			const finalizedBlockHeight = 1237;
			const finalizedBlockRound = Math.ceil(
				finalizedBlockHeight / (ACTIVE_DELEGATES + STANDBY_DELEGATES),
			);
			const bftRoundOffset = 2; // TODO: get from BFT constants
			const delegateActiveRoundLimit = 3;
			const expectedRound =
				finalizedBlockRound - bftRoundOffset - delegateActiveRoundLimit;

			// Check before finalize exist for test
			const forgersListBeforeStr = await stateStore.consensus.get(
				CONSENSUS_STATE_FORGERS_LIST_KEY,
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

			const forgersListStr = await stateStore.consensus.get(
				CONSENSUS_STATE_FORGERS_LIST_KEY,
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
			const oldRound =
				lastBlockOfTheRoundNine.height / (ACTIVE_DELEGATES + STANDBY_DELEGATES);
			(dpos as any).events.on(constants.EVENT_ROUND_CHANGED, eventCallback);

			// Act
			await dpos.apply(lastBlockOfTheRoundNine, stateStore);

			// Assert
			expect(eventCallback).toHaveBeenCalledWith({
				oldRound,
				newRound: oldRound + 1,
			});
		});

		it('should call generateRandomSeeds to get random seeds', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRoundNine, stateStore);

			// Assert
			expect(randomSeedModule.generateRandomSeeds).toHaveBeenCalledTimes(1);
			expect(randomSeedModule.generateRandomSeeds).toHaveBeenCalledWith(
				9,
				dpos.rounds,
				expect.anything(),
			);
		});

		describe('When all delegates successfully forges a block', () => {
			it('should NOT update "missedBlocks" for anyone', async () => {
				// Arrange
				const forgedDelegates = getDelegateAccounts(103);
				const forgedBlocks = forgedDelegates.map((delegate, i) => ({
					generatorPublicKey: delegate.publicKey,
					height: 809 + i,
				}));
				forgedBlocks.splice(forgedBlocks.length - 1);

				chainStub.dataAccess.getBlockHeadersByHeightBetween.mockReturnValue(
					forgedBlocks,
				);

				// Act
				await dpos.apply(lastBlockOfTheRoundNine, stateStore);
				expect.assertions(forgedDelegates.length);
				for (const delegate of forgedDelegates) {
					expect(delegate.missedBlocks).toEqual(0);
				}
			});
		});
	});
});
