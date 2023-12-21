/* eslint-disable max-classes-per-file */
/*
 * Copyright © 2022 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { InMemoryDatabase } from '@liskhq/lisk-db';
import { Types } from '../../../../src';
import { LegacyChainHandler } from '../../../../src/engine/legacy/legacy_chain_handler';
import { Network } from '../../../../src/engine/network';
import { encodeBlock } from '../../../../src/engine/legacy/codec';
import { Peer, LegacyBlock } from '../../../../src/engine/legacy/types';
import { getBlocksFromIdResponseSchema } from '../../../../src/engine/consensus/schema';
import { blockFixtures } from './fixtures';
import { fakeLogger } from '../../../utils/mocks';

const randomSnapshotBlockID = utils.getRandomBytes(20);
const expectedSnapshotBlockID = utils.getRandomBytes(20);

describe('Legacy Chain Handler', () => {
	let legacyChainHandler: LegacyChainHandler;
	let legacyConfig: Types.LegacyConfig;
	let peers: Peer[];
	let network: Network;
	let legacyBlock16270316: LegacyBlock;

	beforeEach(async () => {
		legacyConfig = {
			sync: true,
			brackets: [
				{
					startHeight: 16270306,
					snapshotBlockID: expectedSnapshotBlockID.toString('hex'),
					snapshotHeight: 16270316,
				},
			],
		};
		peers = [
			{
				peerId: 'peerId-1',
				options: {
					legacy: [expectedSnapshotBlockID.toString('hex')],
				},
			},
			{
				peerId: 'peerId-2',
				options: {
					legacy: [randomSnapshotBlockID.toString('hex'), expectedSnapshotBlockID.toString('hex')],
				},
			},
		];
		// eslint-disable-next-line prefer-destructuring
		legacyBlock16270316 = blockFixtures[blockFixtures.length - 1];

		network = new Network({} as any);
		network.requestFromPeer = jest.fn();
		network.applyNodeInfo = jest.fn();

		legacyChainHandler = new LegacyChainHandler({ legacyConfig, network, logger: fakeLogger });
		await legacyChainHandler.init({
			db: new InMemoryDatabase() as never,
		});

		jest.spyOn(legacyChainHandler['_network'], 'getConnectedPeers').mockImplementation(() => {
			return peers as any;
		});

		jest
			.spyOn(legacyChainHandler['_storage'], 'getBlockByHeight')
			.mockReturnValueOnce(encodeBlock(legacyBlock16270316) as any); // we want to return blocks from this height ONCE
	});

	describe('constructor', () => {
		it('should set legacy config properties', () => {
			expect(legacyChainHandler['_legacyConfig']).toEqual(legacyConfig);
		});
	});

	describe('sync', () => {
		beforeEach(() => {
			// `getLegacyBlocksFromId` should return blocks in DESC order (starting from 16270316 (excluding) till 16270306)
			const reversedFixtures = blockFixtures
				.slice(0, blockFixtures.length - 1)
				.sort((a, b) => b.header.height - a.header.height);
			const encodedBlocks = reversedFixtures.map(block => encodeBlock(block));

			jest
				.spyOn(network, 'requestFromPeer')
				.mockReturnValueOnce({
					data: codec.encode(getBlocksFromIdResponseSchema, { blocks: encodedBlocks }),
				} as any)
				.mockReturnValueOnce({
					data: codec.encode(getBlocksFromIdResponseSchema, { blocks: [] }),
				} as any)
				.mockReturnValueOnce({
					data: codec.encode(getBlocksFromIdResponseSchema, { blocks: [] }),
				} as any);
		});
		it('should sync blocks in range for given config brackets', async () => {
			jest.spyOn(legacyChainHandler['_storage'], 'saveBlock');
			jest.spyOn(legacyChainHandler['_storage'], 'setBracketInfo');
			jest.spyOn(legacyChainHandler['_network'], 'applyNodeInfo');
			jest.spyOn(legacyChainHandler as any, '_trySyncBlocks');

			await legacyChainHandler.sync();
			// starting from 16270316 (excluding) till 16270306 = 10,
			// but we save blocks only if ```block.header.height > bracket.startHeight```
			expect(legacyChainHandler['_trySyncBlocks']).toHaveBeenCalledTimes(1);
		});
	});

	describe('_syncBlocks', () => {
		let reversedFixtures;
		let encodedBlocks: any[];
		beforeEach(() => {
			reversedFixtures = blockFixtures
				.slice(0, blockFixtures.length - 1)
				.sort((a, b) => b.header.height - a.header.height);
			encodedBlocks = reversedFixtures.map(block => encodeBlock(block));
		});
		it('should sync blocks in range for given config brackets', async () => {
			jest
				.spyOn(network, 'requestFromPeer')
				.mockReturnValueOnce({
					data: codec.encode(getBlocksFromIdResponseSchema, { blocks: encodedBlocks }),
				} as any)
				.mockReturnValueOnce({
					data: codec.encode(getBlocksFromIdResponseSchema, { blocks: [] }),
				} as any)
				.mockReturnValueOnce({
					data: codec.encode(getBlocksFromIdResponseSchema, { blocks: [] }),
				} as any);
			jest.spyOn(legacyChainHandler['_storage'], 'saveBlock');
			jest.spyOn(legacyChainHandler['_storage'], 'setBracketInfo');
			jest.spyOn(legacyChainHandler['_network'], 'applyNodeInfo');
			jest.spyOn(legacyChainHandler as any, '_trySyncBlocks');
			await legacyChainHandler['_syncBlocks'](
				legacyConfig.brackets[0],
				legacyBlock16270316.header.id as Buffer,
				0,
			);

			expect(legacyChainHandler['_storage'].saveBlock).toHaveBeenCalledTimes(10);

			// should be 1, since if `lastBlock.header.height > bracket.startHeight` is skipped
			// & only the final `_updateBracketInfo(...)` is called
			expect(legacyChainHandler['_storage'].setBracketInfo).toHaveBeenCalledTimes(1);
		});

		it('should throw error when no peers are found', async () => {
			jest.spyOn(legacyChainHandler['_network'], 'getConnectedPeers').mockImplementation(() => []);
			await expect(
				legacyChainHandler['_syncBlocks'](
					legacyConfig.brackets[0],
					legacyBlock16270316.header.id as Buffer,
					0,
				),
			).rejects.toThrow('No peer found with legacy info.: Attempting to sync again after 12000 ms');
		});

		it('should throw error when no peers are found with legacy data', async () => {
			jest.spyOn(legacyChainHandler['_network'], 'getConnectedPeers').mockImplementation(
				() =>
					[
						{
							peerId: 'peerId-1',
							options: {
								legacy: [randomSnapshotBlockID.toString('hex')],
							},
						},
					] as any,
			);
			await expect(
				legacyChainHandler['_syncBlocks'](
					legacyConfig.brackets[0],
					legacyBlock16270316.header.id as Buffer,
					0,
				),
			).rejects.toThrow('No peer found with legacy info.: Attempting to sync again after 12000 ms');
		});
	});
});
