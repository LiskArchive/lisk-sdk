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
const NODE_HASH_SIZE = 32;

interface NodeData {
	readonly value: Buffer;
	readonly hash: Buffer;
}

interface NodeInfo {
	readonly value: Buffer;
	readonly left: Buffer;
	readonly right: Buffer;
	readonly layerIndex: number;
	readonly nodeIndex: bigint;
}

const isLeaf = (value: Buffer): boolean =>
	LEAF_PREFIX.compare(value.slice(0, 1)) === 0;

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
		[BRANCH_PREFIX, layerIndexBuffer, nodeIndexBuffer, left, right],
		BRANCH_PREFIX.length +
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

const getNodeInfo = (value: Buffer): NodeInfo => {
	const right = value.slice(-1 * NODE_HASH_SIZE);
	const left = value.slice(-2 * NODE_HASH_SIZE, -1 * NODE_HASH_SIZE);
	const layerIndex = value.readInt8(BRANCH_PREFIX.length);
	const nodeIndex = value.readBigInt64BE(
		BRANCH_PREFIX.length + LAYER_INDEX_SIZE,
	);

	return {
		value,
		right,
		left,
		layerIndex,
		nodeIndex,
	};
};

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

	public append(value: Buffer): Buffer {
		const leaf = generateLeafData(value);

		const rootNode = getNodeInfo(this._data[this.root.toString('binary')]);
		const stack: Buffer[] = [];
		let activeNode = rootNode;

		// If tree nodes are all in pairs
		if (this._width % 2 === 0) {
			stack.push(this.root);
		} else {
			stack.push(activeNode.left);
			stack.push(activeNode.right);

			while (!isLeaf(this._data[activeNode.right.toString('binary')])) {
				activeNode = getNodeInfo(
					this._data[activeNode.right.toString('binary')],
				);
				stack.push(activeNode.right);
			}
		}

		stack.push(leaf.hash);
		this._data[leaf.hash.toString('binary')] = leaf.value;
		this._width += 1;

		while (stack.length > 1) {
			const right = stack.pop() as Buffer;
			const left = stack.pop() as Buffer;
			// TODO: Add correct layer and node index
			const node = generateNodeData(left, right, 0, BigInt(0));
			this._data[node.hash.toString('binary')] = node.value;

			stack.push(node.hash);
		}

		// eslint-disable-next-line prefer-destructuring
		this._root = stack[0];

		return this.root;
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

	public toString(): string {
		if (this._width === 0) {
			return this.root.toString('hex');
		}
		return this._printNode(this.root);
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

	private _printNode(hashValue: Buffer, level = 1): string {
		const nodeValue = this._data[hashValue.toString('binary')];

		if (isLeaf(nodeValue)) {
			return nodeValue.toString('hex');
		}

		const node = getNodeInfo(nodeValue);

		return [
			hashValue.toString('hex'),
			`├${'─'.repeat(level)} ${this._printNode(node.left, level + 1)}`,
			`├${'─'.repeat(level)} ${this._printNode(node.right, level + 1)}`,
		].join('\n');
	}
}
