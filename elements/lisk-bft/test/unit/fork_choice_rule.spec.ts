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
import {
	isDifferentChain,
	isDoubleForging,
	isIdenticalBlock,
	isDuplicateBlock,
	isTieBreak,
	isValidBlock,
} from '../../src/fork_choice_rule';
import { BlockHeader } from '../../src/types';

const GENESIS_BLOCK_TIME_STAMP =
	new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).getTime() / 1000;
const BLOCK_TIME = 10;

const createBlock = (data?: Partial<BlockHeader>): BlockHeader => ({
	height: data?.height ?? 0,
	timestamp: data?.timestamp ?? 0,
	version: 2,
	id: data?.id ?? Buffer.from('id'),
	generatorPublicKey: Buffer.from('generator'),
	previousBlockID: data?.previousBlockID ?? Buffer.from('previoud block'),
	receivedAt: data?.receivedAt ?? 0,
	asset: {
		maxHeightPrevoted: data?.asset?.maxHeightPrevoted ?? 0,
		maxHeightPreviouslyForged: data?.asset?.maxHeightPreviouslyForged ?? 0,
	},
});

describe('Fork Choice Rule', () => {
	let slots: Slots;

	beforeEach(() => {
		slots = new Slots({
			genesisBlockTimestamp: GENESIS_BLOCK_TIME_STAMP,
			interval: BLOCK_TIME,
		});
	});

	describe('_isValidBlock', () => {
		it('should return true if last.height + 1 === current.height && last.id === current.previousBlockID', () => {
			const last = createBlock({
				height: 1,
				id: Buffer.from('1'),
			});
			const current = createBlock({
				height: last.height + 1,
				previousBlockID: last.id,
			});

			expect(isValidBlock(last, current)).toBeTruthy();
		});
	});

	describe('_isDuplicateBlock', () => {
		it('should return true if last.height === current.height && last.heightPrevoted === current.heightPrevoted && last.previousBlockID === current.previousBlockID', () => {
			const last = createBlock({
				height: 1,
				asset: {
					maxHeightPrevoted: 0,
					maxHeightPreviouslyForged: 0,
				},
				previousBlockID: Buffer.from('0'),
				id: Buffer.from('1'),
			});
			const current = createBlock({
				height: last.height,
				asset: {
					maxHeightPrevoted: last.asset.maxHeightPrevoted,
					maxHeightPreviouslyForged: 0,
				},
				previousBlockID: last.previousBlockID,
				id: Buffer.from('2'),
			});
			expect(isDuplicateBlock(last, current)).toBeTruthy();
		});
	});

	describe('_isIdenticalBlock', () => {
		it('should return true if last.id === current.id', () => {
			const last = createBlock({
				height: 1,
				id: Buffer.from('1'),
			});
			expect(isIdenticalBlock(last, last)).toBeTruthy();
		});
	});

	describe('_isDoubleForging', () => {
		it('should return true if _isDuplicateBlock(last, current) && last.generatorPublicKey === current.generatorPublicKey', () => {
			const last = createBlock({
				height: 1,
				asset: {
					maxHeightPrevoted: 0,
					maxHeightPreviouslyForged: 0,
				},
				previousBlockID: Buffer.from('0'),
				id: Buffer.from('1'),
				generatorPublicKey: Buffer.from('abc'),
			});
			const current = createBlock({
				height: last.height,
				asset: {
					maxHeightPrevoted: last.asset.maxHeightPrevoted,
					maxHeightPreviouslyForged: 0,
				},
				previousBlockID: last.previousBlockID,
				id: Buffer.from('2'),
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
		it('should return true if it matches the conditions described in _isTieBreak', () => {
			const lastReceivedAndAppliedBlock = {
				receivedTime: 100000,
				id: Buffer.from('1'),
			};

			const lastAppliedBlock = createBlock({
				height: 1,
				previousBlockID: Buffer.from('0'),
				id: Buffer.from('1'),
				asset: {
					maxHeightPrevoted: 0,
					maxHeightPreviouslyForged: 0,
				},
				timestamp: lastReceivedAndAppliedBlock.receivedTime,
				generatorPublicKey: Buffer.from('abc'),
				receivedAt: 300000,
			});

			const receivedBlock = createBlock({
				...lastAppliedBlock,
				id: Buffer.from('2'),
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
		it('should return true if last.heightPrevoted < current.heightPrevoted', () => {
			const last = createBlock({
				height: 1,
				previousBlockID: Buffer.from('0'),
				id: Buffer.from('1'),
				timestamp: Date.now(),
				asset: {
					maxHeightPrevoted: 0,
					maxHeightPreviouslyForged: 0,
				},
				generatorPublicKey: Buffer.from('abc'),
			});
			const current = createBlock({
				height: last.height,
				asset: {
					maxHeightPrevoted: last.asset.maxHeightPrevoted + 1,
					maxHeightPreviouslyForged: 0,
				},
				previousBlockID: last.previousBlockID,
				id: Buffer.from('2'),
				timestamp: Date.now() + 1000,
				generatorPublicKey: last.generatorPublicKey,
			});

			expect(isDifferentChain(last, current)).toBeTruthy();
		});

		it('OR should return true if (last.height < current.height && last.heightPrevoted === current.heightPrevoted)', () => {
			const last = createBlock({
				height: 1,
				previousBlockID: Buffer.from('0'),
				id: Buffer.from('1'),
				timestamp: Date.now(),
				generatorPublicKey: Buffer.from('abc'),
				asset: {
					maxHeightPreviouslyForged: 0,
					maxHeightPrevoted: 0,
				},
			});
			const current = createBlock({
				height: last.height + 1,
				asset: {
					maxHeightPreviouslyForged: 0,
					maxHeightPrevoted: last.asset.maxHeightPrevoted,
				},
				previousBlockID: last.previousBlockID,
				id: Buffer.from('2'),
				timestamp: Date.now() + 1000,
				generatorPublicKey: last.generatorPublicKey,
			});

			expect(isDifferentChain(last, current)).toBeTruthy();
		});
	});
});
