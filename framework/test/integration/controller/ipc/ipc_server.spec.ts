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

import { removeSync, mkdirSync } from 'fs-extra';
import { resolve as pathResolve } from 'path';
import { homedir } from 'os';
import { IPCServer } from '../../../../src/controller/ipc/ipc_server';
import { IPCClient } from '../../../../src/controller/ipc/ipc_client';

// TODO: ZeroMQ tests are unstable with jest https://github.com/zeromq/zeromq.js/issues/416
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('IPCServer', () => {
	const socketsDir = pathResolve(`${homedir()}/.lisk/integration/ipc_server/sockets`);
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

	afterEach(() => {
		client.stop();
		server.stop();
	});

	afterAll(() => {
		removeSync(socketsDir);
	});

	describe('start', () => {
		afterEach(() => {
			client.stop();
			server.stop();
		});

		it('should init socket objects and resolve', async () => {
			// Act && Assert
			await expect(server.start()).resolves.toBeUndefined();
			await expect(client.start()).resolves.toBeUndefined();
		});

		it('Should send and receive from client', async () => {
			// Arrange
			let receivedMessage = '';
			await server.start();
			await client.start();

			const receive = async () => {
				for await (const [_sender, rpc] of server.rpcServer) {
					if (rpc.toString() === 'hello') {
						receivedMessage = rpc.toString();
						break;
					}
				}
			};

			const send = async () => {
				/* Wait briefly before publishing to avoid slow joiner syndrome. */
				await new Promise(resolve => setTimeout(resolve, 25));
				await client.rpcClient.send(['hello']);
			};

			// Act
			await Promise.all([send(), receive()]);
			// Assert
			expect(receivedMessage).toEqual('hello');
		});
	});
});
