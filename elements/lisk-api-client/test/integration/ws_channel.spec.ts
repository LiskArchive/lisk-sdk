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

import { createServer, Server } from 'http';
import * as WebSocket from 'isomorphic-ws';
import { Socket } from 'net';
import { WSChannel } from '../../src/ws_channel';

jest.unmock('isomorphic-ws');

const closeServer = async (server: WebSocket.Server | Server): Promise<void> => {
	if (server instanceof WebSocket.Server) {
		for (const cli of server.clients) {
			cli.terminate();
		}
	}
	await new Promise((resolve, reject) => {
		server.close(err => {
			if (err) {
				reject(err);
			}
			resolve(undefined);
		});
	});
};

describe('WSChannel', () => {
	describe('connect', () => {
		it('should be connect to ws server', async () => {
			const server = new WebSocket.Server({ path: '/my-path', port: 65535 });
			await new Promise(resolve => {
				server.on('listening', () => {
					resolve(undefined);
				});
			});
			const channel = new WSChannel('ws://localhost:65535/my-path');

			try {
				await expect(channel.connect()).resolves.toBeUndefined();
				expect(server.clients.size).toBe(1);
				expect([...server.clients][0].readyState).toEqual(WebSocket.OPEN);
			} catch (err) {
				console.error(err);
			} finally {
				await closeServer(server);
			}
			expect.assertions(3);
		});

		it('should timeout if ws server not responding', async () => {
			const http = createServer();
			const server = new WebSocket.Server({ path: '/my-path', noServer: true });

			// https://github.com/websockets/ws/issues/377#issuecomment-462152231
			http.on('upgrade', (request, socket, head) => {
				setTimeout(() => {
					server.handleUpgrade(request, socket as Socket, head, ws => {
						server.emit('connection', ws, request);
					});
				}, 3000);
			});

			http.listen(65535);

			const channel = new WSChannel('ws://localhost:65535/my-path');

			try {
				await expect(channel.connect()).rejects.toThrow('Could not connect in 2000ms');
				expect(server.clients.size).toBe(0);
			} finally {
				await closeServer(http);
				await closeServer(server);
			}
			expect.assertions(2);
		}, 5000);

		it('should throw error if server is not running', async () => {
			const channel = new WSChannel('ws://localhost:65534/my-path');

			await expect(channel.connect()).rejects.toThrow('connect ECONNREFUSED 127.0.0.1:65534');
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
				expect(server.clients.size).toBe(1);
				expect([...server.clients][0].readyState).toEqual(WebSocket.CLOSING);
			} finally {
				await closeServer(server);
			}
			expect.assertions(3);
		});
	});
});
