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
/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/prefer-for-of */

import { hash } from '@liskhq/lisk-cryptography';
import { Proof } from './types';
import { EMPTY_HASH, LEAF_PREFIX, BRANCH_PREFIX } from './constants';

export class MerkleTree {
	private _root: Buffer;
	private _dataLength = 0;
	private _data: { [key: string]: Buffer } = {};

	public constructor(initValues: Buffer[] = []) {
		this._dataLength = initValues.length;
		if (this._dataLength === 0) {
			this._root = EMPTY_HASH;
			return;
		}
		const leafHashes = new Array<Buffer>(this._dataLength);
		for (let i = 0; i < this._dataLength; i += 1) {
			const value = Buffer.concat(
				[LEAF_PREFIX, initValues[i]],
				LEAF_PREFIX.length + initValues[i].length,
			);
			const key = hash(value);
			leafHashes[i] = key;
			this._data[key.toString('binary')] = value;
		}
		const height = this._height;
		let layer = leafHashes;
		for (let i = 0; i < height - 1; i += 1) {
			const currentLayerHashes: Buffer[] = [];
			const pairBranches = layer.length >>> 1;
			const remainder = layer.length & 1;
			for (let j = 0; j < pairBranches; j += 1) {
				const index = j * 2;
				const value = Buffer.concat(
					[BRANCH_PREFIX, layer[index], layer[index + 1]],
					BRANCH_PREFIX.length + layer[index].length + layer[index + 1].length,
				);
				const key = hash(value);
				this._data[key.toString('binary')] = value;
				currentLayerHashes[j] = key;
			}
			if (remainder) {
				const tmp = layer[layer.length - 1];
				layer = currentLayerHashes;
				layer.push(tmp);
			} else {
				layer = currentLayerHashes;
			}
		}

		[this._root] = layer;
	}

	public get root(): Buffer {
		return this._root;
	}

	// eslint-disable-next-line
	public append(_value: Buffer): { key: Buffer; value: Buffer }[] {
		return [];
	}

	// eslint-disable-next-line
	public generateProof(_queryData: ReadonlyArray<Buffer>): Proof {
		// eslint-disable-next-line
		return {} as any;
	}

	public clear(): void {
		this._dataLength = 0;
		this._data = {};
		this._root = EMPTY_HASH;
	}

	private get _height(): number {
		return Math.ceil(Math.log2(this._dataLength)) + 1;
	}
}
