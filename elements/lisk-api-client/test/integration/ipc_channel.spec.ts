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

import { mkdirSync } from 'fs';
import { resolve as pathResolve, join } from 'path';
import { homedir } from 'os';
import { IPCChannel } from '../../src/ipc_channel';
import { IPCServer } from '../ipc_server_util';

// Disable since zeromq usage in test is unstable
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('IPC Channel', () => {
	const socketsDir = pathResolve(`${homedir()}/.lisk/integration/ipc_client`);
	let server: IPCServer;
	let client: IPCChannel;

	beforeAll(async () => {
		mkdirSync(socketsDir, { recursive: true });
		server = new IPCServer(socketsDir);
		await server.start();
		const echo = async () => {
			for await (const [eventName, eventValue] of server.subSocket) {
				await server.pubSocket.send([eventName, eventValue]);
			}
		};
		echo().catch(err => console.error(err));
	});

	afterAll(() => {
		server.stop();
	});

	beforeEach(() => {
		client = new IPCChannel(socketsDir);
	});

	afterEach(async () => {
		await client.disconnect();
	});

	describe('connect', () => {
		it('should init socket objects and resolve if server is running', async () => {
			// Act & Assert
			await expect(client.connect()).resolves.toBeUndefined();
		});

		it('should timeout if server is not running', async () => {
			// Arrange
			const unknownClient = new IPCChannel(join(socketsDir, 'tmp'));

			// Act & Assert
			await expect(unknownClient.connect()).rejects.toThrow(
				'IPC Socket client connection timeout. Please check if IPC server is running.',
			);
		});
	});

	describe('events', () => {
		let client1: IPCChannel;
		let client2: IPCChannel;

		beforeEach(async () => {
			client1 = new IPCChannel(socketsDir);
			client2 = new IPCChannel(socketsDir);
			await client1.connect();
			await client2.connect();
		});

		afterEach(async () => {
			await client1.disconnect();
			await client2.disconnect();
		});

		it('should be able to subscribe and receive event', async () => {
			let resolveFn: (val: unknown) => void;
			const p = new Promise(resolve => {
				resolveFn = resolve;
			});
			await client.connect();
			// Act & Assert
			client.subscribe('app:new:block', event => {
				resolveFn(event);
			});

			await server.pubSocket.send([
				'app:new:block',
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'app:new:block',
					params: 'myData',
				}),
			]);
			await expect(p).resolves.toBe('myData');
			await client.disconnect();
		});

		it('should be able to subscribe and receive events on multiple clients', async () => {
			// Arrange

			let resolveFn1: (val: unknown) => void;
			const promise1 = new Promise(resolve => {
				resolveFn1 = resolve;
			});
			let resolveFn2: (val: unknown) => void;
			const promise2 = new Promise(resolve => {
				resolveFn2 = resolve;
			});

			client1.subscribe('app:new:block', event => {
				resolveFn1(event);
			});
			client2.subscribe('app:new:block', event => {
				resolveFn2(event);
			});
			// Act & Assert
			await server.pubSocket.send([
				'app:new:block',
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'app:new:block',
					params: 'myData',
				}),
			]);

			await expect(Promise.all([promise1, promise2])).resolves.toEqual(['myData', 'myData']);
		});
	});
});
