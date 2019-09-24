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

const ForkChoiceRule = require('../../../../../../../../src/modules/chain/blocks/fork_choice_rule');

const {
	BlockSynchronizationMechanism,
} = require('../../../../../../../../src/modules/chain/synchronizer/block_synchronization_mechanism');
const peersList = require('./peers');
const {
	Block: blockFixture,
} = require('../../../../../../../mocha/fixtures/blocks');

describe('block_synchronization_mechanism', () => {
	afterEach(async () => {
		jest.clearAllMocks();
	});

	describe('BlockSynchronizationMechanism', () => {
		const activeDelegates = 101;
		const channelMock = {
			invoke: jest.fn(),
			publish: jest.fn(),
		};
		const processorModuleMock = { validateDetached: jest.fn() };

		const lastBlockGetterMock = jest.fn();
		const blocksMock = {};
		Object.defineProperty(blocksMock, 'lastBlock', {
			get: lastBlockGetterMock,
		});

		const storageMock = {
			entities: {
				Block: {
					getOne: jest.fn(),
				},
			},
		};
		const bftMock = {
			finalizedHeight: null,
		};
		const slotsMock = {
			getSlotNumber: jest.fn(),
		};
		const syncParams = {
			channel: channelMock,
			blocks: blocksMock,
			storage: storageMock,
			slots: slotsMock,
			bft: bftMock,
			activeDelegates,
			processorModule: processorModuleMock,
		};

		let syncMechanism;

		beforeEach(() => {
			ForkChoiceRule.isDifferentChain = jest.fn();
			syncMechanism = new BlockSynchronizationMechanism(syncParams);
		});

		describe('#constructor', () => {
			it('should create instance of BlockSynchronizationMechanism', async () => {
				expect(syncMechanism).toBeInstanceOf(BlockSynchronizationMechanism);
			});

			it('should assign dependencies', async () => {
				expect(syncMechanism.storage).toBe(syncParams.storage);
				expect(syncMechanism.logger).toBe(syncParams.logger);
				expect(syncMechanism.bft).toBe(syncParams.bft);
				expect(syncMechanism.slots).toBe(syncParams.slots);
				expect(syncMechanism.channel).toBe(syncParams.channel);
				expect(syncMechanism.blocks).toBe(syncParams.blocks);
				expect(syncMechanism.constants).toEqual({
					activeDelegates,
				});
				expect(syncMechanism.active).toBeFalsy();
			});
		});

		describe('async isValidFor()', () => {
			const lastBlockHeight = 200;
			const finalizedBlockHeight = 100;
			const finalizedBlock = blockFixture({ height: finalizedBlockHeight });

			beforeEach(async () => {
				storageMock.entities.Block.getOne.mockReturnValue(finalizedBlock);
				syncMechanism.bft.finalizedHeight = finalizedBlockHeight;
			});

			it('should get finalized block from storage', async () => {
				const receivedBlock = blockFixture();

				await syncMechanism.isValidFor(receivedBlock);

				expect(storageMock.entities.Block.getOne).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.Block.getOne).toHaveBeenCalledWith({
					height_eq: finalizedBlockHeight,
				});
			});

			it('should get slot numbers for finalizedBlock and current slot', async () => {
				const receivedBlock = blockFixture();

				await syncMechanism.isValidFor(receivedBlock);

				expect(slotsMock.getSlotNumber).toHaveBeenCalledTimes(2);
				expect(slotsMock.getSlotNumber).toHaveBeenNthCalledWith(
					1,
					finalizedBlock.timestamp,
				);
				expect(slotsMock.getSlotNumber).toHaveBeenNthCalledWith(2);
			});

			it('should return true if is behind the three rounds', async () => {
				const currentSlot = 5000;
				const finalizedBlockSlot = 4000; // Behind more than 3 rounds
				const receivedBlock = blockFixture({ height: lastBlockHeight + 1 });
				slotsMock.getSlotNumber.mockImplementation(timestamp => {
					if (timestamp === finalizedBlock.timestamp) {
						return finalizedBlockSlot;
					}

					return currentSlot;
				});

				const result = await syncMechanism.isValidFor(receivedBlock);

				expect(result).toBeTruthy();
			});

			it('should return false if is behind within three rounds', async () => {
				const currentSlot = 5000;
				const finalizedBlockSlot = 4700; // Behind more than 3 rounds
				const receivedBlock = blockFixture({ height: lastBlockHeight + 1 });
				slotsMock.getSlotNumber.mockImplementation(timestamp => {
					if (timestamp === finalizedBlock.timestamp) {
						return finalizedBlockSlot;
					}

					return currentSlot;
				});

				const result = await syncMechanism.isValidFor(receivedBlock);

				expect(result).toBeFalsy();
			});
		});

		describe('#_computeBestPeer', () => {
			it('should accept an array of peers as input', () => {
				expect(syncMechanism._computeBestPeer).toHaveLength(1);
			});

			it('should return a peer object', () => {
				ForkChoiceRule.isDifferentChain.mockImplementation(() => true);
				lastBlockGetterMock.mockReturnValue({
					height: 0,
					prevotedConfirmedUptoHeight: 0,
				});

				const peers = [
					{
						lastBlockId: '12343245',
						prevotedConfirmedUptoHeight: 1,
						height: 67,
						ip: '127.0.0.1',
					},
				];

				expect(syncMechanism._computeBestPeer(peers)).toEqual(peers[0]);
			});

			describe('given a set of peers', () => {
				/**
				 * a) Among all peers, choose the subset of peers with largest T.prevotedConfirmedUptoHeight.
				 * b) From the peers in a) choose those with largest T.height.
				 * c) Form the peers in b) choose the largest set which has the same blockID.
				 *    Ties are broken in favor of smaller blockID.
				 *
				 * This set is the set bestPeers and we define B to be the block at the
				 * tip of the chain of this set of peers.
				 *
				 * @link https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#block-synchronization-mechanism
				 */

				it('should successfully select the best peer according to the steps defined in LIP-0014', () => {
					ForkChoiceRule.isDifferentChain.mockImplementation(() => true);
					lastBlockGetterMock.mockReturnValue({
						height: 0,
						prevotedConfirmedUptoHeight: 0,
					}); // So ForkChoiceRule.isDifferentChain returns is TRUTHY

					const selectedPeer = syncMechanism._computeBestPeer(peersList);

					// selectedPeers should be one of peers[3 - 5] ends included.

					expect(selectedPeer.lastBlockId).toEqual('12343245');
					expect(selectedPeer.prevotedConfirmedUptoHeight).toEqual(2);
					expect(selectedPeer.height).toEqual(69);
					expect([peersList[3].ip, peersList[4].ip, peersList[5].ip]).toContain(
						selectedPeer.ip,
					);
				});

				it('should throw an error if the ForkChoiceRule.isDifferentChain evaluates falsy', () => {
					lastBlockGetterMock.mockReturnValue({
						height: 66,
						prevotedConfirmedUptoHeight: 0,
					}); // So ForkChoiceRule.isDifferentChain returns is TRUTHY

					const peers = [
						{
							lastBlockId: '12343245',
							prevotedConfirmedUptoHeight: 0,
							height: 66,
							ip: '127.0.0.2',
						},
					];

					expect(() => syncMechanism._computeBestPeer(peers)).toThrow(
						'Violation of fork choice rule',
					);
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
					syncMechanism._computeLargestSubsetMaxBy(input, item => item.height),
				).toEqual([input[1], input[2]]);
			});
		});

		describe('#run()', () => {
			describe('when there are no errors', () => {
				it('should not ban peer or restart sync', async () => {
					const fakeLastBlock = { foo: 'bar' };
					syncMechanism._computeBestPeer = jest.fn(() => ({
						...peersList[0],
						id: '127.0.0.1:30400',
					}));
					channelMock.invoke.mockImplementationOnce(() => ({
						connectedPeers: peersList,
					}));
					channelMock.invoke.mockImplementationOnce(() => ({
						data: fakeLastBlock,
					}));
					processorModuleMock.validateDetached.mockImplementation(
						() => fakeLastBlock,
					);
					ForkChoiceRule.isDifferentChain.mockImplementation(() => true);

					await syncMechanism.run();

					expect(channelMock.invoke.mock.calls[0]).toMatchObject([
						'network:getUniqueOutboundConnectedPeers',
					]);
					expect(channelMock.invoke.mock.calls[1]).toMatchObject([
						'network:requestFromPeer',
						{ procedure: 'getLastBlock', peerId: '127.0.0.1:30400' },
					]);

					expect(
						processorModuleMock.validateDetached.mock.calls[0],
					).toMatchObject([fakeLastBlock]);

					expect(channelMock.invoke).toHaveBeenCalledTimes(2);
				});
			});

			describe('when peer returns invalid block', () => {
				it('should be banned and re-publish action', async () => {
					const receivedBlock = { id: 12323, transactions: [] };
					const fakeLastBlock = { foo: 'bar' };
					syncMechanism._computeBestPeer = jest.fn(() => ({
						...peersList[0],
						id: '127.0.0.1:30400',
					}));
					channelMock.invoke.mockImplementationOnce(() => ({
						connectedPeers: peersList,
					}));
					channelMock.invoke.mockImplementationOnce(() => ({
						data: fakeLastBlock,
					}));
					processorModuleMock.validateDetached.mockImplementation(() => {
						throw new Error('Peer did not send valid block');
					});
					ForkChoiceRule.isDifferentChain.mockImplementation(() => true);

					try {
						await syncMechanism.run(receivedBlock);
					} catch (err) {
						expect(channelMock.invoke.mock.calls[0]).toMatchObject([
							'network:getUniqueOutboundConnectedPeers',
						]);

						expect(channelMock.invoke.mock.calls[1]).toMatchObject([
							'network:requestFromPeer',
							{ procedure: 'getLastBlock', peerId: '127.0.0.1:30400' },
						]);

						expect(channelMock.invoke.mock.calls[2]).toMatchObject([
							'network:applyPenalty',
							{ peerId: '127.0.0.1:30400', penalty: 100 },
						]);

						expect(channelMock.publish.mock.calls[0]).toMatchObject([
							'chain:processor:sync',
							{ block: receivedBlock },
						]);
					}
				});
			});

			describe('when peer returns invalid isDifferentChain block ', () => {
				it('should be banned and re-publish action', async () => {
					const receivedBlock = { id: 12323, transactions: [] };
					const fakeLastBlock = { foo: 'bar' };
					syncMechanism._computeBestPeer = jest.fn(() => ({
						...peersList[0],
						id: '127.0.0.1:30400',
					}));
					channelMock.invoke.mockImplementationOnce(() => ({
						connectedPeers: peersList,
					}));
					channelMock.invoke.mockImplementationOnce(() => ({
						data: fakeLastBlock,
					}));
					processorModuleMock.validateDetached.mockImplementation(
						() => fakeLastBlock,
					);
					ForkChoiceRule.isDifferentChain.mockImplementation(() => false);

					try {
						await syncMechanism.run(receivedBlock);
					} catch (err) {
						expect(channelMock.invoke.mock.calls[0]).toMatchObject([
							'network:getUniqueOutboundConnectedPeers',
						]);

						expect(channelMock.invoke.mock.calls[1]).toMatchObject([
							'network:requestFromPeer',
							{ procedure: 'getLastBlock', peerId: '127.0.0.1:30400' },
						]);

						expect(channelMock.invoke.mock.calls[2]).toMatchObject([
							'network:applyPenalty',
							{ peerId: '127.0.0.1:30400', penalty: 100 },
						]);

						expect(channelMock.publish.mock.calls[0]).toMatchObject([
							'chain:processor:sync',
							{ block: receivedBlock },
						]);
					}
				});
			});
		});
	});
});
