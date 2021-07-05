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
 */

import { EMPTY_HASH } from './constants';
import { Database } from './types';

export class SparseMerkleTree {
	private readonly _db: Database;
	private readonly _rootHash: Buffer;
	private readonly _keyLength: number;
	public constructor(db: Database, rootHash?: Buffer, keyLength = 36) {
		this._db = db;
		this._keyLength = keyLength;
		this._rootHash = rootHash ?? EMPTY_HASH;
	}
	public get rootHash(): Buffer {
		return this._rootHash;
	}
	// temporary, to be removed
	public get keyLength(): number {
		return this._keyLength;
	}
	// temporary, to be removed
	public get db(): Database {
		return this._db;
	}
	/*
    public update() {}
    public remove() {}
    public generateSingleProof() {}
    public generateMultiProof() {}
    public verifyMultiProof() {}
    */
}
