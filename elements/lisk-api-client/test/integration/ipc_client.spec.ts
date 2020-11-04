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
import { IPCClient } from '../../src/ipc_client';
import { IPCServer } from '../ipc_server_util';

const socketsDir = pathResolve(`${homedir()}/.lisk/functional/ipc_client/sockets`);

describe('IPCClient', () => {
	let server: IPCServer;
	let client: IPCClient;

	beforeEach(async () => {
		mkdirSync(socketsDir, { recursive: true });

		server = new IPCServer(socketsDir);
		client = new IPCClient(socketsDir);

		await server.start();
		await client.connect();

		server.subSocket.on('message', (eventName: string, eventValue: any) => {
			(server as any).pubSocket.publish(eventName, eventValue);
		});
	});

	afterEach(async () => {
		await (client as any).disconnect();
		server.stop();
		rmdirSync(socketsDir);
	});

	describe('connect', () => {
		it('should init socket objects and resolve if server is running', async () => {
			// Arrange
			await client.disconnect();

			// Act & Assert
			await expect(client.connect()).resolves.toBeUndefined();
		});

		it('should timeout if server is not running', async () => {
			// Arrange
			await client.disconnect();
			server.stop();

			// Act & Assert
			await expect(client.connect()).rejects.toThrow(
				'IPC Socket client connection timeout. Please check if IPC server is running.',
			);
		});
	});

	describe('events', () => {
		let client1: IPCClient;
		let client2: IPCClient;
		let client3: IPCClient;

		beforeEach(() => {
			client1 = new IPCClient(socketsDir);
			client2 = new IPCClient(socketsDir);
			client3 = new IPCClient(socketsDir);
		});

		afterEach(async () => {
			await client1.disconnect();
			await client2.disconnect();
			await client3.disconnect();
		});

		it('should be able to subscribe and receive event', async () => {
			// Act & Assert
			await new Promise(resolve => {
				(client as any)._subSocket.on('message', (data: any) => {
					expect(data).toEqual('myData');
					resolve();
				});
				server.pubSocket.send('myData');
			});
		});

		it('should be able to subscribe and receive events on multiple clients', async () => {
			// Arrange
			await client2.connect();

			// Act & Assert
			(server as any).pubSocket.send('myData');
			await Promise.all([
				new Promise(resolve => {
					(client as any)._subSocket.on('message', (data: any) => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),

				await new Promise(resolve => {
					(client2 as any)._subSocket.on('message', (data: any) => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),
			]);
		});

		it('should be able to subscribe and receive events from different client', async () => {
			// Arrange
			await client2.connect();
			await client3.connect();

			// Act & Assert
			(client as any)._pubSocket.send('myData');
			await Promise.all([
				new Promise(resolve => {
					(client2 as any)._subSocket.on('message', (data: any) => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),

				await new Promise(resolve => {
					(client3 as any)._subSocket.on('message', (data: any) => {
						expect(data).toEqual('myData');
						resolve();
					});
				}),
			]);
		});

		it('should be able to subscribe and receive events from same client', async () => {
			// Act & Assert
			(client as any)._pubSocket.send('myData');
			await new Promise(resolve => {
				(client as any)._subSocket.on('message', (data: any) => {
					expect(data).toEqual('myData');
					resolve();
				});
			});
		});
	});

	describe('actions', () => {
		it('client should be able to call server exposed actions', async () => {
			// Arrange
			(server as any).rpcClient.expose('myAction', (cb: any) => {
				cb(null, 'myData');
			});

			// Act
			await new Promise(resolve => {
				(client as any)._rpcClient.call('myAction', (_error: Error, data: string) => {
					// Assert
					expect(data).toEqual('myData');

					resolve();
				});
			});
		});
	});
});
