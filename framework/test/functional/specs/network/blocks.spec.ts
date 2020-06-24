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
import { P2P } from '@liskhq/lisk-p2p';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { Application } from '../../../../src';
import {
	createApplication,
	closeApplication,
	getPeerID,
	waitNBlocks,
} from '../../utils/application';
import { createProbe } from '../../utils/probe';

describe('Public block related P2P endpoints', () => {
	let app: Application;
	let p2p: P2P;

	beforeAll(async () => {
		app = await createApplication('network-blocks');
		p2p = await createProbe(app.config);
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('getLastBlock', () => {
		it('should return decodable block', async () => {
			const { data } = await p2p.requestFromPeer(
				{
					procedure: 'getLastBlock',
				},
				getPeerID(app),
			);
			const decodedBlock = app['_node']['_chain'].dataAccess.decode(
				Buffer.from(data as string, 'base64'),
			);
			expect(decodedBlock.header.height).toBeGreaterThan(1);
		});
	});

	describe('getBlocksFromId', () => {
		it('should return decodable block', async () => {
			const { data } = (await p2p.requestFromPeer(
				{
					procedure: 'getBlocksFromId',
					data: {
						blockId: app['_node']['_chain'].genesisBlock.header.id.toString(
							'base64',
						),
					},
				},
				getPeerID(app),
			)) as { data: string[] };
			expect.assertions(data.length + 1);
			expect(data.length).toBeGreaterThan(0);
			for (const id of data) {
				const decodedBlock = app['_node']['_chain'].dataAccess.decode(
					Buffer.from(id, 'base64'),
				);
				expect(decodedBlock.header.height).toBeGreaterThan(0);
			}
		});

		it('should be rejected if blockId does not exist', async () => {
			await expect(
				p2p.requestFromPeer(
					{
						procedure: 'getBlocksFromId',
						data: {
							blockId: getRandomBytes(32).toString('base64'),
						},
					},
					getPeerID(app),
				),
			).rejects.toThrow('does not exist');
		});
	});

	describe('getHighestCommonBlock', () => {
		it('should return decodable block', async () => {
			const { data } = await p2p.requestFromPeer(
				{
					procedure: 'getHighestCommonBlock',
					data: {
						ids: [
							app['_node']['_chain'].genesisBlock.header.id.toString('base64'),
							getRandomBytes(32).toString('base64'),
						],
					},
				},
				getPeerID(app),
			);
			const decodedBlock = app['_node']['_chain'].dataAccess.decodeBlockHeader(
				Buffer.from(data as string, 'base64'),
			);
			expect(decodedBlock.version).toEqual(0);
			expect(decodedBlock.height).toEqual(0);
		});

		it('should return undefined', async () => {
			const { data } = await p2p.requestFromPeer(
				{
					procedure: 'getHighestCommonBlock',
					data: {
						ids: [getRandomBytes(32).toString('base64')],
					},
				},
				getPeerID(app),
			);
			expect(data).toBeUndefined();
		});
	});

	describe('postBlock', () => {
		it('should not fail if valid block is sent', async () => {
			const { lastBlock } = app['_node']['_chain'];
			const encodedBlock = app['_node']['_chain'].dataAccess.encode(lastBlock);
			p2p.sendToPeer(
				{
					event: 'postBlock',
					data: { block: encodedBlock.toString('base64') },
				},
				getPeerID(app),
			);

			await waitNBlocks(app, 1);
			// Expect next block to be forged properly
			expect(app['_node']['_chain'].lastBlock.header.id).not.toEqual(
				lastBlock.header.id,
			);
		});
	});
});
