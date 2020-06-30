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
import { IPCServer } from '../../../../../src/controller/ipc/ipc_server';
import { IPCClient } from '../../../../../src/controller/ipc/ipc_client';

const socketsDir = pathResolve(`${homedir()}/.lisk/devnet/tmp/sockets`);

describe('IPCClient', () => {
	let server: IPCServer;
	let client: IPCClient;

	beforeEach(async () => {
		server = new IPCServer({
			socketsDir,
			name: 'bus',
		});
		client = new IPCClient({
			socketsDir,
			name: 'client',
			rpcServerSocketPath: server.rpcServerSocketPath,
		});

		await server.start();
		await client.start();

		server.subSocket.on('message', (eventName: string, eventValue: object) => {
			server.pubSocket.send(eventName, eventValue);
		});
	});

	afterEach(() => {
		client.stop();
		server.stop();
	});

	describe('start', () => {
		it('should init socket objects and resolve if server is running', async () => {
			// Arrange
			client.stop();

			// Act & Assert
			await expect(client.start()).resolves.toBeUndefined();
		});

		it('should timeout if server is not running', async () => {
			// Arrange
			client.stop();
			server.stop();

			// Act & Assert
			await expect(client.start()).rejects.toThrow(
				'IPC Socket client connection timeout. Please check if IPC server is running.',
			);
		});
	});

	describe('events', () => {
		it('should be able to subscribe and receive event', async () => {
			// Act & Assert
			await new Promise(resolve => {
				client.subSocket.on('message', data => {
					expect(data).toEqual('myData');
					resolve();
				});
				server.pubSocket.send('myData');
			});
		});

		it('should be able to subscribe and receive events on multiple clients', async () => {
			// Arrange
			const client2 = new IPCClient({
				socketsDir,
				name: 'client2',
				rpcServerSocketPath: server.rpcServerSocketPath,
			});
			await client2.start();

			// Act & Assert
			server.pubSocket.send('myData');
			await Promise.all([
				new Promise(resolve => {
					client.subSocket.on('message', data => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),

				await new Promise(resolve => {
					client2.subSocket.on('message', data => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),
			]);

			// Cleanup
			client2.stop();
		});

		it('should be able to subscribe and receive events from different client', async () => {
			// Arrange
			const client2 = new IPCClient({
				socketsDir,
				name: 'client2',
				rpcServerSocketPath: server.rpcServerSocketPath,
			});
			const client3 = new IPCClient({
				socketsDir,
				name: 'client3',
				rpcServerSocketPath: server.rpcServerSocketPath,
			});
			await client2.start();
			await client3.start();

			// Act & Assert
			client.pubSocket.send('myData');
			await Promise.all([
				new Promise(resolve => {
					client2.subSocket.on('message', data => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),

				await new Promise(resolve => {
					client3.subSocket.on('message', data => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),
			]);

			// Cleanup
			client2.stop();
			client3.stop();
		});

		it('should be able to subscribe and receive events from same client', async () => {
			// Act & Assert
			client.pubSocket.send('myData');
			await new Promise(resolve => {
				client.subSocket.on('message', data => {
					expect(data).toEqual('myData');
					resolve();
				});
			});
		});
	});

	describe('actions', () => {
		it('client should be able to call server exposed actions', async () => {
			// Arrange
			server.rpcServer.expose('myAction', cb => {
				cb(null, 'myData');
			});

			// Act
			await new Promise(resolve => {
				client.rpcClient.call('myAction', (_error: Error, data: string) => {
					// Assert
					expect(data).toEqual('myData');

					resolve();
				});
			});
		});
	});
});
