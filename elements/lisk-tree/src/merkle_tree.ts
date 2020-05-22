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

const leafValue = (value: Buffer): Buffer =>
	Buffer.concat([LEAF_PREFIX, value], LEAF_PREFIX.length + value.length);

const branchValue = (left: Buffer, right: Buffer): Buffer =>
	Buffer.concat(
		[BRANCH_PREFIX, left, right],
		BRANCH_PREFIX.length + left.length + right.length,
	);

export class MerkleTree {
	private _root: Buffer;
	private _width = 0;

	// Object holds data in format { [hash]: value }
	private _data: { [key: string]: Buffer } = {};

	public constructor(initValues: Buffer[] = []) {
		this._width = initValues.length;
		if (this._width === 0) {
			this._root = EMPTY_HASH;
			return;
		}

		const leafHashes = [];
		for (let i = 0; i < initValues.length; i += 1) {
			const value = leafValue(initValues[i]);
			const key = hash(value);
			this._data[key.toString('binary')] = value;
			leafHashes.push(key);
		}

		this._root = this._build(leafHashes);
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
		this._width = 0;
		this._data = {};
		this._root = EMPTY_HASH;
	}

	// private _getHeight(): number {
	// 	return Math.ceil(Math.log2(this._width)) + 1;
	// }

	private _build(nodes: Buffer[]): Buffer {
		let currentLayer = nodes;
		let orphanNodeInPreviousLayer: Buffer | undefined;

		while (currentLayer.length > 1 || orphanNodeInPreviousLayer !== undefined) {
			const pairs: Array<[Buffer, Buffer]> = [];

			// Make pairs from the nodes
			for (let i = 0; i < currentLayer.length - 1; i += 2) {
				pairs.push([currentLayer[i], currentLayer[i + 1]]);
			}

			// If there is one node left from pairs
			if (currentLayer.length % 2 === 1) {
				// If no orphan node left from previous layer
				if (orphanNodeInPreviousLayer === undefined) {
					orphanNodeInPreviousLayer = currentLayer[currentLayer.length - 1];

					// If one orphan node left from previous layer then pair
				} else {
					pairs.push([
						currentLayer[currentLayer.length - 1],
						orphanNodeInPreviousLayer,
					]);
					orphanNodeInPreviousLayer = undefined;
				}
			}

			const parentLayer = [];
			for (let i = 0; i < pairs.length; i += 1) {
				const left = pairs[i][0];
				const right = pairs[i][1];
				const value = branchValue(left, right);
				const key = hash(value);
				this._data[key.toString('binary')] = value;

				parentLayer.push(key);
			}

			currentLayer = parentLayer;
		}

		return currentLayer[0];
	}
}
