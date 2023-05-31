/*
 * Copyright © 2021 Lisk Foundation
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
import { WSServer } from '../../../src/controller/ws/ws_server';
import { fakeLogger } from '../../utils/mocks';

describe('WSServer', () => {
	const port = 34567;
	let server: WSServer;
	let handler = jest.fn();
	let timer: NodeJS.Timer;

	beforeAll(() => {
		server = new WSServer({
			path: '/ws',
			port,
			host: '0.0.0.0',
		});
		server.start(fakeLogger, (socket, message) => {
			handler(socket, message);
		});
		timer = setInterval(() => {
			server.broadcast({
				method: 'app_block',
				jsonrpc: '2.0',
				params: { data: 'somehting' },
			});
			server.broadcast({
				method: 'random',
				jsonrpc: '2.0',
				params: { data: 'other' },
			});
		}, 300);
	});

	afterAll(() => {
		server.stop();
		clearInterval(timer);
	});

	beforeEach(() => {
		handler = jest.fn();
	});

	describe('topic subscription', () => {
		it('should not receive any events unless subscribed', async () => {
			const client = new WebSocket(`ws://127.0.0.1:${port}/ws`);

			await expect(
				new Promise((resolve, reject) => {
					client.on('message', msg => {
						reject(msg);
					});
					setTimeout(resolve, 1000);
				}),
			).toResolve();
		});

		it('should receive only events subscribed', async () => {
			const client = new WebSocket(`ws://127.0.0.1:${port}/ws`);
			client.on('open', () => {
				client.send(
					JSON.stringify({
						jsonrpc: '2.0',
						method: 'subscribe',
						params: { topics: ['app', 'non-existing'] },
					}),
				);
			});

			await expect(
				new Promise((resolve, reject) => {
					client.on('message', msg => {
						try {
							const parsedMsg = JSON.parse(msg.toString());
							if (parsedMsg.method === 'app_block') {
								resolve(parsedMsg);
								return;
							}
							reject(new Error('Invalid message received'));
						} catch (error) {
							reject(error);
						}
						reject(msg);
					});
					setTimeout(resolve, 1000);
				}),
			).toResolve();
		});

		it('should not receive unsubscribed events', async () => {
			const client = new WebSocket(`ws://127.0.0.1:${port}/ws`);
			client.on('open', () => {
				client.send(
					JSON.stringify({
						jsonrpc: '2.0',
						method: 'subscribe',
						params: { topics: ['app'] },
					}),
				);
			});

			await expect(
				new Promise((resolve, reject) => {
					client.on('message', msg => {
						try {
							const parsedMsg = JSON.parse(msg.toString());
							if (parsedMsg.method === 'app_block') {
								resolve(parsedMsg);
								return;
							}
							reject(new Error('Invalid message received'));
						} catch (error) {
							reject(error);
						}
						reject(msg);
					});
					setTimeout(resolve, 1000);
				}),
			).toResolve();

			client.send(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'unsubscribe',
					params: { topics: ['app'] },
				}),
			);

			await expect(
				new Promise((resolve, reject) => {
					client.on('message', msg => {
						reject(msg);
					});
					setTimeout(resolve, 1000);
				}),
			).toResolve();
		});
	});
});
