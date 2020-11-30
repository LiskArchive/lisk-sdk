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
import { Application } from '../../../../src';
import {
	createApplication,
	closeApplication,
	getPeerID,
	waitNBlocks,
} from '../../utils/application';
import { createProbe } from '../../utils/probe';

// This test will ban the probe peer. Therefore, only one test will work per application instance
describe('Event endpoint that is not registered', () => {
	let app: Application;
	let p2p: P2P;

	beforeAll(async () => {
		app = await createApplication('network-non-registered-event');
		p2p = await createProbe({
			networkIdentifier: app.networkIdentifier.toString('hex'),
			networkVersion: app.config.networkVersion,
			port: app.config.network.port,
		});
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('Send event which is not registered', () => {
		it('should ban the peer', async () => {
			p2p.sendToPeer(
				{
					event: 'non-existing-endpoint',
					data: { invalid: 'data' },
				},
				getPeerID(app),
			);

			await waitNBlocks(app, 1);
			// Expect block has not changed
			expect(app['_node'].actions.getConnectedPeers()).toBeEmpty();
		});
	});
});
