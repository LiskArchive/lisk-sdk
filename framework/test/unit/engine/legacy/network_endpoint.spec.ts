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
import { Block } from '@liskhq/lisk-chain';
import { Database, InMemoryDatabase } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { LegacyNetworkEndpoint } from '../../../../src/engine/legacy/network_endpoint';
import { loggerMock } from '../../../../src/testing/mocks';
import { Network } from '../../../../src/engine/network';
import { getBlocksFromIdResponseSchema } from '../../../../src/engine/consensus/schema';

import { getLegacyBlockHeadersRangeV2 } from './fixtures';
import { decodeBlockHeader } from '../../../../src/engine/legacy/codec';
import { getLegacyBlocksFromIdRequestSchema } from '../../../../src/engine/legacy/schemas';

describe('Legacy P2P network endpoint', () => {
	const defaultPeerID = 'peer-id';

	let network: Network;
	let db: Database;
	let endpoint: LegacyNetworkEndpoint;

	beforeEach(() => {
		network = {
			applyPenaltyOnPeer: jest.fn(),
		} as unknown as Network;
		db = new InMemoryDatabase() as unknown as Database;

		endpoint = new LegacyNetworkEndpoint({
			logger: loggerMock,
			network,
			db,
		});
	});

	afterAll(() => {
		db.close();
	});

	describe('handleRPCGetLegacyBlocksFromId', () => {
		afterEach(async () => {
			await db.clear();
		});

		it('should apply penalty on the peer when data format is invalid', async () => {
			const invalidBytes = Buffer.from([244, 21, 21]);
			await expect(
				endpoint.handleRPCGetLegacyBlocksFromID(invalidBytes, defaultPeerID),
			).rejects.toThrow();
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledTimes(1);
		});

		it("should return empty list if ID doesn't exist", async () => {
			const blockID = utils.getRandomBytes(32);
			const snapshotBlockID = utils.getRandomBytes(32);
			const requestPayload = codec.encode(getLegacyBlocksFromIdRequestSchema, {
				blockID,
				snapshotBlockID,
			});
			await endpoint._storage.setLegacyChainBracketInfo(snapshotBlockID, {
				lastBlockHeight: 100,
				snapshotBlockHeight: 200,
				startHeight: 50,
			});
			const blocks = await endpoint.handleRPCGetLegacyBlocksFromID(requestPayload, defaultPeerID);
			expect(blocks).toEqual(codec.encode(getBlocksFromIdResponseSchema, { blocks: [] }));
		});

		it('should return 100 blocks from the requested ID', async () => {
			const requestedHeight = 110;
			// 100 blocks including the requested block ID
			const blockHeaders = getLegacyBlockHeadersRangeV2(requestedHeight, 100);

			const requestedBlockHeader = decodeBlockHeader(blockHeaders[0]);

			const { id: requestedBlockID } = requestedBlockHeader;

			// Save blocks to the database
			for (let i = 0; i < blockHeaders.length; i += 1) {
				const blockHeader = blockHeaders[i];
				await endpoint['_storage'].saveBlock(
					utils.hash(blockHeader),
					requestedHeight - i,
					blockHeader,
					[],
				);
			}

			const snapshotBlockID = utils.getRandomBytes(32);
			const encodedRequest = codec.encode(getLegacyBlocksFromIdRequestSchema, {
				blockID: requestedBlockID,
				snapshotBlockID,
			} as never);
			await endpoint._storage.setLegacyChainBracketInfo(snapshotBlockID, {
				lastBlockHeight: 100,
				snapshotBlockHeight: 200,
				startHeight: requestedHeight - 101,
			});
			const blocksReceived = await endpoint.handleRPCGetLegacyBlocksFromID(
				encodedRequest,
				defaultPeerID,
			);
			expect(
				codec.decode<{ blocks: Block[] }>(getBlocksFromIdResponseSchema, blocksReceived).blocks,
			).toHaveLength(100);
		});
	});
});
