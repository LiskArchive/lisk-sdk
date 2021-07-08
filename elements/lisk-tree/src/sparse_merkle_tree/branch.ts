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

import { hash } from '@liskhq/lisk-cryptography';
import { branchDataBuffer } from './utils';
import { NodeSide } from './constants';

export class Branch {
	private _leftHash: Buffer;
	private _rightHash: Buffer;
	private _hash: Buffer;
	private _data: Buffer;

	public constructor(leftHash: Buffer, rightHash: Buffer) {
		this._leftHash = leftHash;
		this._rightHash = rightHash;
		this._data = branchDataBuffer(this._leftHash, this._rightHash);
		this._hash = hash(this._data);
	}

	public get hash() {
		return this._hash;
	}
	public get data() {
		return this._data;
	}
	public get leftHash() {
		return this._leftHash;
	}
	public get rightHash() {
		return this._rightHash;
	}

	public update(newChild: Buffer, nodeSide: NodeSide) {
		if (nodeSide === NodeSide.LEFT) {
			this._leftHash = newChild;
		} else {
			this._rightHash = newChild;
		}
		this._data = branchDataBuffer(this.leftHash, this.rightHash);
		this._hash = hash(this._data);
	}
}
