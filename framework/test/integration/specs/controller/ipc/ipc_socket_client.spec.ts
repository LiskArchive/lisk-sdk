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

import { resolve as pathResolve } from 'path';
import { homedir } from 'os';
import { IPCSocketServer } from '../../../../../src/controller/ipc/ipc_socket_server';
import { IPCSocketClient } from '../../../../../src/controller/ipc/ipc_socket_client';

const socketsDir = pathResolve(`${homedir()}/.lisk/devnet/tmp/sockets`);

describe('IPCSocketClient', () => {
	let server: IPCSocketServer;
	let client: IPCSocketClient;

	beforeEach(async () => {
		server = new IPCSocketServer({
			socketsDir,
		});
		client = new IPCSocketClient({
			socketsDir,
		});

		await server.start();
	});

	afterEach(() => {
		client.stop();
		server.stop();
	});

	describe('start', () => {
		it('should init socket objects and resolve if server is running', async () => {
			// Act & Assert
			await expect(client.start()).resolves.toBeUndefined();
		});

		it('should timeout if server is not running', async () => {
			// Arrange
			server.stop();

			// Act & Assert
			await expect(client.start()).rejects.toThrow(
				'IPC Socket client connection timeout. Please check if IPC server is running.',
			);
		});
	});

	describe('on', () => {
		it('should be able to subscribe and receive event', async () => {
			// Arrange
			await client.start();

			// Act & Assert
			await new Promise(resolve => {
				client.on('myEvent', data => {
					expect(data).toEqual({ data: 'myData' });
					resolve();
				});
				server.emit('myEvent', { data: 'myData' });
			});
		});

		it('should be able to subscribe and receive events on multiple clients', async () => {
			// Arrange
			const client2 = new IPCSocketClient({
				socketsDir,
			});
			await client.start();
			await client2.start();

			// Act & Assert
			server.emit('myEvent', { data: 'myData' });
			await Promise.all([
				new Promise(resolve => {
					client.on('myEvent', data => {
						expect(data).toEqual({ data: 'myData' });
						resolve();
					});
				}),

				await new Promise(resolve => {
					client2.on('myEvent', data => {
						expect(data).toEqual({ data: 'myData' });
						resolve();
					});
				}),
			]);

			// Cleanup
			client2.stop();
		});

		it('should be able to subscribe and receive events from different client', async () => {
			// Arrange
			const client2 = new IPCSocketClient({
				socketsDir,
			});
			const client3 = new IPCSocketClient({
				socketsDir,
			});
			await client.start();
			await client2.start();
			await client3.start();

			// Act & Assert
			client.emit('myEvent', { data: 'myData' });
			await Promise.all([
				new Promise(resolve => {
					client2.on('myEvent', data => {
						expect(data).toEqual({ data: 'myData' });
						resolve();
					});
				}),

				await new Promise(resolve => {
					client3.on('myEvent', data => {
						expect(data).toEqual({ data: 'myData' });
						resolve();
					});
				}),
			]);

			// Cleanup
			client2.stop();
			client3.stop();
		});

		it('should be able to subscribe and receive events from same client', async () => {
			// Arrange
			await client.start();

			// Act & Assert
			client.emit('myEvent', { data: 'myData' });
			await new Promise(resolve => {
				client.on('myEvent', data => {
					expect(data).toEqual({ data: 'myData' });
					resolve();
				});
			});
		});
	});
});
