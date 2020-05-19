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

import { Slots } from '@liskhq/lisk-chain';
import { Dpos, constants } from '../../src';
import {
	EPOCH_TIME,
	ACTIVE_DELEGATES,
	BLOCK_TIME,
	DELEGATE_LIST_ROUND_OFFSET,
	STANDBY_DELEGATES,
} from '../fixtures/constants';
import { getDelegateAccountsWithVotesReceived } from '../utils/round_delegates';
import { Block, Account, ForgersList } from '../../src/types';
import { StateStoreMock } from '../utils/state_store_mock';
import {
	CONSENSUS_STATE_FORGERS_LIST,
	CONSENSUS_STATE_VOTE_WEIGHTS,
} from '../../src/constants';

describe('dpos.undo()', () => {
	const delegateAccounts = getDelegateAccountsWithVotesReceived(
		ACTIVE_DELEGATES + STANDBY_DELEGATES,
	);

	let dpos: Dpos;
	let chainStub: any;
	let stateStore: StateStoreMock;

	beforeEach(() => {
		// Arrange
		chainStub = {
			slots: new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME }) as any,
			dataAccess: {
				getBlockHeadersByHeightBetween: jest.fn().mockResolvedValue([]),
				getConsensusState: jest.fn().mockResolvedValue(undefined),
			},
		};

		dpos = new Dpos({
			chain: chainStub,
		});
		stateStore = new StateStoreMock([...delegateAccounts], {});
	});

	describe('Given block is the genesis block (height === 1)', () => {
		let genesisBlock: Block;
		let generator: Account;

		beforeEach(() => {
			generator = { ...delegateAccounts[0] };
			// Arrange
			genesisBlock = {
				height: 1,
			} as Block;
			stateStore = new StateStoreMock([generator, ...delegateAccounts], {});
		});

		it('should throw exception and NOT update "producedBlocks", "missedBlocks", "rewards", "fees", "votes"', async () => {
			// Act && Assert
			await expect(dpos.undo(genesisBlock, stateStore)).rejects.toThrow(
				'Cannot undo genesis block',
			);
		});
	});

	describe('Given block is NOT the last block of the round', () => {
		let generator: Account;
		let block: Block;

		beforeEach(() => {
			// Arrange
			generator = { ...delegateAccounts[0] };
			block = {
				height: 2,
				generatorPublicKey: generator.publicKey,
			} as Block;
			stateStore = new StateStoreMock([generator, ...delegateAccounts], {
				[CONSENSUS_STATE_FORGERS_LIST]: JSON.stringify([
					{
						round: 1,
						delegates: delegateAccounts.map(d => d.address),
						standy: [],
					},
				]),
			});
		});

		it('should NOT update "missedBlocks"', async () => {
			// Act
			await dpos.undo(block, stateStore);

			const account = await stateStore.account.get(generator.address);
			// Assert
			expect(account.missedBlocks).toEqual(generator.missedBlocks);
			expect(account.rewards).toEqual(generator.rewards);
			expect(account.fees).toEqual(generator.fees);
		});

		it('should NOT delete forgers list for rounds which are after the current round', async () => {
			// Act
			await dpos.undo(block, stateStore);

			const consensusState = await stateStore.consensus.get(
				CONSENSUS_STATE_FORGERS_LIST,
			);
			const res = JSON.parse(consensusState as string);

			expect(res).toHaveLength(1);
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
			// Arrange
			stateStore = new StateStoreMock([...forgedDelegates, missedDelegate], {
				[CONSENSUS_STATE_VOTE_WEIGHTS]: JSON.stringify([
					{
						round: 10,
						delegates: forgedDelegates.map(d => ({
							address: d.address,
							voteWeight: d.totalVotesReceived.toString(),
						})),
					},
				]),
				[CONSENSUS_STATE_FORGERS_LIST]: JSON.stringify([
					{
						round: 8,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
						standy: [],
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
					{
						round: 11,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
					},
					{
						round: 12,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
					},
				]),
			});

			lastBlockOfTheRoundNine = {
				height: 927,
				generatorPublicKey:
					forgedDelegates[forgedDelegates.length - 1].publicKey,
			} as Block;
			const forgedBlocks = forgedDelegates.map((delegate, i) => ({
				generatorPublicKey: delegate.publicKey,
				height: 825 + i,
			}));

			forgedBlocks.splice(forgedBlocks.length - 1);

			chainStub.dataAccess.getBlockHeadersByHeightBetween.mockReturnValue(
				forgedBlocks,
			);
		});

		it('should decrease "missedBlocks" field by "1" for the delegates who did not forge in the round', async () => {
			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			// Assert
			const { missedBlocks } = await stateStore.account.get(
				missedDelegate.address,
			);
			expect(missedBlocks).toEqual(missedDelegate.missedBlocks - 1);
		});

		it('should delete vote weights for rounds which are after the current', async () => {
			// Arrange
			const roundNo = dpos.rounds.calcRound(lastBlockOfTheRoundNine.height);

			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			// Assert
			const consensusState =
				(await stateStore.consensus.get(CONSENSUS_STATE_VOTE_WEIGHTS)) ?? '[]';
			const voteWeights = JSON.parse(consensusState) as ForgersList;
			const filteredVoteWeights = voteWeights.filter(
				fl => fl.round > roundNo + DELEGATE_LIST_ROUND_OFFSET,
			);
			expect(filteredVoteWeights).toHaveLength(0);
		});

		it('should delete forgers list for rounds which are after the current', async () => {
			// Arrange
			const roundNo = dpos.rounds.calcRound(lastBlockOfTheRoundNine.height);

			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			// Assert
			const consensusState =
				(await stateStore.consensus.get(CONSENSUS_STATE_FORGERS_LIST)) ?? '[]';
			const forgersList = JSON.parse(consensusState) as ForgersList;
			const filteredList = forgersList.filter(fl => fl.round > roundNo);
			expect(filteredList).toHaveLength(0);
		});

		it('should should emit EVENT_ROUND_CHANGED', async () => {
			// Arrange
			const eventCallbackStub = jest.fn();
			const newRound =
				lastBlockOfTheRoundNine.height / (ACTIVE_DELEGATES + STANDBY_DELEGATES);
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
				forgedDelegates = getDelegateAccountsWithVotesReceived(
					ACTIVE_DELEGATES + STANDBY_DELEGATES,
				);
				stateStore = new StateStoreMock([...forgedDelegates], {
					[CONSENSUS_STATE_VOTE_WEIGHTS]: JSON.stringify([
						{
							round: 10,
							delegates: forgedDelegates.map(d => ({
								address: d.address,
								voteWeight: d.totalVotesReceived.toString(),
							})),
						},
					]),
					[CONSENSUS_STATE_FORGERS_LIST]: JSON.stringify([
						{
							round: 8,
							delegates: [...forgedDelegates.map(d => d.address)],
							standy: [],
						},
						{
							round: 9,
							delegates: [...forgedDelegates.map(d => d.address)],
						},
						{
							round: 10,
							delegates: [...forgedDelegates.map(d => d.address)],
						},
						{
							round: 11,
							delegates: [...forgedDelegates.map(d => d.address)],
						},
						{
							round: 12,
							delegates: [...forgedDelegates.map(d => d.address)],
						},
					]),
				});
				lastBlockOfTheRoundNine = {
					height: 927,
					generatorPublicKey:
						forgedDelegates[forgedDelegates.length - 1].publicKey,
				} as Block;
				const forgedBlocks = forgedDelegates.map((delegate, i) => ({
					generatorPublicKey: delegate.publicKey,
					height: 825 + i,
				}));

				forgedBlocks.splice(forgedBlocks.length - 1);

				chainStub.dataAccess.getBlockHeadersByHeightBetween.mockReturnValue(
					forgedBlocks,
				);
				// Act
				await dpos.undo(lastBlockOfTheRoundNine, stateStore);

				for (const delegate of forgedDelegates) {
					const account = await stateStore.account.get(delegate.address);
					expect(account.missedBlocks).toEqual(delegate.missedBlocks);
				}
			});
		});
	});
});
