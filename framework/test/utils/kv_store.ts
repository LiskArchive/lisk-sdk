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
import * as fs from 'fs-extra';
import { Database } from '@liskhq/lisk-db';

export const defaultPath = '/tmp/lisk-framework/test';

const getPath = (name: string): string => `${defaultPath}/${name}`;

export const createDB = (name: string) => {
	const path = getPath(name);
	fs.ensureDirSync(path);
	const forgerDBPath = getPath(name);
	return {
		path,
		nodeDB: new Database(`${path}/node.db`),
		blockchainDB: new Database(`${path}/blockchain.db`),
		forgerDBPath,
		forgerDB: new Database(`${path}/forger.db`),
	};
};

export const formatInt = (num: number | bigint): string => {
	let buf: Buffer;
	if (typeof num === 'bigint') {
		if (num < BigInt(0)) {
			throw new Error('Negative number cannot be formatted');
		}
		buf = Buffer.alloc(8);
		buf.writeBigUInt64BE(num);
	} else {
		if (num < 0) {
			throw new Error('Negative number cannot be formatted');
		}
		buf = Buffer.alloc(4);
		buf.writeUInt32BE(num, 0);
	}
	return buf.toString('binary');
};

export const removeDB = (name: string): void => fs.removeSync(getPath(name));
