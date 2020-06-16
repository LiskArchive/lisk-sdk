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
import { forgerListSchema } from '../../src/schemas';
import { Dpos } from '../../src';
import {
	DELEGATE_LIST_ROUND_OFFSET,
	ACTIVE_DELEGATES,
	BLOCK_TIME,
} from '../fixtures/constants';
import { generateDelegateLists } from '../utils/delegates';
import { StateStoreMock } from '../utils/state_store_mock';
import { CONSENSUS_STATE_DELEGATE_FORGERS_LIST } from '../../src/constants';
import { ForgersList } from '../../src/types';

const MS_IN_A_SEC = 1000;
const GENESIS_BLOCK_TIMESTAMP =
	new Date(Date.UTC(2020, 5, 15, 0, 0, 0, 0)).getTime() / MS_IN_A_SEC;

const createStateStore = (list: ForgersList = []): StateStoreMock => {
	const binaryForgerList = codec.encode(forgerListSchema, {
		forgersList: list,
	});

	return new StateStoreMock([], {
		[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: binaryForgerList,
	});
};

describe('dpos.getMinActiveHeight()', () => {
	let dpos: Dpos;
	let height: number;
	const delegateListRoundOffset = DELEGATE_LIST_ROUND_OFFSET;
	const defaultAddress = Buffer.from('x');

	beforeEach(() => {
		// Arrange
		const slots = new Slots({
			genesisBlockTimestamp: GENESIS_BLOCK_TIMESTAMP,
			interval: BLOCK_TIME,
		});
		const chain = {
			slots,
		};

		dpos = new Dpos({
			chain: chain as any,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset,
		});

		// Last block of round 15 to be default as most of the test expects to be 15th round
		height = 101;
	});

	describe('Given empty forgers list', () => {
		it('should throw exception', async () => {
			// Act
			await expect(
				dpos.getMinActiveHeight(height, defaultAddress, createStateStore()),
			).rejects.toThrow('No delegate list found in the database.');
		});
	});

	describe('Given delegate "x" was continuously active more than 4 rounds', () => {
		it('should return the first block height of the 12th round', async () => {
			// Arrange
			const activeRounds = [17, 16, 15, 14, 13, 12, 11, 10];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(12);
			// Height in round 15
			height = 15 * ACTIVE_DELEGATES;

			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeight(
				height,
				defaultAddress,
				createStateStore(lists),
			);
			// Assert
			expect(minActiveHeights).toEqual(expectedActiveMinHeight);
		});
	});

	describe('Given delegate "x" was continuously active in last 4 rounds', () => {
		it('should return the first block height of the 12th round', async () => {
			// Arrange
			const activeRounds = [17, 16, 15, 14, 13, 12, 10];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(12);
			// Height in round 15
			height = 15 * ACTIVE_DELEGATES;

			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeight(
				height,
				defaultAddress,
				createStateStore(lists),
			);
			// Assert
			expect(minActiveHeights).toEqual(expectedActiveMinHeight);
		});
	});

	describe('Given delegate "x" was continuously active in last 3 rounds', () => {
		it('should return the first block height of the 3rd round', async () => {
			// Arrange
			const activeRounds = [17, 16, 15, 14, 13, 11, 10];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(13);
			// Height in round 15
			height = 15 * ACTIVE_DELEGATES;

			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeight(
				height,
				defaultAddress,
				createStateStore(lists),
			);
			// Assert
			expect(minActiveHeights).toEqual(expectedActiveMinHeight);
		});
	});

	describe('Given delegate "x" was continuously active in last 2 rounds', () => {
		it('should return the first block height of the 14nd round', async () => {
			// Arrange
			const activeRounds = [17, 16, 15, 14, 12, 11, 10];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(14);
			// Height in round 15
			height = 15 * ACTIVE_DELEGATES;

			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeight(
				height,
				defaultAddress,
				createStateStore(lists),
			);
			// Assert
			expect(minActiveHeights).toEqual(expectedActiveMinHeight);
		});
	});

	describe('Given delegate "x" was only active in last round', () => {
		it('should return the first block height of the last round', async () => {
			// Arrange
			const activeRounds = [17, 16, 15, 13, 12, 11, 10];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(15);
			// Height in round 15
			height = 15 * ACTIVE_DELEGATES;

			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeight(
				height,
				defaultAddress,
				createStateStore(lists),
			);
			// Assert
			expect(minActiveHeights).toEqual(expectedActiveMinHeight);
		});
	});

	describe('Given blockchain just started and the first list is being used couple of times', () => {
		it('should return the first block height of 1st round for activeRound = 1', async () => {
			// Arrange
			const activeRounds = [3, 2, 1];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(1);
			// Height in round 1
			height = 90;

			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeight(
				height,
				defaultAddress,
				createStateStore(lists),
			);
			// Assert
			expect(minActiveHeights).toEqual(expectedActiveMinHeight);
		});

		it('should return the first block height of 1st round for activeRound = 2', async () => {
			// Arrange
			const activeRounds = [3, 2, 1];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(1);
			// Height in round 2
			height = 150;

			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeight(
				height,
				defaultAddress,
				createStateStore(lists),
			);
			// Assert
			expect(minActiveHeights).toEqual(expectedActiveMinHeight);
		});

		it('should return the first block height of 1st round for activeRound = 3', async () => {
			// Arrange
			const activeRounds = [3, 2, 1];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(1);
			// Height in round 3
			height = 250;

			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeight(
				height,
				defaultAddress,
				createStateStore(lists),
			);
			// Assert
			expect(minActiveHeights).toEqual(expectedActiveMinHeight);
		});

		it('should return the first block height of 1st round for activeRound = 5', async () => {
			// Arrange
			const activeRounds = [5, 3, 2, 1];
			const expectedActiveMinHeight = dpos.rounds.calcRoundStartHeight(5);
			// Height in round 5
			height = 450;

			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const minActiveHeights = await dpos.getMinActiveHeight(
				height,
				defaultAddress,
				createStateStore(lists),
			);
			// Assert
			expect(minActiveHeights).toEqual(expectedActiveMinHeight);
		});
	});
});
