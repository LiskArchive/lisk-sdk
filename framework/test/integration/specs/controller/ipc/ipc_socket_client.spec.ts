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

const socketDir = pathResolve(`${homedir()}/.lisk/devnet/tmp/sockets`);

describe('IPCSocketClient', () => {
	let server: IPCSocketServer;
	let client: IPCSocketClient;

	beforeEach(async () => {
		server = new IPCSocketServer({
			socketDir,
		});
		client = new IPCSocketClient({
			socketDir,
		});

		await server.start();
	});

	afterEach(() => {
		client.close();
		server.close();
	});

	describe('start', () => {
		it('should init socket objects and resolve if server is running', async () => {
			// Act & Assert
			await expect(client.start()).resolves.toBeUndefined();
		});

		it('should timeout if server is not running', async () => {
			// Arrange
			server.close();

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
	});

	describe('emit', () => {
		it('should be able to emit event to socket', async () => {
			// Arrange
			await client.start();

			await new Promise(resolve => {
				server.on('myEvent', data => {
					expect(data).toEqual({ data: 'myData' });
					resolve();
				});
				client.emit('myEvent', { data: 'myData' });
			});
		});
	});
});
