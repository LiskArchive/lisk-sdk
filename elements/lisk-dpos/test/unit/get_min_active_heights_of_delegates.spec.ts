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

// import { when } from 'jest-when';
import { Dpos } from '../../src';
import { Slots } from '@liskhq/lisk-chain';
import {
	DELEGATE_LIST_ROUND_OFFSET,
	ACTIVE_DELEGATES,
	EPOCH_TIME,
	BLOCK_TIME,
} from '../fixtures/constants';
import { generateDelegateLists } from '../utils/delegates';
import { StateStoreMock } from '../utils/state_store_mock';
import { CHAIN_STATE_FORGERS_LIST_KEY } from '../../src/constants';
import { ForgersList } from '../../src/types';

const createStateStore = (list: ForgersList = []) => {
	return new StateStoreMock([], {
		[CHAIN_STATE_FORGERS_LIST_KEY]: JSON.stringify(list),
	});
};

describe('dpos.getMinActiveHeightsOfDelegates()', () => {
	let dpos: Dpos;
	let height: number;
	const delegateListRoundOffset = DELEGATE_LIST_ROUND_OFFSET;

	beforeEach(() => {
		// Arrange
		const slots = new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME });
		const chain = {
			slots,
		};

		dpos = new Dpos({
			chain: chain as any,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset,
		});

		// Last block of round 15 to be default as most of the test expects to be 15th round
		height = 15 * ACTIVE_DELEGATES;
	});

	describe('Given empty forgers list', () => {
		it('should throw exception', async () => {
			// Arrange
			const numberOfRounds = 1;
			// Act
			await expect(
				dpos.getMinActiveHeightsOfDelegates(
					height,
					createStateStore(),
					numberOfRounds,
				),
			).rejects.toThrow('No delegate list found in the database.');
		});
	});

	describe('Given number of requested rounds is bigger than active round', () => {
		it('should throw exception', async () => {
			// Arrange
			const numberOfRounds = 3;
			const lists = [
				{ round: 2, delegates: ['x', 'b', 'c'] },
				{ round: 1, delegates: ['a', 'k', 'm'] },
			];

			height = 2 * ACTIVE_DELEGATES;

			// Act
			await expect(
				dpos.getMinActiveHeightsOfDelegates(
					height,
					createStateStore(lists),
					numberOfRounds,
				),
			).rejects.toThrow(
				'Number of rounds requested is higher than number of existing rounds.',
			);
		});
	});

	describe('Given delegate "x" was continuously active more than 4 rounds', () => {
		it('should return the first block height of the 4th round', async () => {
			// Arrange
			const numberOfRounds = 1;
			const publicKey = 'x';
			const activeRounds = [17, 16, 15, 14, 13, 12, 11, 10];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(12);

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
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
			const publicKey = 'x';
			const activeRounds = [17, 16, 15, 14, 13, 12, 10];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(12);

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
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
			const publicKey = 'x';
			const activeRounds = [17, 16, 15, 14, 13, 11, 10];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(13);

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
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
			const publicKey = 'x';
			const activeRounds = [17, 16, 15, 14, 12, 11, 10];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(14);

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
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

			const publicKey = 'x';
			const activeRounds = [17, 16, 15, 13, 12, 11, 10];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(15);

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
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
			const publicKey = 'x';
			const activeRounds = [17, 16, 15, 14, 13, 12, 11, 10];
			const expectedActiveMinHeights = [
				dpos.rounds.calcRoundStartHeight(12),
				dpos.rounds.calcRoundStartHeight(11),
			];

			// This is last block of round 15
			height = 15 * ACTIVE_DELEGATES;

			const lists = generateDelegateLists({
				publicKey,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'a', 'b']);
			expect(minActiveHeights[publicKey]).toEqual(expectedActiveMinHeights);
		});

		it('should return min height values for each round (numberOfRounds = 3)', async () => {
			// Arrange
			const numberOfRounds = 3;
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
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'a', 'b']);
			expect(minActiveHeights[publicKey]).toEqual(expectedActiveMinHeights);
		});

		describe('Given multiple delegates change between the rounds', () => {
			it('should return min height values for each round and each delegate (numberOfRounds = 2)', async () => {
				// Arrange
				const numberOfRounds = 3;
				const baseList = generateDelegateLists({
					publicKey: 'x',
					activeRounds: [15, 14, 12, 11],
				});
				const expectedActiveMinHeightsForX = [
					(dpos as any).rounds.calcRoundStartHeight(14),
				];
				const lists = generateDelegateLists(
					{
						publicKey: 'y',
						activeRounds: [15, 14, 13, 12, 11],
					},
					baseList,
				);
				const expectedActiveMinHeightsForY = [
					(dpos as any).rounds.calcRoundStartHeight(12),
					(dpos as any).rounds.calcRoundStartHeight(11),
				];

				// Act
				const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
					height,
					createStateStore(lists),
					numberOfRounds,
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
			const publicKey = 'x';
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(1);

			const lists: ForgersList = [
				{ round: 3, delegates: ['x', 'b', 'c'] },
				{ round: 2, delegates: ['x', 'b', 'c'] },
				{ round: 1, delegates: ['x', 'b', 'c'] },
			];
			// Height in first round
			height = 50;

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'b', 'c']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of 1st round for activeRound = 2', async () => {
			// Arrange
			const numberOfRounds = 1;
			const publicKey = 'x';
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(1);

			const lists: ForgersList = [
				{ round: 4, delegates: ['n', 'o', 'p'] },
				{ round: 3, delegates: ['x', 'b', 'c'] },
				{ round: 2, delegates: ['x', 'b', 'c'] },
				{ round: 1, delegates: ['x', 'b', 'c'] },
			];
			// Height in second round
			height = 202;

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'b', 'c']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of 1st round for activeRound = 3', async () => {
			// Arrange
			const numberOfRounds = 1;
			const publicKey = 'x';
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(1);

			const lists: ForgersList = [
				{ round: 5, delegates: ['n', 'o', 'p'] },
				{ round: 4, delegates: ['n', 'o', 'p'] },
				{ round: 3, delegates: ['x', 'b', 'c'] },
				{ round: 2, delegates: ['x', 'b', 'c'] },
				{ round: 1, delegates: ['x', 'b', 'c'] },
			];
			// Height in second round
			height = 302;

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'b', 'c']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of 2nd round for activeRound = 2', async () => {
			// Arrange
			const numberOfRounds = 1;
			const publicKey = 'x';
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(2);

			// Height in second round
			height = 150;

			const lists = [
				{ round: 4, delegates: ['a', 'b', 'c'] },
				{ round: 3, delegates: ['a', 'b', 'c'] },
				{ round: 2, delegates: ['x', 'b', 'c'] },
				{ round: 1, delegates: ['a', 'b', 'c'] },
			];

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'b', 'c']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of 3rd round for activeRound = 3', async () => {
			// Arrange
			const numberOfRounds = 1;
			const publicKey = 'x';
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(3);

			// Height in third round
			height = 250;

			const lists = [
				{ round: 5, delegates: ['d', 'e', 'f'] },
				{ round: 4, delegates: ['d', 'e', 'f'] },
				{ round: 3, delegates: ['x', 'e', 'f'] },
				{ round: 2, delegates: ['a', 'b', 'c'] },
				{ round: 1, delegates: ['a', 'b', 'c'] },
			];

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'e', 'f']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of third round for activeRound = 4', async () => {
			// Arrange
			const numberOfRounds = 1;

			const publicKey = 'x';
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(3);

			const lists = [
				{ round: 5, delegates: ['a', 'e', 'f'] },
				{ round: 6, delegates: ['a', 'e', 'f'] },
				{ round: 4, delegates: ['x', 'e', 'f'] },
				{ round: 3, delegates: ['x', 'e', 'f'] },
				{ round: 2, delegates: ['a', 'b', 'c'] },
				{ round: 1, delegates: ['x', 'k', 'm'] },
			];

			// Height in forth round
			height = 350;

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'e', 'f']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of the 2nd round for activeRound = 5', async () => {
			// Arrange
			const numberOfRounds = 1;
			const publicKey = 'x';
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(2);

			// Height in fifth round
			height = 450;

			const lists = [
				{ round: 6, delegates: ['a', 'e', 'f'] },
				{ round: 7, delegates: ['a', 'e', 'f'] },
				{ round: 5, delegates: ['x', 'e', 'f'] },
				{ round: 4, delegates: ['x', 'e', 'f'] },
				{ round: 3, delegates: ['x', 'e', 'f'] },
				{ round: 2, delegates: ['x', 'b', 'c'] },
				{ round: 1, delegates: ['x', 'k', 'm'] },
			];

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'e', 'f']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of the 4th round for activeRound = 6', async () => {
			// Arrange
			const numberOfRounds = 1;
			const publicKey = 'x';
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(6);

			// Height in 6 round
			height = 550;

			const lists = [
				{ round: 7, delegates: ['a', 'e', 'f'] },
				{ round: 8, delegates: ['a', 'e', 'f'] },
				{ round: 6, delegates: ['x', 'e', 'f'] },
				{ round: 5, delegates: ['a', 'e', 'f'] },
				{ round: 4, delegates: ['x', 'e', 'd'] },
				{ round: 3, delegates: ['x', 'e', 'f'] },
				{ round: 2, delegates: ['x', 'b', 'c'] },
				{ round: 1, delegates: ['x', 'k', 'm'] },
			];

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'e', 'f']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of 4th round when delegate was not in the first list  (activeRound = 4)', async () => {
			// Arrange
			const numberOfRounds = 1;
			const publicKey = 'x';
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(4);

			// Height in 4 round
			height = 350;

			const lists = [
				{ round: 6, delegates: ['a', 'e', 'f'] },
				{ round: 5, delegates: ['a', 'e', 'f'] },
				{ round: 4, delegates: ['x', 'e', 'f'] },
				{ round: 3, delegates: ['d', 'e', 'f'] },
				{ round: 2, delegates: ['a', 'b', 'c'] },
				{ round: 1, delegates: ['a', 'k', 'm'] },
			];

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'e', 'f']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of 4th round when delegate was not in the first list (activeRound = 5)', async () => {
			// Arrange
			const numberOfRounds = 1;

			const publicKey = 'x';
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(4);

			// Height in 5 round
			height = 450;

			const lists = [
				{ round: 7, delegates: ['a', 'e', 'f'] },
				{ round: 6, delegates: ['a', 'e', 'f'] },
				{ round: 5, delegates: ['x', 'e', 'f'] },
				{ round: 4, delegates: ['x', 'e', 'f'] },
				{ round: 3, delegates: ['a', 'e', 'f'] },
				{ round: 2, delegates: ['a', 'b', 'c'] },
				{ round: 1, delegates: ['a', 'k', 'm'] },
			];

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'e', 'f']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});

		it('should return the first block height of 4th round when delegate was not in the first list (activeRound = 6)', async () => {
			// Arrange
			const numberOfRounds = 1;
			const publicKey = 'x';
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(4);

			// Height in 6 round
			height = 550;

			const lists = [
				{ round: 8, delegates: ['a', 'e', 'f'] },
				{ round: 7, delegates: ['a', 'e', 'f'] },
				{ round: 6, delegates: ['x', 'e', 'f'] },
				{ round: 5, delegates: ['x', 'e', 'f'] },
				{ round: 4, delegates: ['x', 'e', 'f'] },
				{ round: 3, delegates: ['a', 'e', 'f'] },
				{ round: 2, delegates: ['a', 'b', 'c'] },
				{ round: 1, delegates: ['a', 'k', 'm'] },
			];

			// Act
			const minActiveHeights = await dpos.getMinActiveHeightsOfDelegates(
				height,
				createStateStore(lists),
				numberOfRounds,
			);
			// Assert
			expect(Object.keys(minActiveHeights)).toEqual(['x', 'e', 'f']);
			expect(minActiveHeights[publicKey]).toEqual([expectedActiveMinHeight]);
		});
	});
});
