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
import { codec } from '@liskhq/lisk-codec';
import { voteWeightsSchema, forgerListSchema } from '../../src/schemas';
import { Dpos, constants } from '../../src';
import {
	ACTIVE_DELEGATES,
	BLOCK_TIME,
	DELEGATE_LIST_ROUND_OFFSET,
	STANDBY_DELEGATES,
} from '../fixtures/constants';
import { getDelegateAccountsWithVotesReceived } from '../utils/round_delegates';
import { BlockHeader, Account } from '../../src/types';
import { StateStoreMock } from '../utils/state_store_mock';
import {
	CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
	CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
} from '../../src/constants';

const MS_IN_A_SEC = 1000;
const GENESIS_BLOCK_TIMESTAMP =
	new Date(Date.UTC(2020, 5, 15, 0, 0, 0, 0)).getTime() / MS_IN_A_SEC;

describe('dpos.undo()', () => {
	const delegateAccounts = getDelegateAccountsWithVotesReceived(
		ACTIVE_DELEGATES + STANDBY_DELEGATES,
	);

	const defaultLastBlockHeader = { timestamp: 123 } as BlockHeader;

	let dpos: Dpos;
	let chainStub: any;
	let stateStore: StateStoreMock;

	beforeEach(() => {
		// Arrange
		chainStub = {
			slots: new Slots({
				genesisBlockTimestamp: GENESIS_BLOCK_TIMESTAMP,
				interval: BLOCK_TIME,
			}) as any,
			dataAccess: {
				getBlockHeadersByHeightBetween: jest.fn().mockResolvedValue([]),
				getConsensusState: jest.fn().mockResolvedValue(undefined),
			},
		};

		dpos = new Dpos({
			chain: chainStub,
		});
		stateStore = new StateStoreMock(
			[...delegateAccounts],
			{},
			{ lastBlockHeaders: [defaultLastBlockHeader] },
		);
	});

	describe('Given block is the genesis block (height === 1)', () => {
		let genesisBlock: BlockHeader;
		let generator: Account;

		beforeEach(() => {
			generator = { ...delegateAccounts[0] };
			// Arrange
			genesisBlock = {
				height: 1,
			} as BlockHeader;
			stateStore = new StateStoreMock(
				[generator, ...delegateAccounts],
				{},
				{ lastBlockHeaders: [defaultLastBlockHeader] },
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
		let generator: Account;
		let block: BlockHeader;

		beforeEach(() => {
			// Arrange
			generator = { ...delegateAccounts[0] };

			block = {
				height: 2,
				generatorPublicKey: generator.publicKey,
			} as BlockHeader;

			const forgerListObject = {
				forgersList: [
					{
						round: 1,
						delegates: delegateAccounts.map(d => d.address),
						standby: [],
					},
				],
			};

			const forgersListBinary = codec.encode(
				forgerListSchema,
				forgerListObject,
			);

			stateStore = new StateStoreMock(
				[generator, ...delegateAccounts],
				{
					[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: forgersListBinary,
				},
				{ lastBlockHeaders: [defaultLastBlockHeader] },
			);
		});

		it('should NOT update "missedBlocks"', async () => {
			// Act
			await dpos.undo(block, stateStore);

			const account = await stateStore.account.get(generator.address);
			// Assert
			expect(account.asset.delegate.consecutiveMissedBlocks).toEqual(
				generator.asset.delegate.consecutiveMissedBlocks,
			);
		});

		it('should NOT delete forgers list for rounds which are after the current round', async () => {
			// Act
			await dpos.undo(block, stateStore);

			const consensusState = await stateStore.consensus.get(
				CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
			);
			const { forgersList } = codec.decode(
				forgerListSchema,
				consensusState as Buffer,
			);

			expect(forgersList).toHaveLength(1);
		});
	});

	describe('Given block is the last block of the round', () => {
		let lastBlockOfTheRoundNine: BlockHeader;
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
			const delegateWeightsObject = {
				voteWeights: [
					{
						round: 10,
						delegates: forgedDelegates.map(d => ({
							address: d.address,
							voteWeight: BigInt(d.asset.delegate.totalVotesReceived),
						})),
					},
				],
			};

			const encodedDelegateVoteWeights = codec.encode(
				voteWeightsSchema,
				delegateWeightsObject,
			);

			const forgerListObject = {
				forgersList: [
					{
						round: 8,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
						standby: [],
					},
					{
						round: 9,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
						standby: [],
					},
					{
						round: 10,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
						standby: [],
					},
					{
						round: 11,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
						standby: [],
					},
					{
						round: 12,
						delegates: [
							...forgedDelegates.map(d => d.address),
							missedDelegate.address,
						],
						standby: [],
					},
				],
			};

			const forgersListBinary = codec.encode(
				forgerListSchema,
				forgerListObject,
			);

			stateStore = new StateStoreMock(
				[...forgedDelegates, missedDelegate],
				{
					[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: encodedDelegateVoteWeights,
					[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: forgersListBinary,
				},
				{ lastBlockHeaders: [defaultLastBlockHeader] },
			);

			lastBlockOfTheRoundNine = {
				height: 927,
				generatorPublicKey:
					forgedDelegates[forgedDelegates.length - 1].publicKey,
			} as BlockHeader;
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
			const account = await stateStore.account.get(missedDelegate.address);
			expect(account.asset.delegate.consecutiveMissedBlocks).toEqual(
				missedDelegate.asset.delegate.consecutiveMissedBlocks,
			);
		});

		it('should delete vote weights for rounds which are after the current', async () => {
			// Arrange
			const roundNo = dpos.rounds.calcRound(lastBlockOfTheRoundNine.height);

			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			// Assert
			const consensusState = await stateStore.consensus.get(
				CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
			);

			const { voteWeights } = codec.decode(
				voteWeightsSchema,
				consensusState as Buffer,
			);

			const filteredVoteWeights = voteWeights.filter(
				(fl: { round: number }) =>
					fl.round > roundNo + DELEGATE_LIST_ROUND_OFFSET,
			);
			expect(filteredVoteWeights).toHaveLength(0);
		});

		it('should delete forgers list for rounds which are after the current', async () => {
			// Arrange
			const roundNo = dpos.rounds.calcRound(lastBlockOfTheRoundNine.height);

			// Act
			await dpos.undo(lastBlockOfTheRoundNine, stateStore);

			// Assert
			const consensusState = await stateStore.consensus.get(
				CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
			);

			const { forgersList } = codec.decode(
				forgerListSchema,
				consensusState as Buffer,
			);

			const filteredList = forgersList.filter(
				(fl: { round: number }) => fl.round > roundNo,
			);

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

				const delegateWeightsObject = {
					voteWeights: [
						{
							round: 10,
							delegates: forgedDelegates.map(d => ({
								address: d.address,
								voteWeight: BigInt(d.asset.delegate.totalVotesReceived),
							})),
						},
					],
				};

				const encodedDelegateVoteWeights = codec.encode(
					voteWeightsSchema,
					delegateWeightsObject,
				);

				const forgerListObject = {
					forgersList: [
						{
							round: 8,
							delegates: [...forgedDelegates.map(d => d.address)],
							standby: [],
						},
						{
							round: 9,
							delegates: [...forgedDelegates.map(d => d.address)],
							standby: [],
						},
						{
							round: 10,
							delegates: [...forgedDelegates.map(d => d.address)],
							standby: [],
						},
						{
							round: 11,
							delegates: [...forgedDelegates.map(d => d.address)],
							standby: [],
						},
						{
							round: 12,
							delegates: [...forgedDelegates.map(d => d.address)],
							standby: [],
						},
					],
				};

				const forgersListBinary = codec.encode(
					forgerListSchema,
					forgerListObject,
				);

				stateStore = new StateStoreMock(
					[...forgedDelegates],
					{
						[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: encodedDelegateVoteWeights,
						[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: forgersListBinary,
					},
					{ lastBlockHeaders: [defaultLastBlockHeader] },
				);

				lastBlockOfTheRoundNine = {
					height: 927,
					generatorPublicKey:
						forgedDelegates[forgedDelegates.length - 1].publicKey,
				} as BlockHeader;
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
					expect(account.asset.delegate.consecutiveMissedBlocks).toEqual(
						delegate.asset.delegate.consecutiveMissedBlocks,
					);
				}
			});
		});
	});
});
