/*
 * Copyright © 2018 Lisk Foundation
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

'use strict';

const BlockSynchronizationMechanism = require('../../../../../../../../src/modules/chain/synchronizer/block_synchronization_mechanism');
const peersList = require('./peers');

describe('BlockSynchronizationMechanism', () => {
	const stubs = {
		channel: {
			invoke: jest.fn(),
		},
		modules: {
			blocks: {
				lastBlock: jest.fn(),
			},
		},
	};
	let blockSynchronizationMechanism;

	beforeEach(() => {
		blockSynchronizationMechanism = new BlockSynchronizationMechanism({
			channel: stubs.channel,
			modules: stubs.modules,
		});
	});

	describe('#constructor', () => {});

	describe('#_computeBestPeer', () => {
		it('should accept an array of peers as input', () => {
			expect(blockSynchronizationMechanism._computeBestPeer).toHaveLength(1);
		});

		it('should return a peer object', () => {
			stubs.modules.blocks.lastBlock = {
				height: 0,
				prevotedConfirmedUptoHeight: 0,
			};

			const peers = [
				{
					lastBlockId: '12343245',
					prevotedConfirmedUptoHeight: 1,
					height: 67,
					ip: '127.0.0.1',
				},
			];

			expect(blockSynchronizationMechanism._computeBestPeer(peers)).toEqual(
				peers[0]
			);
		});

		describe('given a set of peers', () => {
			/**
			 * a) Among all peers, choose the subset of peers with largest T.prevotedConfirmedUptoHeight.
			 * b) From the peers in a) choose those with largest T.height.
			 * c) Form the peers in b) choose the largest set which has the same blockID.
			 * 		Ties are broken in favor of smaller blockID.
			 *
			 * This set is the set bestPeers and we define B to be the block at the
			 * tip of the chain of this set of peers.
			 *
			 * @link https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#block-synchronization-mechanism
			 */

			it('should successfully select the best peer according to the steps defined in LIP-0014', () => {
				stubs.modules.blocks.lastBlock = {
					height: 0,
					prevotedConfirmedUptoHeight: 0,
				}; // So ForkChoiceRule.isDifferentChain returns is TRUTHY

				const selectedPeer = blockSynchronizationMechanism._computeBestPeer(
					peersList
				);

				// selectedPeers should be one of peers[3 - 5] ends included.

				expect(selectedPeer.lastBlockId).toEqual('12343245');
				expect(selectedPeer.prevotedConfirmedUptoHeight).toEqual(2);
				expect(selectedPeer.height).toEqual(69);
				expect([peersList[3].ip, peersList[4].ip, peersList[5].ip]).toContain(
					selectedPeer.ip
				);
			});

			it('should throw an error if the ForkChoiceRule.isDifferentChain evaluates falsy', () => {
				stubs.modules.blocks.lastBlock = {
					height: 66,
					prevotedConfirmedUptoHeight: 0,
				}; // So ForkChoiceRule.isDifferentChain returns is TRUTHY

				const peers = [
					{
						lastBlockId: '12343245',
						prevotedConfirmedUptoHeight: 0,
						height: 66,
						ip: '127.0.0.2',
					},
				];

				expect(() =>
					blockSynchronizationMechanism._computeBestPeer(peers)
				).toThrow('Violation of fork choice rule');
			});
		});
	});

	describe('#_computeLargestSubsetMaxBy', () => {
		/**
		 * @example
		 * Input: [{height: 1}, {height: 2}, {height: 2}]
		 * Output: [{height: 2}, {height: 2}]
		 */
		it('should return the largest subset by maximum value of the given property', () => {
			const input = [
				{ height: 1, id: '1' },
				{ height: 2, id: '2' },
				{ height: 2, id: '3' },
			];

			expect(
				blockSynchronizationMechanism._computeLargestSubsetMaxBy(
					input,
					item => item.height
				)
			).toEqual([input[1], input[2]]);
		});
	});
});
