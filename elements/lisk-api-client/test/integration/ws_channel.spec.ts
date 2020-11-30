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

import * as WebSocket from 'isomorphic-ws';
import { WSChannel } from '../../src/ws_channel';

jest.unmock('isomorphic-ws');

describe('WSChannel', () => {
	describe('connect', () => {
		it('should be connect to ws server', async () => {
			const server = new WebSocket.Server({ path: '/my-path', port: 65535 });
			const channel = new WSChannel('ws://localhost:65535/my-path');

			try {
				await expect(channel.connect()).resolves.toBeUndefined();
				expect(server.clients.size).toEqual(1);
				expect([...server.clients][0].readyState).toEqual(WebSocket.OPEN);
			} finally {
				server.close();
			}
			expect.assertions(3);
		});

		it('should timeout if ws server not responding', async () => {
			const verifyClient = (_: any, done: (result: boolean) => void) => {
				// Take more time to accept connection
				setTimeout(() => {
					done(true);
				}, 3000);
			};
			const server = new WebSocket.Server({ path: '/my-path', port: 65535, verifyClient });
			const channel = new WSChannel('ws://localhost:65535/my-path');

			try {
				await expect(channel.connect()).rejects.toThrow('Could not connect in 2000ms');
				expect(server.clients.size).toEqual(0);
			} finally {
				// TODO: Found that unless we disconnect channel, sever.close keep open handles.
				await channel.disconnect();
				server.close();
			}
			expect.assertions(2);
		}, 5000);

		it('should throw error if server is not running', async () => {
			const channel = new WSChannel('ws://localhost:65535/my-path');

			await expect(channel.connect()).rejects.toThrow('connect ECONNREFUSED 127.0.0.1:65535');
		});
	});

	describe('disconnect', () => {
		it('should close ws connection', async () => {
			const server = new WebSocket.Server({ path: '/my-path', port: 65535 });
			const channel = new WSChannel('ws://localhost:65535/my-path');

			await channel.connect();

			try {
				await expect(channel.disconnect()).resolves.toBeUndefined();
				// WebSocket.Server.channels are not cleaned immediately
				expect(server.clients.size).toEqual(1);
				expect([...server.clients][0].readyState).toEqual(WebSocket.CLOSING);
			} finally {
				server.close();
			}
			expect.assertions(3);
		});
	});
});
