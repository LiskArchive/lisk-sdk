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

// This test will ban the probe peer. Therefore, only one test will work per application instance
describe('Public block related P2P endpoints with invalid block property', () => {
	let app: Application;
	let p2p: P2P;

	beforeAll(async () => {
		app = await createApplication('network-invalid-blocks', 'debug');
		p2p = await createProbe({
			networkId: app.networkIdentifier.toString('hex'),
			networkVersion: app.config.networkVersion,
			port: app.config.network.port,
		});
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('postBlock with invalid property', () => {
		it('should not accept the block and ban the peer', async () => {
			const { lastBlock } = app['_node']['_chain'];
			const timestamp = lastBlock.header.timestamp + app.config.genesisConfig.blockTime;
			const nextForger = await app['_node']['_chain'].getValidator(timestamp);
			const keypair = app['_node']['_forger']['_keypairs'].get(nextForger.address);
			if (!keypair) {
				throw new Error('Invalid test setup. Keypair not found');
			}
			const block = await app['_node']['_forger']['_create']({
				keypair,
				previousBlock: lastBlock,
				seedReveal: getRandomBytes(16),
				timestamp,
				transactions: [],
			});
			(block.header as any).transactionRoot = getRandomBytes(32);
			const invalidEncodedBlock = app['_node']['_chain'].dataAccess.encode(block);
			p2p.sendToPeer(
				{
					event: 'postBlock',
					data: { block: invalidEncodedBlock.toString('hex') },
				},
				getPeerID(app),
			);

			await waitNBlocks(app, 1);
			// Expect block has not changed
			expect(app['_node'].actions.getConnectedPeers()).toBeEmpty();
		});
	});
});
