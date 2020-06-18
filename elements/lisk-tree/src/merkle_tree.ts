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
import {
	NodeData,
	NodeInfo,
	NodeSide,
	NodeType,
	Path,
	TreeStructure,
} from './types';
import {
	LAYER_INDEX_SIZE,
	NODE_INDEX_SIZE,
	NODE_HASH_SIZE,
	EMPTY_HASH,
	LEAF_PREFIX,
	BRANCH_PREFIX,
} from './constants';

const isLeaf = (value: Buffer): boolean =>
	value.compare(Buffer.alloc(0)) !== 0 && value[0] === LEAF_PREFIX[0];

export class MerkleTree {
	private _root: Buffer;
	private _width = 0;

	// Object holds data in format { [hash]: value }
	private _hashToValueMap: { [key: string]: Buffer } = {};

	public constructor(initValues: Buffer[] = []) {
		if (initValues.length === 0) {
			this._root = EMPTY_HASH;
			this._hashToValueMap[this._root.toString('binary')] = Buffer.alloc(0);
			return;
		}

		this._root = this._build(initValues);
	}

	public get root(): Buffer {
		return this._root;
	}

	public getNode(nodeHash: Buffer): NodeInfo {
		const value = this._hashToValueMap[nodeHash.toString('binary')];
		// eslint-disable-next-line
		if (!value) {
			throw new Error(
				`Hash does not exist in merkle tree: ${nodeHash.toString('hex')}`,
			);
		}

		const type = isLeaf(value) ? NodeType.LEAF : NodeType.BRANCH;
		const layerIndex =
			type === NodeType.LEAF ? 0 : value.readInt8(BRANCH_PREFIX.length);
		const nodeIndex =
			type === NodeType.BRANCH
				? value.readInt32BE(BRANCH_PREFIX.length + LAYER_INDEX_SIZE)
				: value.readInt32BE(LEAF_PREFIX.length);
		const rightHash =
			type === NodeType.BRANCH
				? value.slice(-1 * NODE_HASH_SIZE)
				: Buffer.alloc(0);
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
			// eslint-disable-next-line
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
		appendPath.push(this.getNode(appendNode.hash));
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

	public getStructure(): TreeStructure {
		const structure: { [key: number]: NodeInfo[] } = {};
		const allNodes = this.getData();
		for (let i = 0; i < allNodes.length; i += 1) {
			const currentNode = allNodes[i];
			if (!(currentNode.layerIndex in structure)) {
				structure[currentNode.layerIndex] = [currentNode];
			} else {
				structure[currentNode.layerIndex].splice(
					currentNode.nodeIndex,
					0,
					currentNode,
				);
			}
		}

		return structure;
	}

	public generatePath(_queryData: ReadonlyArray<Buffer>): Path {
		if (this._width === 1) {
			return [];
		}
		const treeStructure = this.getStructure();
		const path = [];
		// Get full node info of all query nodes
		const queryNodes = [];
		for (let i = 0; i < _queryData.length; i += 1) {
			try {
				const queryNode = this.getNode(_queryData[i]);
				queryNodes.push(queryNode);
			} catch (err) {
				queryNodes.push(undefined);
			}
		}
		let currentNode: NodeInfo | undefined;
		// Iterate through query nodes in order
		for (let j = 0; j < queryNodes.length; j += 1) {
			currentNode = queryNodes[j];
			// Query node does not exist in tree
			if (!currentNode) {
				// Insert flag for unverified node
				path.push(undefined);
				continue;
			}
			// Find path for query node until it reaches root hash by traversing through tree layers
			while (!currentNode.hash.equals(this._root)) {
				// Current layer has even # of nodes
				if (treeStructure[currentNode.layerIndex].length % 2 === 0) {
					const pairInfo =
						currentNode.nodeIndex % 2 === 0
							? {
									direction: NodeSide.RIGHT,
									hash:
										treeStructure[currentNode.layerIndex][
											currentNode.nodeIndex + 1
										].hash,
							  }
							: {
									direction: NodeSide.LEFT,
									hash:
										treeStructure[currentNode.layerIndex][
											currentNode.nodeIndex - 1
										].hash,
							  };
					path.push(pairInfo);
					const leftHashBuffer =
						pairInfo.direction === NodeSide.LEFT
							? pairInfo.hash
							: currentNode.hash;
					const rightHashBuffer =
						pairInfo.direction === NodeSide.LEFT
							? currentNode.hash
							: pairInfo.hash;
					const parentNodeHash = hash(
						Buffer.concat(
							[BRANCH_PREFIX, leftHashBuffer, rightHashBuffer],
							BRANCH_PREFIX.length +
								leftHashBuffer.length +
								rightHashBuffer.length,
						),
					);
					currentNode = this.getNode(parentNodeHash);
				} else {
					// Current layer has odd # odd of nodes
					let currentLayer = treeStructure[currentNode.layerIndex];

					// If there is only one node in the current layer
					if (currentLayer.length === 1) {
						// Find the next lower layer with odd number of nodes
						let currentLayerIndex = currentNode.layerIndex - 1;
						while (
							currentLayerIndex >= 0 &&
							treeStructure[currentLayerIndex].length % 2 === 0
						) {
							currentLayerIndex -= 1;
						}
						currentLayer = treeStructure[currentLayerIndex];
						const lastNodeOfLowerOddLayer = {
							direction: NodeSide.RIGHT,
							hash: currentLayer[currentLayer.length - 1].hash,
						};
						path.push(lastNodeOfLowerOddLayer);
						const parentNodeHash = hash(
							Buffer.concat(
								[BRANCH_PREFIX, currentNode.hash, lastNodeOfLowerOddLayer.hash],
								BRANCH_PREFIX.length +
									currentNode.hash.length +
									lastNodeOfLowerOddLayer.hash.length,
							),
						);
						currentNode = this.getNode(parentNodeHash);
					}
					// If there is more than one node and the current node is not the last node in the layer
					else if (
						!currentNode.hash.equals(currentLayer[currentLayer.length - 1].hash)
					) {
						const pairInfo =
							currentNode.nodeIndex % 2 === 0
								? {
										direction: NodeSide.RIGHT,
										hash: currentLayer[currentNode.nodeIndex + 1].hash,
								  }
								: {
										direction: NodeSide.LEFT,
										hash: currentLayer[currentNode.nodeIndex - 1].hash,
								  };
						path.push(pairInfo);
						const leftHashBuffer =
							pairInfo.direction === NodeSide.LEFT
								? pairInfo.hash
								: currentNode.hash;
						const rightHashBuffer =
							pairInfo.direction === NodeSide.LEFT
								? currentNode.hash
								: pairInfo.hash;
						const parentNodeHash = hash(
							Buffer.concat(
								[BRANCH_PREFIX, leftHashBuffer, rightHashBuffer],
								BRANCH_PREFIX.length +
									leftHashBuffer.length +
									rightHashBuffer.length,
							),
						);
						currentNode = this.getNode(parentNodeHash);
					}
					// If current layer has more than one node
					else {
						// Find the next higher layer with odd number of nodes
						let currentUpperLayerIndex = currentNode.layerIndex + 1;
						while (
							currentUpperLayerIndex < this._getHeight() &&
							treeStructure[currentUpperLayerIndex].length % 2 === 0
						) {
							currentUpperLayerIndex += 1;
						}
						currentLayer = treeStructure[currentUpperLayerIndex];
						// Pair the last node in the layer
						const pairInfo = {
							direction: NodeSide.LEFT,
							hash: currentLayer[currentLayer.length - 1].hash,
						};
						const parentNodeHash = hash(
							Buffer.concat(
								[BRANCH_PREFIX, pairInfo.hash, currentNode.hash],
								BRANCH_PREFIX.length +
									pairInfo.hash.length +
									currentNode.hash.length,
							),
						);
						if (
							this._hashToValueMap[parentNodeHash.toString('binary')] !==
							undefined
						) {
							currentNode = this.getNode(parentNodeHash);
							path.push(pairInfo);
						} else {
							// TODO: Optimize
							// If correct parent node not found, traverse down the tree instead, this happens in specific cases such as the 7 leaf tree
							// Find the next lower layer with odd number of nodes
							let currentLowerLayerIndex = currentNode.layerIndex - 1;
							while (
								currentLowerLayerIndex >= 0 &&
								treeStructure[currentLowerLayerIndex].length % 2 === 0
							) {
								currentLowerLayerIndex -= 1;
							}
							currentLayer = treeStructure[currentLowerLayerIndex];
							const lastNodeOfLowerOddLayer = {
								direction: NodeSide.RIGHT,
								hash: currentLayer[currentLayer.length - 1].hash,
							};
							path.push(lastNodeOfLowerOddLayer);
							const lowerNodeHash = hash(
								Buffer.concat(
									[
										BRANCH_PREFIX,
										currentNode.hash,
										lastNodeOfLowerOddLayer.hash,
									],
									BRANCH_PREFIX.length +
										currentNode.hash.length +
										lastNodeOfLowerOddLayer.hash.length,
								),
							);
							currentNode = this.getNode(lowerNodeHash);
						}
					}
				} // end of odd nodes
			} // end of while not root
		} // end of looping through query nodes

		return path;
	}

	public clear(): void {
		this._width = 0;
		this._root = EMPTY_HASH;
		this._hashToValueMap = { [this._root.toString('2')]: Buffer.alloc(0) };
	}

	public toString(): string {
		if (this._width === 0) {
			return this.root.toString('base64');
		}
		return this._printNode(this.root);
	}

	public getData(): NodeInfo[] {
		return Object.keys(this._hashToValueMap).map(key =>
			this.getNode(Buffer.from(key, 'binary')),
		);
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
		const leafHash = hash(leafValueWithoutNodeIndex);
		// We include nodeIndex into the value to allow for nodeIndex retrieval for leaf nodes
		const leafValueWithNodeIndex = Buffer.concat(
			[LEAF_PREFIX, nodeIndexBuffer, value],
			LEAF_PREFIX.length + nodeIndexBuffer.length + value.length,
		);
		this._hashToValueMap[leafHash.toString('binary')] = leafValueWithNodeIndex;
		this._width += 1;

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
		this._hashToValueMap[branchHash.toString('binary')] = branchValue;

		return {
			hash: branchHash,
			value: branchValue,
		};
	}

	private _build(initValues: Buffer[]): Buffer {
		// Generate hash and buffer of leaves and store in memory
		const leafHashes = [];
		for (let i = 0; i < initValues.length; i += 1) {
			const leaf = this._generateLeaf(initValues[i], i);
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
				const node = this._generateBranch(
					leftHash,
					rightHash,
					currentLayerIndex + 1,
					i,
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
		const nodeValue = this._hashToValueMap[hashValue.toString('binary')];

		if (isLeaf(nodeValue)) {
			return nodeValue.toString('base64');
		}

		const node = this.getNode(hashValue);

		return [
			hashValue.toString('base64'),
			`├${'─'.repeat(level)} ${this._printNode(node.leftHash, level + 1)}`,
			`├${'─'.repeat(level)} ${this._printNode(node.rightHash, level + 1)}`,
		].join('\n');
	}
}
