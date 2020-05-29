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

enum NodeType {
	ROOT = 'root',
	BRANCH = 'branch',
	LEAF = 'leaf',
}

interface NodeData {
	readonly value: Buffer;
	readonly hash: Buffer;
}

interface NodeInfo {
	readonly type: NodeType;
	readonly hash: Buffer;
	readonly value: Buffer;
	readonly leftHash: Buffer;
	readonly rightHash: Buffer;
	readonly layerIndex: number;
	readonly nodeIndex: bigint;
}

const isLeaf = (value: Buffer): boolean => 
	LEAF_PREFIX.compare(value.slice(0, 1)) === 0 && value.compare(Buffer.alloc(0)) !== 0;

const isAppendPath = (dataLength: number, layer: number) => {
	const multiplier = 2 ** (layer - 1);
	return ((dataLength | (multiplier - 1)) & multiplier) !== 0;
};

// LEAFPREFIX = 0x00
const generateLeaf = (value: Buffer): NodeData => {
	const leafValue = Buffer.concat(
		[LEAF_PREFIX, value],
		LEAF_PREFIX.length + value.length,
	);

	return {
		value: leafValue,
		hash: hash(leafValue),
	};
};

// BRANCHPREFIX = 0x01
const generateBranch = (
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
	private _hashToBuffer: { [key: string]: Buffer } = {};

	public constructor(initValues: Buffer[] = []) {
		this._width = initValues.length;
		if (this._width === 0) {
			this._root = EMPTY_HASH;
			return;
		}

		this._root = this._generateInitialHashToBuffer(initValues);
	}

	public get root(): Buffer {
		return this._root;
	}

	public append(value: Buffer): Buffer {
		const leaf = generateLeaf(value);

		const rootNode = getNodeInfo(
			this._hashToBuffer[this.root.toString('binary')],
		);
		const stack: Buffer[] = [];
		let activeNode = rootNode;

		// If tree nodes are all in pairs
		if (this._width % 2 === 0) {
			stack.push(this.root);
		} else {
			stack.push(activeNode.left);
			stack.push(activeNode.right);

			while (!isLeaf(this._hashToBuffer[activeNode.right.toString('binary')])) {
				activeNode = getNodeInfo(
					this._hashToBuffer[activeNode.right.toString('binary')],
				);
				stack.push(activeNode.right);
			}
		}

		stack.push(leaf.hash);
		this._hashToBuffer[leaf.hash.toString('binary')] = leaf.value;
		this._width += 1;

		while (stack.length > 1) {
			const right = stack.pop() as Buffer;
			const left = stack.pop() as Buffer;
			// TODO: Add correct layer and node index
			const node = generateBranch(left, right, 0, BigInt(0));
			this._hashToBuffer[node.hash.toString('binary')] = node.value;

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
		this._hashToBuffer = {};
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

	/*  Generates node data based on initial data set
		Stores hash and buffer in memory
		Returns initial merkle root
	*/

	private _generateInitialHashToBuffer(initValues: Buffer[]): Buffer {
		// Generate hash and buffer of leaves and store in memory
		const leafHashes = [];
		for (let i = 0; i < initValues.length; i += 1) {
			const leaf = generateLeaf(initValues[i]);

			leafHashes.push(leaf.hash);
			this._hashToBuffer[leaf.hash.toString('binary')] = leaf.value;
		}

		// Start from base layer
		let currentLayerNodes = leafHashes;
		let orphanNodeInPreviousLayer: Buffer | undefined;
		let currentLayer = 0;
		// Loop through each layer as long as there are nodes or an orphan node from previous layer
		while (
			currentLayerNodes.length > 1 ||
			orphanNodeInPreviousLayer !== undefined
		) {
			const pairs: Array<[Buffer, Buffer]> = [];

			// Make pairs from the current layer nodes
			for (let i = 0; i < currentLayerNodes.length - 1; i += 2) {
				pairs.push([currentLayerNodes[i], currentLayerNodes[i + 1]]);
			}

			// If there is one node left from pairs
			if (currentLayerNodes.length % 2 === 1) {
				// If no orphan node left from previous layer, set the last node to new orphan node
				if (orphanNodeInPreviousLayer === undefined) {
					orphanNodeInPreviousLayer =
						currentLayerNodes[currentLayerNodes.length - 1];

					// If one orphan node left from previous layer then pair with last node
				} else {
					pairs.push([
						currentLayerNodes[currentLayerNodes.length - 1],
						orphanNodeInPreviousLayer,
					]);
					orphanNodeInPreviousLayer = undefined;
				}
			}

			// Generate hash and buffer for the parent layer and store
			const parentLayerNodes = [];
			for (let i = 0; i < pairs.length; i += 1) {
				const left = pairs[i][0];
				const right = pairs[i][1];
				const node = generateBranch(left, right, currentLayer, BigInt(i));
				this._hashToBuffer[node.hash.toString('binary')] = node.value;

				parentLayerNodes.push(node.hash);
			}

			// Set current layer to parent layer
			currentLayerNodes = parentLayerNodes;
			currentLayer += 1;
		}

		return currentLayerNodes[0];
	}

	private _printNode(hashValue: Buffer, level = 1): string {
		const nodeValue = this._hashToBuffer[hashValue.toString('binary')];

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
