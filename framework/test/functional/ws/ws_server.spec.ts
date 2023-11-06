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

const getResponseFromSocket = async (request: object, wsClient: WebSocket): Promise<any> => {
	const process = async () => {
		wsClient.send(JSON.stringify(request));
		const response = await new Promise(resolve => {
			wsClient.once('message', resolve);
		});

		return JSON.parse(response as string);
	};

	if (wsClient.readyState !== WebSocket.OPEN) {
		return new Promise(resolve => {
			wsClient.on('open', () => {
				resolve(process());
			});
		});
	}

	return process();
};

describe('WebSocket server', () => {
	let app: Application;
	let wsClient: WebSocket;

	beforeAll(async () => {
		app = await createApplication('web-socket-tests');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	beforeEach(() => {
		wsClient = new WebSocket(`ws://localhost:${(app as any).config.rpc.ws.port}/ws`);
	});

	afterEach(() => {
		wsClient.close();
	});

	describe('connection', () => {
		it('should be able to connect to WS server without error', async () => {
			await expect(
				new Promise(resolve => {
					wsClient.on('open', resolve);
				}),
			).resolves.toBeUndefined();
		});

		it('should be able to ping server', async () => {
			await expect(
				new Promise(resolve => {
					wsClient.on('open', () => {
						wsClient.ping(resolve);
					});
				}),
			).resolves.toBeUndefined();
		});

		it('should ping back the clients', async () => {
			const result = await new Promise(resolve => {
				wsClient.on('ping', resolve);
			});

			expect(result).toEqual(Buffer.alloc(0));
		}, 4000);
	});

	describe('communication', () => {
		it('should respond to valid jsonrpc request', async () => {
			const request = { jsonrpc: '2.0', method: 'app_getNodeInfo', id: 6729833 };

			const result = await getResponseFromSocket(request, wsClient);

			expect(result).toContainAllKeys(['jsonrpc', 'id', 'result']);
			expect(result.jsonrpc).toEqual('2.0');
			expect(result.id).toEqual(6729833);
			expect(result.result).not.toBeUndefined();
		});

		it('should respond with invalid jsonrpc request if "id" is missing', async () => {
			const request = { jsonrpc: '2.0', method: 'app_getNodeInfo' };

			const result = await getResponseFromSocket(request, wsClient);

			expect(result).toEqual({
				jsonrpc: '2.0',
				error: { message: 'Invalid request', code: -32600 },
			});
		});

		it('should respond with Internal error if "method" is missing', async () => {
			const request = { jsonrpc: '2.0', id: 1234 };

			const result = await getResponseFromSocket(request, wsClient);

			expect(result).toEqual({
				jsonrpc: '2.0',
				error: {
					message: 'Invalid request',
					code: -32600,
				},
				id: 1234,
			});
		});

		it('should respond with Internal error request if "method" invoked is invalid', async () => {
			const request = { jsonrpc: '2.0', method: 'app_unknownMethod', id: 67879 };

			const result = await getResponseFromSocket(request, wsClient);

			expect(result).toEqual({
				jsonrpc: '2.0',
				error: {
					message: 'Internal error',
					data: "Action 'app_unknownMethod' is not registered to bus.",
					code: -32603,
				},
				id: 67879,
			});
		});
	});
});
