/*
 * Copyright © 2021 Lisk Foundation
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
 *
 */
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Database, StateDB } from '@liskhq/lisk-db';

import { EVENT_CHAIN_BLOCK_NEW } from '../engine/events';
import { Data, WaitUntilBlockHeightOptions } from './types';
import { PrefixedStateReadWriter } from '../state_machine/prefixed_state_read_writer';

export const waitUntilBlockHeight = async ({
	apiClient,
	height,
	timeout,
}: WaitUntilBlockHeightOptions): Promise<void> =>
	new Promise((resolve, reject) => {
		if (timeout) {
			setTimeout(() => {
				reject(new Error(`'waitUntilBlockHeight' timed out after ${timeout} ms`));
			}, timeout);
		}

		apiClient.subscribe(EVENT_CHAIN_BLOCK_NEW, data => {
			const { block } = data as unknown as Data;
			const { header } = apiClient.block.decode(block);

			if (header.height >= height) {
				resolve();
			}
		});
	});

// Database utils
const defaultDatabasePath = path.join(os.tmpdir(), 'lisk-framework', Date.now().toString());
export const getDBPath = (name: string, dbPath = defaultDatabasePath): string =>
	path.join(dbPath, `${name}.db`);

export const createDB = (name: string, dbPath = defaultDatabasePath): Database => {
	fs.ensureDirSync(dbPath);
	const filePath = getDBPath(name, dbPath);
	return new Database(filePath);
};

export const createStateDB = (name: string, dbPath = defaultDatabasePath): StateDB => {
	fs.ensureDirSync(dbPath);
	const filePath = getDBPath(name, dbPath);
	return new StateDB(filePath);
};

export const removeDB = (dbPath = defaultDatabasePath): void =>
	['module', 'blockchain', 'node', 'state', 'generator'].forEach(name =>
		fs.removeSync(getDBPath(name, dbPath)),
	);

export const createStoreGetter = (stateStore: PrefixedStateReadWriter) => ({
	getStore: (p1: Buffer, p2: Buffer) => stateStore.getStore(p1, p2),
});
