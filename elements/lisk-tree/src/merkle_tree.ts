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

const LAYER_INDEX_SIZE = 1;
const NODE_INDEX_SIZE = 8;
// const NODE_HASH_SIZE = 32;

interface NodeData {
	readonly value: Buffer;
	readonly hash: Buffer;
}

// interface NodeInfo {
// 	readonly left: Buffer;
// 	readonly right: Buffer;
// 	readonly layerIndex: number;
// 	readonly nodeIndex: bigint;
// }

const generateLeafData = (value: Buffer): NodeData => {
	const leafValue = Buffer.concat(
		[LEAF_PREFIX, value],
		LEAF_PREFIX.length + value.length,
	);

	return {
		value: leafValue,
		hash: hash(leafValue),
	};
};

const generateNodeData = (
	left: Buffer,
	right: Buffer,
	layerIndex: number,
	nodeIndex: bigint,
): NodeData => {
	const layerIndexBuffer = Buffer.alloc(LAYER_INDEX_SIZE);
	const nodeIndexBuffer = Buffer.alloc(NODE_INDEX_SIZE);

	layerIndexBuffer.writeInt8(layerIndex, 0);
	nodeIndexBuffer.writeBigInt64BE(nodeIndex, 0);

	const nodeValue = Buffer.concat(
		[layerIndexBuffer, nodeIndexBuffer, left, right],
		layerIndexBuffer.length +
			nodeIndexBuffer.length +
			left.length +
			right.length,
	);
	const nodeHash = hash(
		Buffer.concat(
			[BRANCH_PREFIX, left, right],
			BRANCH_PREFIX.length + left.length + right.length,
		),
	);

	return {
		hash: nodeHash,
		value: nodeValue,
	};
};

// const getNodeInfo = (value: Buffer): NodeInfo => {
// 	const right = value.slice(-1 * NODE_HASH_SIZE);
// 	const left = value.slice(-1 * NODE_HASH_SIZE, -1 * NODE_HASH_SIZE);
// 	const layerIndex = value.readInt8(0);
// 	const nodeIndex = value.readBigInt64BE(LAYER_INDEX_SIZE);
//
// 	return {
// 		right,
// 		left,
// 		layerIndex,
// 		nodeIndex,
// 	};
// };

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
			const leaf = generateLeafData(initValues[i]);

			leafHashes.push(leaf.hash);
			this._data[leaf.hash.toString('binary')] = leaf.value;
		}

		this._root = this._build(leafHashes);
	}

	public get root(): Buffer {
		return this._root;
	}

	// eslint-disable-next-line
	// public append(_value: Buffer): { key: Buffer; value: Buffer }[] {
	// 	// const result: { key: Buffer; value: Buffer }[] = [];
	// 	// const val = leafValue(value);
	// 	// const leafHash = hash(val);
	// 	//
	// 	// this._data[leafHash.toString('binary')] = val;
	// 	//
	// 	// this._width += 1;
	// 	// result.push({ key: leafHash, value: val });
	// 	//
	// 	// return result;
	// }

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
		let layerIndex = 0;

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
				const node = generateNodeData(left, right, layerIndex, BigInt(i));
				this._data[node.hash.toString('binary')] = node.value;

				parentLayer.push(node.hash);
			}

			currentLayer = parentLayer;
			layerIndex += 1;
		}

		return currentLayer[0];
	}
}
