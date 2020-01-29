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
import { Dpos } from '../../src';
import { Slots } from '../../../lisk-blocks/src/slots';
import {
	DELEGATE_LIST_ROUND_OFFSET,
	ACTIVE_DELEGATES,
	EPOCH_TIME,
	BLOCK_TIME,
} from '../fixtures/constants';
import { generateDelegateLists } from '../utils/delegates';

const roundsDelegatesGetResolves = (lists: any, { stubs, limit }: any) => {
	when(stubs.storage.entities.RoundDelegates.get)
		.calledWith(
			{},
			{
				sort: 'round:desc',
				limit,
			},
			stubs.tx,
		)
		.mockReturnValue(lists.slice(0, limit));
};

describe('dpos.getMinActiveHeightsOfDelegates()', () => {
	const stubs = {} as any;
	let dpos: Dpos;
	const delegateListRoundOffset = DELEGATE_LIST_ROUND_OFFSET;

	beforeEach(() => {
		// Arrange
		stubs.storage = {
			entities: {
				RoundDelegates: {
					get: jest.fn(),
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
			...stubs,
			blocks,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset,
		});
	});

	describe('Given roundDelegates entity returns empty results', () => {
		it('should throw exception', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			when(stubs.storage.entities.RoundDelegates.get)
				.calledWith(
					{},
					{
						sort: 'round:desc',
						limit,
					},
					stubs.tx,
				)
				.mockReturnValue([]);

			// Act
			await expect(
				dpos.getMinActiveHeightsOfDelegates(numberOfRounds, {
					tx: stubs.tx,
				}),
			).rejects.toThrow('No delegate list found in the database.');
		});
	});

	describe('Given number of requested rounds is bigger than active round', () => {
		it('should throw exception', async () => {
			// Arrange
			const numberOfRounds = 3;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const lists = [
				{ round: 2, delegatePublicKeys: ['x', 'b', 'c'] },
				{ round: 1, delegatePublicKeys: ['a', 'k', 'm'] },
			];

			when(stubs.storage.entities.RoundDelegates.get)
				.calledWith(
					{},
					{
						sort: 'round:desc',
						limit,
					},
					stubs.tx,
				)
				.mockReturnValue(lists);

			// Act
			await expect(
				dpos.getMinActiveHeightsOfDelegates(numberOfRounds, {
					tx: stubs.tx,
				}),
			).rejects.toThrow(
				'Number of rounds requested is higher than number of existing rounds.',
			);
		});
	});

	describe('Given delegate "x" was continuously active more than 4 rounds', () => {
		it('should return the first block height of the 4th round', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const activeRounds = [15, 14, 13, 12, 11, 10];
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				12,
			);

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
				delegateListRoundOffset,
			});
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'a', 'b']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});
	});

	describe('Given delegate "x" was continuously active in last 4 rounds', () => {
		it('should return the first block height of the 4th round', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const activeRounds = [15, 14, 13, 12, 10];
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				12,
			);

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
				delegateListRoundOffset,
			});
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'a', 'b']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});
	});

	describe('Given delegate "x" was continuously active in last 3 rounds', () => {
		it('should return the first block height of the 3rd round', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const activeRounds = [15, 14, 13, 11, 10];
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				13,
			);

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
				delegateListRoundOffset,
			});
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'a', 'b']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});
	});

	describe('Given delegate "x" was continuously active in last 2 rounds', () => {
		it('should return the first block height of the 2nd round', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const activeRounds = [15, 14, 12, 11, 10];
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				14,
			);

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
				delegateListRoundOffset,
			});
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'a', 'b']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});
	});

	describe('Given delegate "x" was only active in last round', () => {
		it('should return the first block height of the last round', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const activeRounds = [15, 13, 12, 11, 10];
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				15,
			);

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
				delegateListRoundOffset,
			});
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'a', 'b']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});
	});

	describe('Given number of requested rounds is more than one', () => {
		it('should return min height values for each round (numberOfRounds=2)', async () => {
			// Arrange
			const numberOfRounds = 2;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const activeRounds = [15, 14, 13, 12, 11, 10];
			const expectedActiveMinHeights = [
				(dpos as any).rounds.calcRoundStartHeight(12),
				(dpos as any).rounds.calcRoundStartHeight(11),
			];

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
				delegateListRoundOffset,
			});
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'a', 'b']);
			expect(minActiveHeights[publicKey]).toEqual(expectedActiveMinHeights);
		});

		it('should return min height values for each round (numberOfRounds = 3)', async () => {
			// Arrange
			const numberOfRounds = 3;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const activeRounds = [15, 14, 13, 12, 11, 10, 9, 8];
			const expectedActiveMinHeights = [
				dpos.rounds.calcRoundStartHeight(12),
				dpos.rounds.calcRoundStartHeight(11),
				dpos.rounds.calcRoundStartHeight(10),
			];

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
				delegateListRoundOffset,
			});
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'a', 'b']);
			expect(minActiveHeights[publicKey]).toEqual(expectedActiveMinHeights);
		});

		describe('Given multiple delegates change between the rounds', () => {
			it('should return min height values for each round and each delegate (numberOfRounds = 2)', async () => {
				// Arrange
				const numberOfRounds = 3;
				const limit =
					numberOfRounds +
					(dpos as any).delegateActiveRoundLimit +
					delegateListRoundOffset;

				const baseList = generateDelegateLists({
					publicKey: 'x',
					activeRounds: [15, 14, 12, 11],
					delegateListRoundOffset,
				});
				const expectedActiveMinHeightsForX = [
					(dpos as any).rounds.calcRoundStartHeight(14),
				];
				const lists = generateDelegateLists(
					{
						publicKey: 'y',
						activeRounds: [15, 14, 13, 12, 11],
						delegateListRoundOffset,
					},
					baseList,
				);
				const expectedActiveMinHeightsForY = [
					(dpos as any).rounds.calcRoundStartHeight(12),
					(dpos as any).rounds.calcRoundStartHeight(11),
				];

				roundsDelegatesGetResolves(lists, { stubs, limit });

				// Act
				const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
					numberOfRounds,
					{
						tx: stubs.tx,
					},
				);
				// Assert
				expect(Object.keys(minActiveHeights)).toEqual(['y', 'x', 'a', 'b']);
				expect(minActiveHeights.x).toEqual(expectedActiveMinHeightsForX);
				expect(minActiveHeights.y).toEqual(expectedActiveMinHeightsForY);
			});
		});
	});

	describe('Given blockchain just started and the first list is being used couple of times', () => {
		it('should return the first block height of 1st round for activeRound = 1', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				1,
			);

			const lists = [{ round: 1, delegatePublicKeys: ['x', 'b', 'c'] }];
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'b', 'c']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});
		it('should return the first block height of 1st round for activeRound = 2', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				1,
			);

			const lists = [
				{ round: 2, delegatePublicKeys: ['a', 'b', 'c'] },
				{ round: 1, delegatePublicKeys: ['x', 'b', 'c'] },
			];
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'b', 'c']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of 1st round for activeRound = 3', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				1,
			);

			const lists = [
				{ round: 3, delegatePublicKeys: ['d', 'e', 'f'] },
				{ round: 2, delegatePublicKeys: ['a', 'b', 'c'] },
				{ round: 1, delegatePublicKeys: ['x', 'b', 'c'] },
			];
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'b', 'c']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of first round for activeRound = 4', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				1,
			);

			const lists = [
				{ round: 4, delegatePublicKeys: ['a', 'e', 'f'] },
				{ round: 3, delegatePublicKeys: ['d', 'e', 'f'] },
				{ round: 2, delegatePublicKeys: ['x', 'b', 'c'] },
				{ round: 1, delegatePublicKeys: ['x', 'k', 'm'] },
			];
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'b', 'c']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of the 2nd round for activeRound = 5', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				2,
			);

			const lists = [
				{ round: 5, delegatePublicKeys: ['a', 'e', 'f'] },
				{ round: 4, delegatePublicKeys: ['a', 'e', 'f'] },
				{ round: 3, delegatePublicKeys: ['x', 'e', 'f'] },
				{ round: 2, delegatePublicKeys: ['x', 'b', 'c'] },
				{ round: 1, delegatePublicKeys: ['x', 'k', 'm'] },
			];
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'e', 'f']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of the 3rd round for activeRound = 6', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				3,
			);

			const lists = [
				{ round: 6, delegatePublicKeys: ['a', 'e', 'f'] },
				{ round: 5, delegatePublicKeys: ['a', 'e', 'f'] },
				{ round: 4, delegatePublicKeys: ['x', 'e', 'd'] },
				{ round: 3, delegatePublicKeys: ['x', 'e', 'f'] },
				{ round: 2, delegatePublicKeys: ['x', 'b', 'c'] },
				{ round: 1, delegatePublicKeys: ['x', 'k', 'm'] },
			];
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'e', 'd']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of 4th round when delegate was not in the first list  (activeRound = 4)', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				4,
			);

			const lists = [
				{ round: 4, delegatePublicKeys: ['a', 'e', 'f'] },
				{ round: 3, delegatePublicKeys: ['d', 'e', 'f'] },
				{ round: 2, delegatePublicKeys: ['x', 'b', 'c'] },
				{ round: 1, delegatePublicKeys: ['a', 'k', 'm'] },
			];
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'b', 'c']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of 4th round when delegate was not in the first list (activeRound = 5)', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				4,
			);

			const lists = [
				{ round: 5, delegatePublicKeys: ['a', 'e', 'f'] },
				{ round: 4, delegatePublicKeys: ['a', 'e', 'f'] },
				{ round: 3, delegatePublicKeys: ['x', 'e', 'f'] },
				{ round: 2, delegatePublicKeys: ['x', 'b', 'c'] },
				{ round: 1, delegatePublicKeys: ['a', 'k', 'm'] },
			];
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'e', 'f']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of 4th round when delegate was not in the first list (activeRound = 6)', async () => {
			// Arrange
			const numberOfRounds = 1;
			const limit =
				numberOfRounds +
				(dpos as any).delegateActiveRoundLimit +
				delegateListRoundOffset;

			const publicKey = 'x';
			const expectedActiveMinHeight = (dpos as any).rounds.calcRoundStartHeight(
				4,
			);

			const lists = [
				{ round: 6, delegatePublicKeys: ['a', 'e', 'f'] },
				{ round: 5, delegatePublicKeys: ['a', 'e', 'f'] },
				{ round: 4, delegatePublicKeys: ['x', 'e', 'f'] },
				{ round: 3, delegatePublicKeys: ['x', 'e', 'f'] },
				{ round: 2, delegatePublicKeys: ['x', 'b', 'c'] },
				{ round: 1, delegatePublicKeys: ['a', 'k', 'm'] },
			];
			roundsDelegatesGetResolves(lists, { stubs, limit });

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				numberOfRounds,
				{
					tx: stubs.tx,
				},
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'e', 'f']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});
	});
});
