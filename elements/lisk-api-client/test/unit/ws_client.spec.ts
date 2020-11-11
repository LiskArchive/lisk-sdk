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
 *
 */

import { EventEmitter } from 'events';
import * as WebSocket from 'isomorphic-ws';
import { WSClient } from '../../src/ws_client';

jest.mock('isomorphic-ws');

describe('WSClient', () => {
	let client: WSClient;
	// let wsMock: WSMock;
	const url = 'ws://localhost:8000/ws';

	beforeEach(async () => {
		client = new WSClient(url);

		jest.spyOn(WebSocket.prototype, 'send');

		await Promise.race([client.connect(), client['_ws']?.emit('open')]);
	});

	describe('constructor', () => {
		it('should set url', () => {
			expect(client['_url']).toEqual(url);
		});
		it('should create local emitter', () => {
			expect(client['_emitter']).toBeInstanceOf(EventEmitter);
		});
	});

	describe('subscribe', () => {
		it('should subscribe events to local emitter', () => {
			jest.spyOn(EventEmitter.prototype, 'on');
			const cb = jest.fn();

			client.subscribe('myEvent', cb);

			expect(EventEmitter.prototype.on).toHaveBeenCalledWith('myEvent', cb);
		});
	});

	describe('invoke', () => {
		it('should send jsonrpc request to ws server', async () => {
			const request = {
				jsonrpc: '2.0',
				id: client['_requestCounter'],
				method: 'myAction',
				params: {},
			};

			await client.invoke('myAction');

			expect(WebSocket.prototype.send).toHaveBeenCalledWith(
				JSON.stringify(request),
				expect.any(Function),
			);
		});

		it('should wait for the jsonrpc response from ws server', async () => {
			const request = {
				jsonrpc: '2.0',
				id: client['_requestCounter'],
				method: 'myAction',
				params: {},
			};

			const result = await client.invoke('myAction');

			// Mock implementation send request as response
			expect(result).toEqual(JSON.stringify(request));
		});

		it('should increment request counter', async () => {
			const counter = client['_requestCounter'];

			await client.invoke('myAction');

			// Mock implementation send request as response
			expect(client['_requestCounter']).toEqual(counter + 1);
		});
	});

	describe('events', () => {
		it('should emit sever message as event if it does not contain id', async () => {
			const message = { jsonrpc: '2.0', method: 'module1:my:Event', params: { prop1: 'prop1' } };
			const eventInfo = { module: 'module1', name: 'my:Event', data: { prop1: 'prop1' } };

			await expect(
				new Promise(resolve => {
					client.subscribe('module1:my:Event', event => {
						expect(event).toEqual(eventInfo);
						resolve();
					});
					client['_ws']?.emit('message', JSON.stringify(message));
				}),
			).resolves.toBeUndefined();
		});
	});
});
