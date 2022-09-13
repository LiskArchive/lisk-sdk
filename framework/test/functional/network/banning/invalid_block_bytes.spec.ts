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
// import { P2P } from '@liskhq/lisk-p2p';

// import { Application } from '../../../../src';
// import {
// 	createApplication,
// 	closeApplication,
// 	getPeerID,
// 	waitNBlocks,
// } from '../../utils/application';
// import { createProbe } from '../../utils/probe';
// import { postBlockEventSchema } from '../../../../src/node/transport/schemas';

// // This test will ban the probe peer. Therefore, only one test will work per application instance
// describe('Public block related P2P endpoints with invalid block', () => {
// 	let app: Application;
// 	let p2p: P2P;

// 	beforeAll(async () => {
// 		app = await createApplication('network-invalid-blocks');
// 		p2p = await createProbe({
// 			chainID: app.chainID.toString('hex'),
// 			networkVersion: app.config.networkVersion,
// 			port: app.config.network.port,
// 		});
// 	});

// 	afterAll(async () => {
// 		await closeApplication(app);
// 	});

// 	describe('postBlock with random block bytes', () => {
// 		it('should not accept the block and ban the peer', async () => {
// 			const invalidBytesString = Buffer.from(
// 				'17f7ca093a17c174afa4a9ac48e27c6ea08b345d325d54c5433df2a73850c04b3a2b503d04ed37b30deaa3d429dc7e6b159a',
// 				'hex',
// 			);
// 			const data = codec.encode(postBlockEventSchema, { block: invalidBytesString });

// 			p2p.sendToPeer(
// 				{
// 					event: 'postBlock',
// 					data,
// 				},
// 				getPeerID(app),
// 			);

// 			await waitNBlocks(app, 1);
// 			// Expect block has not changed
// 			expect(app['_node'].actions.getConnectedPeers()).toBeEmpty();
// 		});
// 	});
// });
