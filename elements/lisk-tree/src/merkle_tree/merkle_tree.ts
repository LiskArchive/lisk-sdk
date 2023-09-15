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

import { utils } from '@liskhq/lisk-cryptography';
import {
	LAYER_INDEX_SIZE,
	NODE_HASH_SIZE,
	EMPTY_HASH,
	LEAF_PREFIX,
	BRANCH_PREFIX,
	PREFIX_HASH_TO_VALUE,
	PREFIX_LOC_TO_HASH,
	NODE_INDEX_SIZE,
} from './constants';
import { InMemoryDB } from '../inmemory_db';
import { PrefixStore } from './prefix_store';
import { NodeData, NodeInfo, NodeType, Proof, Database } from './types';
import {
	calculatePathNodes,
	generateHash,
	getBinaryString,
	isLeaf,
	getRightSiblingInfo,
	toIndex,
	isLeft,
	isSameLayer,
	areSiblings,
	getLocation,
	treeSortFn,
	insertNewIndex,
	ROOT_INDEX,
} from './utils';

export class MerkleTree {
	private _root: Buffer;
	private _size = 0;
	private readonly _preHashedLeaf: boolean;
	private readonly _db: Database;

	private readonly _hashToValueMap: PrefixStore;
	private readonly _locationToHashMap: PrefixStore;

	public constructor(options?: { preHashedLeaf?: boolean; db?: Database }) {
		this._db = options?.db ?? new InMemoryDB();
		this._hashToValueMap = new PrefixStore(this._db, PREFIX_HASH_TO_VALUE);
		this._locationToHashMap = new PrefixStore(this._db, PREFIX_LOC_TO_HASH);
		this._preHashedLeaf = options?.preHashedLeaf ?? false;

		this._root = EMPTY_HASH;
	}

	public async init(initValues: Buffer[]): Promise<void> {
		if (initValues.length <= 1) {
			const rootNode = initValues.length
				? await this._generateLeaf(initValues[0], 0)
				: { hash: EMPTY_HASH, value: Buffer.alloc(0) };
			this._root = rootNode.hash;
			await this._hashToValueMap.set(this._root, rootNode.value);
			await this._locationToHashMap.set(getBinaryString(0, this._getHeight()), this._root);
			this._size = initValues.length ? 1 : 0;
			return;
		}

		this._root = await this._build(initValues);
	}

	public get root(): Buffer {
		return this._root;
	}

	public get size(): number {
		return this._size;
	}

	public async append(value: Buffer): Promise<Buffer> {
		if (this._size === 0) {
			const leaf = await this._generateLeaf(value, 0);
			this._root = leaf.hash;
			this._size += 1;
			return this._root;
		}
		const appendPath = await this._getAppendPathNodes();
		const appendData = await this._generateLeaf(value, this._size);
		let currentNode = await this._getNode(appendData.hash);
		for (let i = 0; i < appendPath.length; i += 1) {
			const leftNodeInfo = appendPath[i];
			const newBranchNode = await this._generateBranch(
				leftNodeInfo.hash,
				currentNode.hash,
				leftNodeInfo.layerIndex + 1,
				leftNodeInfo.nodeIndex + 1,
			);
			currentNode = await this._getNode(newBranchNode.hash);
		}
		this._root = currentNode.hash;
		this._size += 1;
		return this.root;
	}

	public async generateProof(queryData: ReadonlyArray<Buffer>): Promise<Proof> {
		if (this._size === 0) {
			return {
				siblingHashes: [],
				idxs: [],
				size: 0,
			};
		}
		const idxs = await this._getIndices(queryData);
		const siblingHashes = await this._getSiblingHashes(idxs);
		return {
			size: this._size,
			idxs,
			siblingHashes,
		};
	}

	// idx is the first element of right tree
	public async generateRightWitness(idx: number): Promise<Buffer[]> {
		if (idx < 0 || idx > this._size) {
			throw new Error('index out of range');
		}
		if (this._size === idx) {
			return [];
		}
		if (idx === 0) {
			return this._getAppendPathHashes();
		}
		const height = this._getHeight();
		const size = this._size;
		const rightWitness: Buffer[] = [];
		let incrementalIdx = idx;
		for (let layerIndex = 0; layerIndex < height; layerIndex += 1) {
			const digit = (incrementalIdx >>> layerIndex) & 1;
			if (digit === 0) {
				continue;
			}
			const leftTreeLastIdx = idx - 1;
			const nodeIndex = leftTreeLastIdx >> layerIndex;
			const siblingInfo = getRightSiblingInfo(nodeIndex, layerIndex, size);
			if (!siblingInfo) {
				break;
			}
			const nodeHash = await this._locationToHashMap.get(
				getBinaryString(siblingInfo.nodeIndex, height - siblingInfo.layerIndex),
			);
			if (!nodeHash) {
				throw new Error(
					`Invalid tree state. Node at ${siblingInfo.nodeIndex} in layer ${siblingInfo.layerIndex} does not exist for size ${this.size}`,
				);
			}
			rightWitness.push(nodeHash);
			incrementalIdx += 1 << layerIndex;
		}
		return rightWitness;
	}

	public async update(idxs: number[], updateData: ReadonlyArray<Buffer>): Promise<Buffer> {
		const updateHashes = [];
		const height = this._getHeight();
		for (const idx of idxs) {
			if (idx.toString(2).length !== height + 1) {
				throw new Error('Updating data must be the leaf.');
			}
		}
		for (const data of updateData) {
			const leafValueWithoutNodeIndex = Buffer.concat(
				[LEAF_PREFIX, data],
				LEAF_PREFIX.length + data.length,
			);
			const leafHash = utils.hash(leafValueWithoutNodeIndex);
			updateHashes.push(leafHash);
		}
		const siblingHashes = await this._getSiblingHashes(idxs);

		const calculatedTree = calculatePathNodes(updateHashes, this._size, idxs, siblingHashes);

		for (const [index, hashedValue] of calculatedTree.entries()) {
			const loc = getLocation(index, height);
			const nodeIndexBuffer = Buffer.alloc(NODE_INDEX_SIZE);
			nodeIndexBuffer.writeInt32BE(loc.nodeIndex, 0);
			const prefix = loc.layerIndex === 0 ? LEAF_PREFIX : BRANCH_PREFIX;
			const value = Buffer.concat(
				[prefix, nodeIndexBuffer, hashedValue],
				prefix.length + nodeIndexBuffer.length + hashedValue.length,
			);
			await this._hashToValueMap.set(hashedValue, value);
			await this._locationToHashMap.set(getBinaryString(loc.nodeIndex, height), hashedValue);
		}

		return calculatedTree.get(ROOT_INDEX) as Buffer;
	}

	public async toString(): Promise<string> {
		if (this._size === 0) {
			return this.root.toString('hex');
		}
		return this._printNode(this.root);
	}

	private async _getSiblingHashes(idxs: number[]): Promise<Buffer[]> {
		let sortedIdxs: number[] = idxs.filter(idx => idx !== 0);
		sortedIdxs.sort(treeSortFn);
		const siblingHashes: Buffer[] = [];
		const size = this._size;
		const height = this._getHeight();
		while (sortedIdxs.length > 0) {
			const currentIndex = sortedIdxs[0];
			// check for next index in case I can use it if: node is left AND there are other indices AND next index is at distance 1 AND it is on the same layer
			// in that case remove it from the indices
			if (
				isLeft(currentIndex) &&
				sortedIdxs.length > 1 &&
				isSameLayer(currentIndex, sortedIdxs[1]) &&
				areSiblings(currentIndex, sortedIdxs[1])
			) {
				sortedIdxs = sortedIdxs.slice(2);
				const parentIndex = currentIndex >> 1;
				insertNewIndex(sortedIdxs, parentIndex);
				continue;
			}
			const currentNodeLoc = getLocation(currentIndex, height);
			if (currentNodeLoc.layerIndex === height) {
				return siblingHashes;
			}
			const siblingNode = getRightSiblingInfo(
				currentNodeLoc.nodeIndex,
				currentNodeLoc.layerIndex,
				size,
			);
			if (siblingNode) {
				const siblingIndex = toIndex(siblingNode.nodeIndex, siblingNode.layerIndex, height);
				const inOriginal = idxs.findIndex(i => i === siblingIndex);
				if (inOriginal > -1) {
					sortedIdxs = sortedIdxs.filter(i => i !== currentIndex);
					const parentIndex = currentIndex >> 1;
					insertNewIndex(sortedIdxs, parentIndex);
					continue;
				}

				const location = getBinaryString(siblingNode.nodeIndex, height - siblingNode.layerIndex);
				const siblingHash = await this._locationToHashMap.get(location);
				if (!siblingHash) {
					throw new Error(
						`Invalid tree state for ${siblingNode.nodeIndex} ${siblingNode.layerIndex}`,
					);
				}
				siblingHashes.push(siblingHash);
			}
			sortedIdxs = sortedIdxs.filter(i => i !== currentIndex);
			const parentIndex = currentIndex >> 1;
			insertNewIndex(sortedIdxs, parentIndex);
		}
		return siblingHashes;
	}

	private _getHeight(): number {
		return Math.ceil(Math.log2(this._size)) + 1;
	}

	private async _generateLeaf(value: Buffer, nodeIndex: number): Promise<NodeData> {
		const nodeIndexBuffer = Buffer.alloc(NODE_INDEX_SIZE);
		nodeIndexBuffer.writeInt32BE(nodeIndex, 0);
		// As per protocol nodeIndex is not included in hash
		const leafValueWithoutNodeIndex = Buffer.concat(
			[LEAF_PREFIX, value],
			LEAF_PREFIX.length + value.length,
		);
		const leafHash = this._preHashedLeaf ? value : utils.hash(leafValueWithoutNodeIndex);
		// We include nodeIndex into the value to allow for nodeIndex retrieval for leaf nodes
		const leafValueWithNodeIndex = Buffer.concat(
			[LEAF_PREFIX, nodeIndexBuffer, value],
			LEAF_PREFIX.length + nodeIndexBuffer.length + value.length,
		);
		await this._hashToValueMap.set(leafHash, leafValueWithNodeIndex);
		await this._locationToHashMap.set(getBinaryString(nodeIndex, this._getHeight()), leafHash);

		return {
			value: leafValueWithNodeIndex,
			hash: leafHash,
		};
	}

	private async _generateBranch(
		leftHashBuffer: Buffer,
		rightHashBuffer: Buffer,
		layerIndex: number,
		nodeIndex: number,
	): Promise<NodeData> {
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
		await this._hashToValueMap.set(branchHash, branchValue);
		await this._locationToHashMap.set(
			getBinaryString(nodeIndex, this._getHeight() - layerIndex),
			branchHash,
		);
		return {
			hash: branchHash,
			value: branchValue,
		};
	}

	private async _build(initValues: Buffer[]): Promise<Buffer> {
		// Generate hash and buffer of leaves and store in memory
		const leafHashes = [];
		this._size = initValues.length;
		for (let i = 0; i < initValues.length; i += 1) {
			const leaf = await this._generateLeaf(initValues[i], i);
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
				const node = await this._generateBranch(leftHash, rightHash, currentLayerIndex + 1, i);

				parentLayerHashes.push(node.hash);
			}

			// Set current layer to parent layer
			currentLayerHashes = parentLayerHashes;
			currentLayerIndex += 1;
		}

		return currentLayerHashes[0];
	}

	private async _getAppendPathNodes(): Promise<NodeInfo[]> {
		if (this._size === 0) {
			return [];
		}
		// Create the appendPath
		const appendPath: NodeInfo[] = [];
		let currentNode = await this._getNode(this._root);

		// If tree is fully balanced
		if (this._size === 2 ** (this._getHeight() - 1)) {
			appendPath.push(currentNode);
		} else {
			// We start from the root layer and traverse each layer down the tree on the right side
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
			while (true) {
				const currentLayer = currentNode.layerIndex;
				let currentLayerSize = this._size >> currentLayer;
				// if layer has odd nodes and current node is odd (hence index is even)
				if (currentLayerSize % 2 === 1 && currentNode.nodeIndex % 2 === 0) {
					appendPath.push(currentNode);
				}
				// if node is leaf, break
				if (currentNode.type === NodeType.LEAF) {
					break;
				}
				// if layer below is odd numbered, push left child
				currentLayerSize = this._size >> (currentLayer - 1);
				if (currentLayerSize % 2 === 1) {
					const leftNode = await this._getNode(currentNode.leftHash);
					appendPath.push(leftNode);
				}

				// go to right child
				currentNode = await this._getNode(currentNode.rightHash);
			}
		}
		// Append path should be from bottom
		return appendPath.reverse();
	}

	private async _getIndices(queryHashes: ReadonlyArray<Buffer>): Promise<number[]> {
		const idxs = [];
		const height = this._getHeight();
		for (const query of queryHashes) {
			try {
				const node = await this._getNode(query);
				idxs.push(toIndex(node.nodeIndex, node.layerIndex, height));
			} catch (error) {
				idxs.push(0);
			}
		}
		return idxs;
	}

	private async _getAppendPathHashes(): Promise<Buffer[]> {
		const appendPathNodes = await this._getAppendPathNodes();
		return appendPathNodes.map(p => p.hash);
	}

	private async _getNode(nodeHash: Buffer): Promise<NodeInfo> {
		const value = await this._hashToValueMap.get(nodeHash);

		if (!value) {
			throw new Error(`Hash does not exist in merkle tree: ${nodeHash.toString('hex')}`);
		}

		const type = isLeaf(value) ? NodeType.LEAF : NodeType.BRANCH;
		const layerIndex = type === NodeType.LEAF ? 0 : value.readInt8(BRANCH_PREFIX.length);
		const nodeIndex =
			type === NodeType.BRANCH
				? value.readInt32BE(BRANCH_PREFIX.length + LAYER_INDEX_SIZE)
				: value.readInt32BE(LEAF_PREFIX.length);
		const rightHash =
			type === NodeType.BRANCH ? value.subarray(-1 * NODE_HASH_SIZE) : Buffer.alloc(0);
		const leftHash =
			type === NodeType.BRANCH
				? value.subarray(-2 * NODE_HASH_SIZE, -1 * NODE_HASH_SIZE)
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

	private async _printNode(hashValue: Buffer, level = 1): Promise<string> {
		const nodeValue = await this._hashToValueMap.get(hashValue);
		if (nodeValue && isLeaf(nodeValue)) {
			return hashValue.toString('hex');
		}

		const node = await this._getNode(hashValue);
		const left = await this._printNode(node.leftHash, level + 1);
		const right = await this._printNode(node.rightHash, level + 1);
		return [
			hashValue.toString('hex'),
			`├${' ─ '.repeat(level)} ${left}`,
			`├${' ─ '.repeat(level)} ${right}`,
		].join('\n');
	}
}
