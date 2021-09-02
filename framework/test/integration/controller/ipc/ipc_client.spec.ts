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
import { removeSync, mkdirSync } from 'fs-extra';
import { homedir } from 'os';
import { IPCServer } from '../../../../src/controller/ipc/ipc_server';
import { IPCClient } from '../../../../src/controller/ipc/ipc_client';

// TODO: ZeroMQ tests are unstable with jest https://github.com/zeromq/zeromq.js/issues/416
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('IPCClient', () => {
	const socketsDir = pathResolve(`${homedir()}/.lisk/integration/ipc_client/sockets`);
	let server: IPCServer;
	let client: IPCClient;

	beforeEach(() => {
		mkdirSync(socketsDir, { recursive: true });

		server = new IPCServer({
			socketsDir,
			name: 'bus',
		});
		client = new IPCClient({
			socketsDir,
			name: 'client',
			rpcServerSocketPath: server.socketPaths.rpcServer,
		});
	});

	afterAll(() => {
		client.stop();
		server.stop();
		removeSync(socketsDir);
	});

	describe('start', () => {
		afterEach(() => {
			client.stop();
			server.stop();
		});

		it('should init socket objects and resolve if server is running', async () => {
			// Act
			await server.start();
			// Assert
			await expect(client.start()).resolves.toBeUndefined();
		});

		it('should timeout if server is not running', async () => {
			// Act & Assert
			await expect(client.start()).rejects.toThrow(
				'IPC Pub Socket client connection timeout. Please check if IPC server is running.',
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
				rpcServerSocketPath: server.socketPaths.rpcServer,
			});
			client2 = new IPCClient({
				socketsDir,
				name: 'client2',
				rpcServerSocketPath: server.socketPaths.rpcServer,
			});
			client3 = new IPCClient({
				socketsDir,
				name: 'client3',
				rpcServerSocketPath: server.socketPaths.rpcServer,
			});
		});

		afterEach(() => {
			client1.stop();
			client2.stop();
			client3.stop();
			client.stop();
			server.stop();
		});

		it('should be able to subscribe and receive event', async () => {
			// Act & Assert
			let receivedMessage = '';
			await server.start();
			client.subSocket.subscribe('myData');
			await client.start();

			const listenOnClientSubscriber = async () => {
				for await (const [event] of client.subSocket) {
					receivedMessage = event.toString();
					break;
				}
			};
			const sendtoClient = async () => {
				/* Wait briefly before publishing to avoid slow joiner syndrome. */
				await new Promise(resolve => setTimeout(resolve, 25));
				await server.pubSocket.send('myData');
			};

			// Act
			await Promise.all([sendtoClient(), listenOnClientSubscriber()]);
			// Assert
			expect(receivedMessage).toEqual('myData');
		});

		it('should be able to subscribe and receive events on multiple clients', async () => {
			// Arrange
			let messageReceivedClient = '';
			let messageReceivedClient1 = '';
			await server.start();
			// Subscribe to the event
			client.subSocket.subscribe('myData');
			client1.subSocket.subscribe('myData');
			await client.start();
			await client1.start();

			// Act & Assert
			const send = async () => {
				/* Wait briefly before publishing to avoid slow joiner syndrome. */
				await new Promise(resolve => setTimeout(resolve, 25));
				await server.pubSocket.send('myData');
			};

			const listenOnClient = async () => {
				for await (const [event] of client.subSocket) {
					messageReceivedClient = event.toString();
					break;
				}
			};

			const listenOnClient1 = async () => {
				for await (const [event] of client1.subSocket) {
					messageReceivedClient1 = event.toString();
					break;
				}
			};
			await Promise.all([send(), listenOnClient(), listenOnClient1()]);
			expect(messageReceivedClient).toEqual('myData');
			expect(messageReceivedClient1).toEqual('myData');
		});

		it('should be able to subscribe and receive events to only subscribed clients', async () => {
			// Arrange
			let messageReceivedClient = '';
			let messageReceivedClient1 = '';
			let messageReceivedClient2 = '';
			let messageReceivedClient3 = '';
			await server.start();

			client.subSocket.subscribe('xyz');
			client1.subSocket.subscribe('xyz');
			client2.subSocket.subscribe('myData');
			client3.subSocket.subscribe('myData');
			await client.start();
			await client1.start();
			await client2.start();
			await client3.start();

			// Act & Assert
			const send = async () => {
				/* Wait briefly before publishing to avoid slow joiner syndrome. */
				await new Promise(resolve => setTimeout(resolve, 25));
				await server.pubSocket.send('myData');
				await server.pubSocket.send('xyz');
			};

			const listenOnClient = async () => {
				for await (const [event] of client.subSocket) {
					messageReceivedClient = event.toString();
					break;
				}
			};

			const listenOnClient1 = async () => {
				for await (const [event] of client1.subSocket) {
					messageReceivedClient1 = event.toString();
					break;
				}
			};

			const listenOnClient2 = async () => {
				for await (const [event] of client2.subSocket) {
					messageReceivedClient2 = event.toString();
					break;
				}
			};

			const listenOnClient3 = async () => {
				for await (const [event] of client3.subSocket) {
					messageReceivedClient3 = event.toString();
					break;
				}
			};
			await Promise.all([
				send(),
				listenOnClient(),
				listenOnClient1(),
				listenOnClient2(),
				listenOnClient3(),
			]);
			expect(messageReceivedClient).toEqual('xyz');
			expect(messageReceivedClient1).toEqual('xyz');
			expect(messageReceivedClient2).toEqual('myData');
			expect(messageReceivedClient3).toEqual('myData');
		});
	});

	describe('actions', () => {
		afterEach(() => {
			client.stop();
			server.stop();
		});

		it('client should be able to call server exposed actions', async () => {
			// Arrange
			let receivedResult = '';
			await server.start();
			await client.start();
			const handleRPC = async () => {
				for await (const [sender, event] of server.rpcServer) {
					await server.rpcServer.send([sender, `${event.toString()}:Result`]);
					break;
				}
			};

			const receiveRPCResponse = async () => {
				for await (const [event] of client.rpcClient) {
					receivedResult = event.toString();
					break;
				}
			};

			const requestRPC = async () => {
				await new Promise(resolve => setTimeout(resolve, 25));
				await client.rpcClient.send(['myAction']);
			};

			// Act
			await Promise.all([requestRPC(), receiveRPCResponse(), handleRPC()]);
			// Assert
			expect(receivedResult).toEqual('myAction:Result');
		});
	});
});
