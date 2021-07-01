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

export class SparseMerkleTree {
	private readonly _rootHash: Buffer;
	private readonly _keyLength: number;
	public constructor(rootHash?: Buffer, keyLength = 1) {
		this._keyLength = keyLength;
		if (rootHash) {
			this._rootHash = rootHash;
		} else this._rootHash = EMPTY_HASH;
	}
	public get rootHash(): Buffer {
		return this._rootHash;
	}
	public get keyLength(): number {
		return this._keyLength;
	}
	/*
    public update() {}
    public remove() {}
    public generateSingleProof() {}
    public generateMultiProof() {}
    public verifyMultiProof() {}
    */
}
