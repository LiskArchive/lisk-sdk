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
	value[0] === LEAF_PREFIX[0] && value.compare(Buffer.alloc(0)) !== 0;

export class MerkleTree {
	private _root: Buffer;
	private _width = 0;

	// Object holds data in format { [hash]: value }
	private _hashToBuffer: { [key: string]: Buffer } = {};

	public constructor(initValues: Buffer[] = []) {
		if (initValues.length === 0) {
			this._root = EMPTY_HASH;
			return;
		}

		this._root = this._build(initValues);
	}

	public get root(): Buffer {
		return this._root;
	}

	public getNode(nodeHash: Buffer): NodeInfo {
		const value = this._hashToBuffer[nodeHash.toString('binary')];
		// eslint-disable-next-line
		if (!value) {
			throw new Error(
				`Hash does not exist in merkle tree: ${nodeHash.toString('binary')}`,
			);
		}

		let type: NodeType;
		if (this._root.compare(nodeHash) === 0) {
			type = NodeType.ROOT;
		} else if (isLeaf(value)) {
			type = NodeType.LEAF;
		} else {
			type = NodeType.BRANCH;
		}
		const layerIndex = type === NodeType.LEAF ? 0 : value.readInt8(1);
		const nodeIndex =
			type === NodeType.BRANCH
				? value.readBigInt64BE(LAYER_INDEX_SIZE + 1)
				: BigInt(0);
		const rightHash =
			type !== NodeType.LEAF
				? value.slice(-1 * NODE_HASH_SIZE)
				: Buffer.alloc(0);
		const leftHash =
			type !== NodeType.LEAF
				? value.slice(-2 * NODE_HASH_SIZE, -1 * NODE_HASH_SIZE)
				: Buffer.alloc(0);

		return {
			type,
			hash: nodeHash,
			value,
			layerIndex,
			nodeIndex,
			rightHash,
			leftHash,
		};
	}

	public append(value: Buffer): Buffer {
		if (this._width === 0) {
			const leaf = this._generateLeaf(value);
			this._root = leaf.hash;
			this._width += 1;
			return leaf.hash;
		}

		const appendPath: NodeInfo[] = [];
		let currentNode = this.getNode(this._root);

		// Create the appendPath:
		// We start from the root layer and traverse each layer down the tree on the right side
		// eslint-disable-next-line
		while (true) {
			if (this._width === 2 ** (this._getHeight() - 1)) {
				appendPath.push(currentNode);
				break;
			}
			// if layer has odd nodes and current node is odd (hence index is even)
			const currentLayer = currentNode.layerIndex;
			let d = this._width >> currentLayer;
			if (d % 2 === 1 && currentNode.nodeIndex % BigInt(2) === BigInt(0)) {
				appendPath.push(currentNode);
			}
			// if node is leaf, break
			if (currentNode.type === NodeType.LEAF) {
				break;
			}
			// if layer below is odd numbered, push left child
			d = this._width >> (currentLayer - 1);
			if (d % 2 === 1) {
				const leftNode = this.getNode(currentNode.leftHash);
				appendPath.push(leftNode);
			}

			// go to right child
			currentNode = this.getNode(currentNode.rightHash);
		}
		const appendData = this._generateLeaf(value);
		const appendNode = this.getNode(appendData.hash);
		appendPath.push(this.getNode(appendNode.hash));
		// Loop through appendPath from the base layer
		// Generate new branch nodes and push to appendPath
		// Last element remaining is new root
		while (appendPath.length > 1) {
			const rightNodeInfo = appendPath.pop();
			const leftNodeInfo = appendPath.pop();
			// FIXME: Add correct nodeIndex:  get left node index + 1
			const newBranchNode = this._generateNode(
				(leftNodeInfo as NodeInfo).hash,
				(rightNodeInfo as NodeInfo).hash,
				(leftNodeInfo as NodeInfo).layerIndex + 1,
				(leftNodeInfo as NodeInfo).nodeIndex + BigInt(1),
			);
			appendPath.push(this.getNode(newBranchNode.hash));
		}
		this._root = appendPath[0].hash;
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

	public getData(): object[] {
		return Object.keys(this._hashToBuffer).map(key =>
			this.getNode(Buffer.from(key, 'binary')),
		);
	}

	public toString(): string {
		if (this._width === 0) {
			return this.root.toString('hex');
		}
		return this._printNode(this.root);
	}

	private _getHeight(): number {
		return Math.ceil(Math.log2(this._width)) + 1;
	}

	private _generateLeaf(value: Buffer): NodeData {
		const leafValue = Buffer.concat(
			[LEAF_PREFIX, value],
			LEAF_PREFIX.length + value.length,
		);
		const leafHash = hash(leafValue);
		this._hashToBuffer[leafHash.toString('binary')] = leafValue;
		this._width += 1;

		return {
			value: leafValue,
			hash: hash(leafValue),
		};
	}

	private _generateNode(
		leftHashBuffer: Buffer,
		rightHashBuffer: Buffer,
		layerIndex: number,
		nodeIndex: bigint,
	): NodeData {
		const layerIndexBuffer = Buffer.alloc(LAYER_INDEX_SIZE);
		const nodeIndexBuffer = Buffer.alloc(NODE_INDEX_SIZE);
		layerIndexBuffer.writeInt8(layerIndex, 0);
		nodeIndexBuffer.writeBigInt64BE(nodeIndex, 0);

		const branchValue = Buffer.concat(
			[
				BRANCH_PREFIX,
				layerIndexBuffer,
				nodeIndexBuffer,
				leftHashBuffer,
				rightHashBuffer,
			],
			BRANCH_PREFIX.length +
				layerIndexBuffer.length +
				nodeIndexBuffer.length +
				leftHashBuffer.length +
				rightHashBuffer.length,
		);
		const branchHash = hash(
			Buffer.concat(
				[BRANCH_PREFIX, leftHashBuffer, rightHashBuffer],
				BRANCH_PREFIX.length + leftHashBuffer.length + rightHashBuffer.length,
			),
		);
		this._hashToBuffer[branchHash.toString('binary')] = branchValue;

		return {
			hash: branchHash,
			value: branchValue,
		};
	}

	private _build(initValues: Buffer[]): Buffer {
		// Generate hash and buffer of leaves and store in memory
		const leafHashes = [];
		for (let i = 0; i < initValues.length; i += 1) {
			const leaf = this._generateLeaf(initValues[i]);
			leafHashes.push(leaf.hash);
		}

		// Start from base layer
		let currentLayerIndex = 0;
		let currentLayerHashes = leafHashes;
		let orphanNodeHashInPreviousLayer: Buffer | undefined;
		// Loop through each layer as long as there are nodes or an orphan node from previous layer
		while (
			currentLayerHashes.length > 1 ||
			orphanNodeHashInPreviousLayer !== undefined
		) {
			const pairsOfHashes: Array<[Buffer, Buffer]> = [];

			// Make pairs from the current layer nodes
			for (let i = 0; i < currentLayerHashes.length - 1; i += 2) {
				pairsOfHashes.push([currentLayerHashes[i], currentLayerHashes[i + 1]]);
			}

			// If there is one node left from pairs
			if (currentLayerHashes.length % 2 === 1) {
				// If no orphan node left from previous layer, set the last node to new orphan node
				if (orphanNodeHashInPreviousLayer === undefined) {
					orphanNodeHashInPreviousLayer =
						currentLayerHashes[currentLayerHashes.length - 1];

					// If one orphan node left from previous layer then pair with last node
				} else {
					pairsOfHashes.push([
						currentLayerHashes[currentLayerHashes.length - 1],
						orphanNodeHashInPreviousLayer,
					]);
					orphanNodeHashInPreviousLayer = undefined;
				}
			}

			// Generate hash and buffer for the parent layer and store
			const parentLayerHashes = [];
			for (let i = 0; i < pairsOfHashes.length; i += 1) {
				const leftHash = pairsOfHashes[i][0];
				const rightHash = pairsOfHashes[i][1];
				const node = this._generateNode(
					leftHash,
					rightHash,
					currentLayerIndex + 1,
					BigInt(i),
				);

				parentLayerHashes.push(node.hash);
			}

			// Set current layer to parent layer
			currentLayerHashes = parentLayerHashes;
			currentLayerIndex += 1;
		}

		return currentLayerHashes[0];
	}

	private _printNode(hashValue: Buffer, level = 1): string {
		const nodeValue = this._hashToBuffer[hashValue.toString('binary')];

		if (isLeaf(nodeValue)) {
			return nodeValue.toString('hex');
		}

		const node = this.getNode(nodeValue);

		return [
			hashValue.toString('hex'),
			`├${'─'.repeat(level)} ${this._printNode(node.leftHash, level + 1)}`,
			`├${'─'.repeat(level)} ${this._printNode(node.rightHash, level + 1)}`,
		].join('\n');
	}
}
