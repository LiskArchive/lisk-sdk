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
import * as WebSocket from 'ws';
import { createApplication, closeApplication } from '../utils/application';

import { Application } from '../../../src';

describe('WebSocket server', () => {
	let app: Application;

	beforeAll(async () => {
		app = await createApplication('webSocket-tests');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('connection', () => {
		it('should be able to connect to WS server without error', () => {
			const wsClient = new WebSocket('ws://localhost:8080/ws');

			wsClient.on('open', () => {
				wsClient.send(JSON.stringify({ lisk: 'blockchain' }));
			});

			wsClient.on('message', response => {
				const { data } = JSON.parse(response as any);
				expect(JSON.parse(data)).toEqual({ lisk: 'blockchain' });
			});
		});
	});
});
