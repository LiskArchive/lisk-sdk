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
import { dataStructures } from '@liskhq/lisk-utils';
import {
	LAYER_INDEX_SIZE,
	NODE_INDEX_SIZE,
	NODE_HASH_SIZE,
	EMPTY_HASH,
	LEAF_PREFIX,
	BRANCH_PREFIX,
} from './constants';
import { NodeData, NodeInfo, NodeType, NodeSide, Proof } from './types';
import { generateHash, getBinaryString, isLeaf, getPairLocation } from './utils';

export class MerkleTree {
	private _root: Buffer;
	private _width = 0;
	private readonly _preHashedLeaf: boolean;

	// Object holds data in format { [hash]: value }
	private _hashToValueMap: { [key: string]: Buffer | undefined } = {};
	private _locationToHashMap: { [key: string]: Buffer | undefined } = {};

	public constructor(initValues: Buffer[] = [], options?: { preHashedLeaf: boolean }) {
		if (initValues.length <= 1) {
			const rootNode = initValues.length
				? this._generateLeaf(initValues[0], 0)
				: { hash: EMPTY_HASH, value: Buffer.alloc(0) };
			this._root = rootNode.hash;
			this._hashToValueMap[this._root.toString('binary')] = rootNode.value;
			this._locationToHashMap[`${getBinaryString(0, this._getHeight())}`] = this._root;
			this._width = initValues.length ? 1 : 0;
			this._preHashedLeaf = options?.preHashedLeaf ?? false;
			return;
		}

		this._preHashedLeaf = options?.preHashedLeaf ?? false;
		this._root = this._build(initValues);
	}

	public get root(): Buffer {
		return this._root;
	}

	public getNode(nodeHash: Buffer): NodeInfo {
		const value = this._hashToValueMap[nodeHash.toString('binary')];

		if (!value) {
			throw new Error(`Hash does not exist in merkle tree: ${nodeHash.toString('hex')}`);
		}

		const type = isLeaf(value) ? NodeType.LEAF : NodeType.BRANCH;
		const layerIndex = type === NodeType.LEAF ? 0 : value.readInt8(BRANCH_PREFIX.length);
		const nodeIndex =
			type === NodeType.BRANCH
				? value.readInt32BE(BRANCH_PREFIX.length + LAYER_INDEX_SIZE)
				: value.readInt32BE(LEAF_PREFIX.length);
		const rightHash = type === NodeType.BRANCH ? value.slice(-1 * NODE_HASH_SIZE) : Buffer.alloc(0);
		const leftHash =
			type === NodeType.BRANCH
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
			const leaf = this._generateLeaf(value, 0);
			this._root = leaf.hash;
			this._width += 1;
			return this._root;
		}

		// Create the appendPath
		const appendPath: NodeInfo[] = [];
		let currentNode = this.getNode(this._root);

		// If tree is fully balanced
		if (this._width === 2 ** (this._getHeight() - 1)) {
			appendPath.push(currentNode);
		} else {
			// We start from the root layer and traverse each layer down the tree on the right side
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
			while (true) {
				const currentLayer = currentNode.layerIndex;
				let currentLayerSize = this._width >> currentLayer;
				// if layer has odd nodes and current node is odd (hence index is even)
				if (currentLayerSize % 2 === 1 && currentNode.nodeIndex % 2 === 0) {
					appendPath.push(currentNode);
				}
				// if node is leaf, break
				if (currentNode.type === NodeType.LEAF) {
					break;
				}
				// if layer below is odd numbered, push left child
				currentLayerSize = this._width >> (currentLayer - 1);
				if (currentLayerSize % 2 === 1) {
					const leftNode = this.getNode(currentNode.leftHash);
					appendPath.push(leftNode);
				}

				// go to right child
				currentNode = this.getNode(currentNode.rightHash);
			}
		}

		const appendData = this._generateLeaf(value, this._width);
		const appendNode = this.getNode(appendData.hash);
		appendPath.push(appendNode);
		// Loop through appendPath from the base layer
		// Generate new branch nodes and push to appendPath
		// Last element remaining is new root
		while (appendPath.length > 1) {
			const rightNodeInfo = appendPath.pop();
			const leftNodeInfo = appendPath.pop();
			const newBranchNode = this._generateBranch(
				(leftNodeInfo as NodeInfo).hash,
				(rightNodeInfo as NodeInfo).hash,
				(leftNodeInfo as NodeInfo).layerIndex + 1,
				(leftNodeInfo as NodeInfo).nodeIndex + 1,
			);
			appendPath.push(this.getNode(newBranchNode.hash));
		}
		this._root = appendPath[0].hash;
		return this.root;
	}

	public generateProof(queryData: ReadonlyArray<Buffer>): Proof {
		if (this._width === 0) {
			return {
				path: [],
				indexes: [],
				dataLength: 0,
			};
		}
		const path = [];
		const addedPath = new dataStructures.BufferSet();
		const indexes = [];
		let queryNode: NodeInfo | undefined;

		for (let i = 0; i < queryData.length; i += 1) {
			// Flag missing nodes
			try {
				queryNode = this.getNode(queryData[i]);
			} catch (err) {
				path.push({
					hash: queryData[i],
					layerIndex: undefined,
					nodeIndex: undefined,
				});
				indexes.push({
					layerIndex: undefined,
					nodeIndex: undefined,
				});
				continue;
			}

			// If tree has one non-empty leaf
			if (this._width === 1 && this._root.equals(queryNode.hash)) {
				if (!addedPath.has(queryNode.hash)) {
					addedPath.add(queryNode.hash);
					path.push({
						hash: queryNode.hash,
						layerIndex: 0,
						nodeIndex: 0,
					});
					indexes.push({
						layerIndex: 0,
						nodeIndex: 0,
					});
				}
				continue;
			}

			indexes.push({
				layerIndex: queryNode.layerIndex,
				nodeIndex: queryNode.nodeIndex,
			});

			let currentNode = queryNode;
			while (!currentNode.hash.equals(this._root)) {
				const {
					layerIndex: pairLayerIndex,
					nodeIndex: pairNodeIndex,
					side: pairSide,
				} = getPairLocation({
					layerIndex: currentNode.layerIndex,
					nodeIndex: currentNode.nodeIndex,
					dataLength: this._width,
				});

				const pairNodeHash = this._locationToHashMap[
					`${getBinaryString(pairNodeIndex, this._getHeight() - pairLayerIndex)}`
				] as Buffer;
				if (!addedPath.has(pairNodeHash)) {
					addedPath.add(pairNodeHash);
					path.push({
						hash: pairNodeHash,
						layerIndex: pairLayerIndex,
						nodeIndex: pairNodeIndex,
					});
				}
				const leftHashBuffer = pairSide === NodeSide.LEFT ? pairNodeHash : currentNode.hash;
				const rightHashBuffer = pairSide === NodeSide.RIGHT ? pairNodeHash : currentNode.hash;
				const parentNodeHash = generateHash(BRANCH_PREFIX, leftHashBuffer, rightHashBuffer);
				currentNode = this.getNode(parentNodeHash);
			}
		}

		return {
			path,
			indexes,
			dataLength: this._width,
		};
	}

	public clear(): void {
		this._width = 0;
		this._root = EMPTY_HASH;
		this._hashToValueMap = { [this._root.toString('2')]: Buffer.alloc(0) };
	}

	public toString(): string {
		if (this._width === 0) {
			return this.root.toString('hex');
		}
		return this._printNode(this.root);
	}

	public getData(): NodeInfo[] {
		return this._width === 0
			? []
			: Object.keys(this._hashToValueMap).map(key => this.getNode(Buffer.from(key, 'binary')));
	}

	private _getHeight(): number {
		return Math.ceil(Math.log2(this._width)) + 1;
	}

	private _generateLeaf(value: Buffer, nodeIndex: number): NodeData {
		const nodeIndexBuffer = Buffer.alloc(NODE_INDEX_SIZE);
		nodeIndexBuffer.writeInt32BE(nodeIndex, 0);
		// As per protocol nodeIndex is not included in hash
		const leafValueWithoutNodeIndex = Buffer.concat(
			[LEAF_PREFIX, value],
			LEAF_PREFIX.length + value.length,
		);
		const leafHash = this._preHashedLeaf ? value : hash(leafValueWithoutNodeIndex);
		// We include nodeIndex into the value to allow for nodeIndex retrieval for leaf nodes
		const leafValueWithNodeIndex = Buffer.concat(
			[LEAF_PREFIX, nodeIndexBuffer, value],
			LEAF_PREFIX.length + nodeIndexBuffer.length + value.length,
		);
		this._hashToValueMap[leafHash.toString('binary')] = leafValueWithNodeIndex;
		this._locationToHashMap[`${getBinaryString(nodeIndex, this._getHeight())}`] = leafHash;

		return {
			value: leafValueWithNodeIndex,
			hash: leafHash,
		};
	}

	private _generateBranch(
		leftHashBuffer: Buffer,
		rightHashBuffer: Buffer,
		layerIndex: number,
		nodeIndex: number,
	): NodeData {
		const layerIndexBuffer = Buffer.alloc(LAYER_INDEX_SIZE);
		const nodeIndexBuffer = Buffer.alloc(NODE_INDEX_SIZE);
		layerIndexBuffer.writeInt8(layerIndex, 0);
		nodeIndexBuffer.writeInt32BE(nodeIndex, 0);

		const branchValue = Buffer.concat(
			[BRANCH_PREFIX, layerIndexBuffer, nodeIndexBuffer, leftHashBuffer, rightHashBuffer],
			BRANCH_PREFIX.length +
				layerIndexBuffer.length +
				nodeIndexBuffer.length +
				leftHashBuffer.length +
				rightHashBuffer.length,
		);
		const branchHash = generateHash(BRANCH_PREFIX, leftHashBuffer, rightHashBuffer);
		this._hashToValueMap[branchHash.toString('binary')] = branchValue;
		this._locationToHashMap[
			`${getBinaryString(nodeIndex, this._getHeight() - layerIndex)}`
		] = branchHash;
		return {
			hash: branchHash,
			value: branchValue,
		};
	}

	private _build(initValues: Buffer[]): Buffer {
		// Generate hash and buffer of leaves and store in memory
		const leafHashes = [];
		this._width = initValues.length;
		for (let i = 0; i < initValues.length; i += 1) {
			const leaf = this._generateLeaf(initValues[i], i);
			leafHashes.push(leaf.hash);
		}

		// Start from base layer
		let currentLayerIndex = 0;
		let currentLayerHashes = leafHashes;
		let orphanNodeHashInPreviousLayer: Buffer | undefined;
		// Loop through each layer as long as there are nodes or an orphan node from previous layer
		while (currentLayerHashes.length > 1 || orphanNodeHashInPreviousLayer !== undefined) {
			const pairsOfHashes: Array<[Buffer, Buffer]> = [];

			// Make pairs from the current layer nodes
			for (let i = 0; i < currentLayerHashes.length - 1; i += 2) {
				pairsOfHashes.push([currentLayerHashes[i], currentLayerHashes[i + 1]]);
			}

			// If there is one node left from pairs
			if (currentLayerHashes.length % 2 === 1) {
				// If no orphan node left from previous layer, set the last node to new orphan node
				if (orphanNodeHashInPreviousLayer === undefined) {
					orphanNodeHashInPreviousLayer = currentLayerHashes[currentLayerHashes.length - 1];

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
				const node = this._generateBranch(leftHash, rightHash, currentLayerIndex + 1, i);

				parentLayerHashes.push(node.hash);
			}

			// Set current layer to parent layer
			currentLayerHashes = parentLayerHashes;
			currentLayerIndex += 1;
		}

		return currentLayerHashes[0];
	}

	private _printNode(hashValue: Buffer, level = 1): string {
		const nodeValue = this._hashToValueMap[hashValue.toString('binary')];
		if (nodeValue && isLeaf(nodeValue)) {
			return hashValue.toString('hex');
		}

		const node = this.getNode(hashValue);

		return [
			hashValue.toString('hex'),
			`├${' ─ '.repeat(level)} ${this._printNode(node.leftHash, level + 1)}`,
			`├${' ─ '.repeat(level)} ${this._printNode(node.rightHash, level + 1)}`,
		].join('\n');
	}
}
