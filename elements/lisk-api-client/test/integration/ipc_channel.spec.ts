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
import { resolve as pathResolve } from 'path';
import { homedir } from 'os';
import { IPCChannel } from '../../src/ipc_channel';
import { IPCServer } from '../ipc_server_util';
import { JSONRPCNotification } from '../../src/types';

describe('IPC Channel', () => {
	const socketsDir = pathResolve(`${homedir()}/.lisk/integration/ipc_client`);
	let server: IPCServer;
	let client: IPCChannel;

	beforeEach(async () => {
		mkdirSync(socketsDir, { recursive: true });

		server = new IPCServer(socketsDir);
		client = new IPCChannel(socketsDir);

		await server.start();
		await client.connect();

		server.subSocket.on('message', (eventName: string, eventValue: any) => {
			(server as any).pubSocket.send(eventName, eventValue);
		});
	});

	afterEach(async () => {
		await (client as any).disconnect();
		server.stop();
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
		let client1: IPCChannel;
		let client2: IPCChannel;
		let client3: IPCChannel;

		beforeEach(() => {
			client1 = new IPCChannel(socketsDir);
			client2 = new IPCChannel(socketsDir);
			client3 = new IPCChannel(socketsDir);
		});

		afterEach(async () => {
			await client1.disconnect();
			await client2.disconnect();
			await client3.disconnect();
		});

		it('should be able to subscribe and receive event', async () => {
			// Act & Assert
			await new Promise<void>(resolve => {
				client.subscribe('app:new:block', event => {
					expect(event).toEqual('myData');
					resolve();
				});
				server.pubSocket.send({
					jsonrpc: '2.0',
					method: 'app:new:block',
					params: 'myData',
				} as JSONRPCNotification<unknown>);
			});
		});

		it('should be able to subscribe and receive events on multiple clients', async () => {
			// Arrange
			await client2.connect();

			// Act & Assert
			server.pubSocket.send({
				jsonrpc: '2.0',
				method: 'app:new:block',
				params: 'myData',
			} as JSONRPCNotification<unknown>);
			await Promise.all([
				new Promise<void>(resolve => {
					client.subscribe('app:new:block', event => {
						expect(event).toEqual('myData');
						resolve();
					});
				}),

				await new Promise<void>(resolve => {
					client2.subscribe('app:new:block', event => {
						expect(event).toEqual('myData');
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
			(client as any)._pubSocket.send({
				jsonrpc: '2.0',
				method: 'app:new:block',
				params: 'myData',
			} as JSONRPCNotification<unknown>);
			await Promise.all([
				new Promise<void>(resolve => {
					client2.subscribe('app:new:block', event => {
						expect(event).toEqual('myData');
						resolve();
					});
				}),

				await new Promise<void>(resolve => {
					client2.subscribe('app:new:block', event => {
						expect(event).toEqual('myData');
						resolve();
					});
				}),
			]);
		});

		it('should be able to subscribe and receive events from same client', async () => {
			// Act & Assert
			client['_pubSocket'].send({
				jsonrpc: '2.0',
				method: 'app:new:block',
				params: 'myData',
			} as JSONRPCNotification<unknown>);
			await new Promise<void>(resolve => {
				client.subscribe('app:new:block', event => {
					expect(event).toEqual('myData');
					resolve();
				});
			});
		});
	});

	describe('actions', () => {
		it('client should be able to call server exposed actions', async () => {
			// Arrange
			server.rpcServer.expose('myAction', (cb: any) => {
				cb(null, 'myData');
			});

			// Act
			await new Promise<void>(resolve => {
				(client as any)._rpcClient.call('myAction', (_error: Error, data: string) => {
					// Assert
					expect(data).toEqual('myData');

					resolve();
				});
			});
		});
	});
});
