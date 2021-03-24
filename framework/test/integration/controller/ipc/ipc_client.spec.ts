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

import { mkdirSync, rmdirSync } from 'fs';
import { resolve as pathResolve } from 'path';
import { homedir } from 'os';
import { IPCServer } from '../../../../src/controller/ipc/ipc_server';
import { IPCClient } from '../../../../src/controller/ipc/ipc_client';

describe('IPCClient', () => {
	const socketsDir = pathResolve(`${homedir()}/.lisk/functional/ipc_client/sockets`);
	let server: IPCServer;
	let client: IPCClient;

	beforeEach(async () => {
		mkdirSync(socketsDir, { recursive: true });

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
		rmdirSync(socketsDir);
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
		let client1: IPCClient;
		let client2: IPCClient;
		let client3: IPCClient;

		beforeEach(() => {
			client1 = new IPCClient({
				socketsDir,
				name: 'client1',
				rpcServerSocketPath: server.rpcServerSocketPath,
			});
			client2 = new IPCClient({
				socketsDir,
				name: 'client2',
				rpcServerSocketPath: server.rpcServerSocketPath,
			});
			client3 = new IPCClient({
				socketsDir,
				name: 'client3',
				rpcServerSocketPath: server.rpcServerSocketPath,
			});
		});

		afterEach(() => {
			client1.stop();
			client2.stop();
			client3.stop();
		});

		it('should be able to subscribe and receive event', async () => {
			// Act & Assert
			await new Promise<void>(resolve => {
				client.subSocket.on('message', data => {
					expect(data).toEqual('myData');
					resolve();
				});
				server.pubSocket.send('myData');
			});
		});

		it('should be able to subscribe and receive events on multiple clients', async () => {
			// Arrange
			await client2.start();

			// Act & Assert
			server.pubSocket.send('myData');
			await Promise.all([
				new Promise<void>(resolve => {
					client.subSocket.on('message', data => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),

				await new Promise<void>(resolve => {
					client2.subSocket.on('message', data => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),
			]);
		});

		it('should be able to subscribe and receive events from different client', async () => {
			// Arrange
			await client2.start();
			await client3.start();

			// Act & Assert
			client.pubSocket.send('myData');
			await Promise.all([
				new Promise<void>(resolve => {
					client2.subSocket.on('message', data => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),

				await new Promise<void>(resolve => {
					client3.subSocket.on('message', data => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),
			]);
		});

		it('should be able to subscribe and receive events from same client', async () => {
			// Act & Assert
			client.pubSocket.send('myData');
			await new Promise<void>(resolve => {
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
			await new Promise<void>(resolve => {
				client.rpcClient.call('myAction', (_error: Error, data: string) => {
					// Assert
					expect(data).toEqual('myData');

					resolve();
				});
			});
		});
	});
});
