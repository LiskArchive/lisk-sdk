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
import { IPCServer } from '../../../../../src/controller/ipc/ipc_server';

const socketsDir = pathResolve(`${homedir()}/.lisk/functional/ipc_server/sockets`);

describe('IPCServer', () => {
	let server: IPCServer;

	beforeEach(() => {
		mkdirSync(socketsDir, { recursive: true });

		server = new IPCServer({
			socketsDir,
			name: 'bus',
		});
	});

	afterEach(() => {
		server.stop();
		rmdirSync(socketsDir);
	});

	describe('start', () => {
		it('should init socket objects and resolve', async () => {
			// Act && Assert
			await expect(server.start()).resolves.toBeUndefined();
		});
	});
});
