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

import { resolve } from 'path';
import { homedir } from 'os';
import { IPCSocketServer } from '../../../../../src/controller/ipc/ipc_socket_server';
import { IPCSocketClient } from '../../../../../src/controller/ipc/ipc_socket_client';

const socketDir = resolve(`${homedir()}/.lisk/devnet/tmp/sockets`);

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

	afterEach(async () => {
		await client.close();
		await server.close();
	});

	describe('start', () => {
		it('should init socket objects and resolve if server is running', async () => {
			// Act & Assert
			await expect(client.start()).resolves.toBeUndefined();
		});

		it('should timeout if server is not running', async () => {
			// Arrange
			await server.close();

			// Act & Assert
			await expect(client.start()).rejects.toThrow(
				'IPC Socket client connection timeout. Please check if IPC server is running.',
			);
		});
	});
});
