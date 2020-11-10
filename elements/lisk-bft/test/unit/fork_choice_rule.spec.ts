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

import {
	isDifferentChain,
	isDoubleForging,
	isIdenticalBlock,
	isDuplicateBlock,
	isTieBreak,
	isValidBlock,
} from '../../src/fork_choice_rule';
import { BlockHeader } from '../../src/types';

import { Slots } from '@liskhq/lisk-chain';

const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString();
const BLOCK_TIME = 10;

const createBlock = (data: object): BlockHeader =>
	({
		...{
			height: 0,
			id: '',
			generatorPublicKey: '',
			previousBlockId: 'null',
			maxHeightPrevoted: 0,
			timestamp: 0,
			version: 2,
		},
		...data,
	} as BlockHeader);

describe('Fork Choice Rule', () => {
	let slots: Slots;

	beforeEach(() => {
		slots = new Slots({
			epochTime: EPOCH_TIME,
			interval: BLOCK_TIME,
		});
	});

	describe('_isValidBlock', () => {
		it('should return true if last.height + 1 === current.height && last.id === current.previousBlockId', async () => {
			const last = createBlock({
				height: 1,
				id: '1',
			});
			const current = createBlock({
				height: last.height + 1,
				previousBlockId: last.id,
			});

			expect(isValidBlock(last, current)).toBeTruthy();
		});
	});

	describe('_isDuplicateBlock', () => {
		it('should return true if last.height === current.height && last.heightPrevoted === current.heightPrevoted && last.previousBlockId === current.previousBlockId', async () => {
			const last = createBlock({
				height: 1,
				maxHeightPrevoted: 0,
				previousBlockId: 0,
				id: '1',
			});
			const current = createBlock({
				height: last.height,
				maxHeightPrevoted: last.maxHeightPrevoted,
				previousBlockId: last.previousBlockId,
				id: '2',
			});
			expect(isDuplicateBlock(last, current)).toBeTruthy();
		});
	});

	describe('_isIdenticalBlock', () => {
		it('should return true if last.id === current.id', async () => {
			const last = createBlock({
				height: 1,
				id: '1',
			});
			expect(isIdenticalBlock(last, last)).toBeTruthy();
		});
	});

	describe('_isDoubleForging', () => {
		it('should return true if _isDuplicateBlock(last, current) && last.generatorPublicKey === current.generatorPublicKey', async () => {
			const last = createBlock({
				height: 1,
				maxHeightPrevoted: 0,
				previousBlockId: 0,
				id: '1',
				generatorPublicKey: 'abc',
			});
			const current = createBlock({
				height: last.height,
				maxHeightPrevoted: last.maxHeightPrevoted,
				previousBlockId: last.previousBlockId,
				id: '2',
				generatorPublicKey: last.generatorPublicKey,
			});

			expect(isDoubleForging(last, current)).toBeTruthy();
		});
	});

	/**
	 *
	 * Determine if Case 4 fulfills
	 * @param slots
	 * @param lastAppliedBlock
	 * @param receivedBlock
	 * @param receivedBlockReceiptTime
	 * @param lastReceivedAndAppliedBlock
	 * @return {boolean}
	 */

	describe('_isTieBreak', () => {
		/**
		 * Explanation:
		 *
		 * It should return true if (AND):
		 *
		 * - The current tip of the chain and the received block are duplicate
		 * - The current tip of the chain was forged first
		 * - The the last block that was received from the network and then applied
		 *   was not received within its designated forging slot but the new received block is.
		 */
		it('should return true if it matches the conditions described in _isTieBreak', async () => {
			const lastReceivedAndAppliedBlock = {
				receivedTime: 100000,
				id: '1',
			};

			const lastAppliedBlock = createBlock({
				height: 1,
				maxHeightPrevoted: 0,
				previousBlockId: 0,
				id: '1',
				timestamp: lastReceivedAndAppliedBlock.receivedTime,
				generatorPublicKey: 'abc',
				receivedAt: 300000,
			});

			const receivedBlock = createBlock({
				...lastAppliedBlock,
				id: '2',
				timestamp: 200000,
				receivedAt: 200000,
			});

			expect(
				isTieBreak({
					slots,
					lastAppliedBlock,
					receivedBlock,
				}),
			).toBeTruthy();
		});
	});

	describe('_isDifferentChain', () => {
		it('should return true if last.heightPrevoted < current.heightPrevoted', async () => {
			const last = createBlock({
				height: 1,
				maxHeightPrevoted: 0,
				previousBlockId: 0,
				id: '1',
				timestamp: Date.now(),
				generatorPublicKey: 'abc',
			});
			const current = createBlock({
				height: last.height,
				maxHeightPrevoted: last.maxHeightPrevoted + 1,
				previousBlockId: last.previousBlockId,
				id: '2',
				timestamp: Date.now() + 1000,
				generatorPublicKey: last.generatorPublicKey,
			});

			expect(isDifferentChain(last, current)).toBeTruthy();
		});

		it('OR should return true if (last.height < current.height && last.heightPrevoted === current.heightPrevoted)', async () => {
			const last = createBlock({
				height: 1,
				maxHeightPrevoted: 0,
				previousBlockId: 0,
				id: '1',
				timestamp: Date.now(),
				generatorPublicKey: 'abc',
			});
			const current = createBlock({
				height: last.height + 1,
				maxHeightPrevoted: last.maxHeightPrevoted,
				previousBlockId: last.previousBlockId,
				id: '2',
				timestamp: Date.now() + 1000,
				generatorPublicKey: last.generatorPublicKey,
			});

			expect(isDifferentChain(last, current)).toBeTruthy();
		});
	});
});
