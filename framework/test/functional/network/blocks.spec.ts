/*
 * Copyright © 2020 Lisk Foundation
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
// TODO: Fix the test when functional test is fixed https://github.com/LiskHQ/lisk-sdk/issues/7209

// import { codec } from '@liskhq/lisk-codec';
// import { utils } from '@liskhq/lisk-cryptography';
// import { P2P } from '@liskhq/lisk-p2p';

// import { Application } from '../../../src';
// import { createApplication, closeApplication, getPeerID, waitNBlocks } from '../utils/application';
// import { createProbe } from '../utils/probe';
// import {
// 	getBlocksFromIdRequestSchema,
// 	getBlocksFromIdResponseSchema,
// 	getHighestCommonBlockRequestSchema,
// 	getHighestCommonBlockResponseSchema,
// 	postBlockEventSchema,
// } from '../../../src/node/transport/schemas';

// const encodeBlockId = (blockId: Buffer) => codec.encode(getBlocksFromIdRequestSchema, { blockId });
// const decodeBlocks = (data: Buffer) =>
// 	codec.decode<{ blocks: Buffer[] }>(getBlocksFromIdResponseSchema, data);

// const encodeBlockIds = (ids: Buffer[]) => codec.encode(getHighestCommonBlockRequestSchema, { ids });

// describe('Public block related P2P endpoints', () => {
// 	let app: Application;
// 	let p2p: P2P;

// 	beforeAll(async () => {
// 		app = await createApplication('network-blocks');
// 		p2p = await createProbe({
// 			chainID: app.chainID.toString('hex'),
// 			networkVersion: app.config.networkVersion,
// 			port: app.config.network.port,
// 		});
// 	});

// 	afterAll(async () => {
// 		await closeApplication(app);
// 	});

// 	describe('getLastBlock', () => {
// 		it('should return decodable block', async () => {
// 			const { data } = await p2p.requestFromPeer(
// 				{
// 					procedure: 'getLastBlock',
// 				},
// 				getPeerID(app),
// 			);
// 			const decodedBlock = app['_node']['_chain'].dataAccess.decode(data as Buffer);
// 			expect(decodedBlock.header.height).toBeGreaterThan(1);
// 		});
// 	});

// 	describe('getBlocksFromId', () => {
// 		it('should return decodable block', async () => {
// 			const genesisBlockHeader = await app['_node']['_chain'].dataAccess.getBlockHeaderByHeight(0);
// 			const blockId = encodeBlockId(genesisBlockHeader.id);
// 			const { data } = (await p2p.requestFromPeer(
// 				{
// 					procedure: 'getBlocksFromId',
// 					data: blockId,
// 				},
// 				getPeerID(app),
// 			)) as { data: Buffer };
// 			const { blocks } = decodeBlocks(data);

// 			expect.assertions(blocks.length + 1);
// 			expect(blocks.length).toBeGreaterThan(0);
// 			for (const block of blocks) {
// 				const decodedBlock = app['_node']['_chain'].dataAccess.decode(block);
// 				expect(decodedBlock.header.height).toBeGreaterThan(0);
// 			}
// 		});

// 		it('should be rejected if blockId does not exist', async () => {
// 			const blockId = encodeBlockId(utils.getRandomBytes(32));

// 			await expect(
// 				p2p.requestFromPeer(
// 					{
// 						procedure: 'getBlocksFromId',
// 						data: blockId,
// 					},
// 					getPeerID(app),
// 				),
// 			).rejects.toThrow('does not exist');
// 		});
// 	});

// 	describe('getHighestCommonBlock', () => {
// 		it('should return decodable block', async () => {
// 			const ids = [app['_node']['_chain'].lastBlock.header.id, utils.getRandomBytes(32)];
// 			const blockIds = encodeBlockIds(ids);
// 			const { data } = await p2p.requestFromPeer(
// 				{
// 					procedure: 'getHighestCommonBlock',
// 					data: blockIds,
// 				},
// 				getPeerID(app),
// 			);
// 			const { id } = codec.decode<{ id: Buffer }>(
// 				getHighestCommonBlockResponseSchema,
// 				data as Buffer,
// 			);

// 			expect(id).toEqual(ids[0]);
// 		});

// 		it('should return undefined', async () => {
// 			const ids = [utils.getRandomBytes(32)];
// 			const blockIds = encodeBlockIds(ids);
// 			const { data } = await p2p.requestFromPeer(
// 				{
// 					procedure: 'getHighestCommonBlock',
// 					data: blockIds,
// 				},
// 				getPeerID(app),
// 			);
// 			expect(data).toEqual(
// 				codec.encode(getHighestCommonBlockResponseSchema, { id: Buffer.alloc(0) }),
// 			);
// 		});
// 	});

// 	describe('postBlock', () => {
// 		it('should not fail if valid block is sent', async () => {
// 			const { lastBlock } = app['_node']['_chain'];
// 			const encodedBlock = app['_node']['_chain'].dataAccess.encode(lastBlock);
// 			const data = codec.encode(postBlockEventSchema, { block: encodedBlock });
// 			p2p.sendToPeer(
// 				{
// 					event: 'postBlock',
// 					data,
// 				},
// 				getPeerID(app),
// 			);

// 			await waitNBlocks(app, 1);
// 			// Expect next block to be forged properly
// 			expect(app['_node']['_chain'].lastBlock.header.id).not.toEqual(lastBlock.header.id);
// 		});
// 	});
// });
