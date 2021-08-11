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

import { hash } from '@liskhq/lisk-cryptography';
import { binarySearch } from '../utils';
import {
	BRANCH_PREFIX,
	LAYER_INDEX_SIZE,
	LEAF_PREFIX,
	NODE_HASH_SIZE,
	NODE_INDEX_SIZE,
} from './constants';
import {
	NodeLocation,
	NodeSide,
	NodeType,
	MerkleRootInfo,
	NodeIndex,
	NonNullableStruct,
} from './types';

export const isLeaf = (value: Buffer): boolean => value[0] === LEAF_PREFIX[0];

export const generateHash = (prefix: Buffer, leftHash: Buffer, rightHash: Buffer): Buffer =>
	hash(
		Buffer.concat(
			[prefix, leftHash, rightHash],
			prefix.length + leftHash.length + rightHash.length,
		),
	);

export const getMaxIdxAtLayer = (layer: number, size: number): number => {
	let [max, r] = [size, 0];
	for (let i = 0; i < layer; i += 1) {
		[max, r] = [[Math.floor, Math.ceil][r % 2](max / 2), r + (max % 2)];
	}
	return max;
};

export const getLayerStructure = (size: number): number[] => {
	const structure = [];
	for (let i = 0; i <= Math.ceil(Math.log2(size)); i += 1) {
		structure.push(getMaxIdxAtLayer(i, size));
	}

	return structure;
};

export const getHeight = (size: number) => Math.ceil(Math.log2(size)) + 1;

export const getBinaryString = (num: number, length: number): Buffer => {
	if (length === 0) {
		return Buffer.alloc(0);
	}
	let binaryString = num.toString(2);
	while (binaryString.length < length) {
		binaryString = `0${binaryString}`;
	}

	return Buffer.from(binaryString, 'utf8');
};

export const getBinary = (num: number, length: number): number[] => {
	const binaryString = getBinaryString(num, length).toString('utf8');

	return binaryString.split('').map(d => parseInt(d, 10));
};

export const getRightSiblingInfo = (
	nodeIndex: number,
	layerIndex: number,
	size: number,
): NodeLocation | undefined => {
	const structure = getLayerStructure(size);
	let siblingNodeIndex = ((nodeIndex >>> 1) << 1) + ((nodeIndex + 1) % 2);
	let siblingLayerIndex = layerIndex;
	while (siblingNodeIndex >= structure[siblingLayerIndex] && siblingLayerIndex > 0) {
		siblingNodeIndex <<= 1;
		siblingLayerIndex -= 1;
	}
	if (siblingLayerIndex === 0 && siblingNodeIndex >= size) {
		return undefined;
	}
	return {
		nodeIndex: siblingNodeIndex,
		layerIndex: siblingLayerIndex,
	};
};

export const getPairLocation = (nodeInfo: {
	layerIndex: number;
	nodeIndex: number;
	size: number;
}): NodeLocation => {
	const { layerIndex, nodeIndex, size } = nodeInfo;
	const treeHeight = Math.ceil(Math.log2(size)) + 1;
	const layerStructure = getLayerStructure(size);
	const numberOfNodesInLayer = layerStructure[layerIndex];
	const binary = getBinary(nodeIndex, treeHeight - layerIndex);
	const side = [NodeSide.LEFT, NodeSide.RIGHT][binary[binary.length - 1]];
	const pairSide = side === NodeSide.LEFT ? NodeSide.RIGHT : NodeSide.LEFT;

	// If queried node is root, provide root node location
	if (layerIndex + 1 === treeHeight) {
		return { layerIndex: treeHeight - 1, nodeIndex: 0 };
	}
	// If node is left node not last element in the layer
	if (side === NodeSide.LEFT && nodeIndex < numberOfNodesInLayer - 1) {
		const pairNodeIndex = nodeIndex + 1;
		return { layerIndex, nodeIndex: pairNodeIndex, side: pairSide };
	}
	// If node is right node AND (not last element in layer OR last element in the layer with even # of nodes)
	if (
		side === NodeSide.RIGHT &&
		((numberOfNodesInLayer % 2 === 0 && nodeIndex === numberOfNodesInLayer - 1) ||
			(nodeIndex < numberOfNodesInLayer - 1 && nodeIndex < numberOfNodesInLayer - 1))
	) {
		const pairNodeIndex = nodeIndex - 1;
		return { layerIndex, nodeIndex: pairNodeIndex, side: pairSide };
	}
	// Otherwise find next odd numbered layer
	let currentLayer = layerIndex;
	// Get direction to traverse tree
	const numOfOddLayers = layerStructure
		.slice(0, currentLayer)
		.filter(num => num % 2 !== 0)
		.reduce((acc, val) => acc + val, 0);
	const direction = numOfOddLayers % 2 === 0 ? 1 : -1;
	let pairLocation;
	currentLayer += direction;
	while (currentLayer >= 0 && currentLayer <= treeHeight - 1) {
		if (layerStructure[currentLayer] % 2 !== 0) {
			const pairNodeIndex =
				direction === 1
					? layerStructure[currentLayer] + direction * -1
					: layerStructure[currentLayer] - direction * -1;
			pairLocation = {
				layerIndex: currentLayer,
				nodeIndex: pairNodeIndex,
				side: direction === -1 ? NodeSide.RIGHT : NodeSide.LEFT,
			};
			break;
		}
		currentLayer += direction;
	}

	return pairLocation as NodeLocation;
};

export const calculateMerkleRoot = ({ value, appendPath, size }: MerkleRootInfo) => {
	// 1. Calculate the new root

	// Add prefix to value
	const leafValueWithPrefix = Buffer.concat(
		[LEAF_PREFIX, value],
		LEAF_PREFIX.length + value.length,
	);

	// Set current hash to hash of value
	const newLeafHash = hash(leafValueWithPrefix);
	let currentHash = newLeafHash;

	// Count the 1's in binaryLength
	let count = 0;

	const binaryLength = size.toString(2);

	for (let i = 0; i < binaryLength.length; i += 1) {
		// Loop the binaryLength from the right
		// The right-most digits correspond to lower layers in the tree
		if ((size >> i) & 1) {
			const siblingHash = appendPath[count];
			currentHash = generateHash(BRANCH_PREFIX, siblingHash, currentHash);
			count += 1;
		}
	}

	const newRoot = currentHash;

	// 2. Update the append path
	let subTreeIndex;
	const treeHeight = Math.ceil(Math.log2(size)) + 1;

	for (subTreeIndex = 0; subTreeIndex < treeHeight; subTreeIndex += 1) {
		if (!((size >> subTreeIndex) & 1)) {
			break;
		}
	}

	const currentAppendPath = appendPath.slice(0);
	currentHash = newLeafHash;
	const splicedPath = currentAppendPath.splice(subTreeIndex);
	for (const sibling of currentAppendPath) {
		currentHash = generateHash(BRANCH_PREFIX, sibling, currentHash);
	}
	const newAppendPath = [currentHash].concat(splicedPath);

	return { root: newRoot, appendPath: newAppendPath, size: size + 1 };
};

export const getParentLocation = (nodeLocation: NodeLocation, pairNodeLocation: NodeLocation) => {
	const parentLayerIndex = Math.max(nodeLocation.layerIndex, pairNodeLocation.layerIndex) + 1;
	const parentNodeIndex = Math.min(
		Math.floor(nodeLocation.nodeIndex / 2),
		Math.floor(pairNodeLocation.nodeIndex / 2),
	);

	return {
		layerIndex: parentLayerIndex,
		nodeIndex: parentNodeIndex,
	};
};

export const generateNode = (nodeHash: Buffer, val: Buffer) => {
	const value = val;

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
};

export const isLeft = (index: number): boolean => (index & 1) === 0;
export const isSameLayer = (index1: number, index2: number) =>
	index1.toString(2).length === index2.toString(2).length;
export const areSiblings = (index1: number, index2: number) => (index1 ^ index2) === 1;
export const treeSortFn = (a: number, b: number) => {
	if (a.toString(2).length === b.toString(2).length) {
		return a - b;
	}
	return b - a;
}

export const insertNewIndex = (arr: number[], val: number) => {
	const insertIndex = binarySearch(arr, n => treeSortFn(val, n) < 0);
	if (arr[insertIndex] !== val) {
		arr.splice(insertIndex, 0, val);
	}
};

export const buildLeaf = (value: Buffer, nodeIndex: number, preHashedLeaf?: boolean) => {
	const nodeIndexBuffer = Buffer.alloc(NODE_INDEX_SIZE);
	nodeIndexBuffer.writeInt32BE(nodeIndex, 0);
	// As per protocol nodeIndex is not included in hash
	const leafValueWithoutNodeIndex = Buffer.concat(
		[LEAF_PREFIX, value],
		LEAF_PREFIX.length + value.length,
	);
	const leafHash = preHashedLeaf ? value : hash(leafValueWithoutNodeIndex);
	// We include nodeIndex into the value to allow for nodeIndex retrieval for leaf nodes
	const leafValueWithNodeIndex = Buffer.concat(
		[LEAF_PREFIX, nodeIndexBuffer, value],
		LEAF_PREFIX.length + nodeIndexBuffer.length + value.length,
	);

	return {
		leafValueWithNodeIndex,
		leafHash,
	};
};

export const getLocation = (index: number, height: number): NodeLocation => {
	const serializedIndexBinaryString = index.toString(2);
	const indexBinaryString = serializedIndexBinaryString.substring(
		1,
		serializedIndexBinaryString.length,
	);
	const location = {
		nodeIndex: parseInt(indexBinaryString, 2),
		layerIndex: height - indexBinaryString.length,
	};

	return location;
};

export const toIndex = (nodeIndex: number, layerIndex: number, height: number): number => {
	const length = height - layerIndex;
	if (length <= 0) {
		throw new Error(`Invalid height ${height} or layer inder ${layerIndex}`);
	}
	let binaryString = nodeIndex.toString(2);
	while (binaryString.length < length) {
		binaryString = `0${binaryString}`;
	}
	return parseInt(`1${binaryString}`, 2);
};

export const buildBranch = (
	leftHashBuffer: Buffer,
	rightHashBuffer: Buffer,
	layerIndex: number,
	nodeIndex: number,
) => {
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

	return {
		branchHash,
		branchValue,
	};
};

export const createNewBranchNode = (
	location: NodeLocation,
	pairHash: Buffer,
	currentHash: Buffer,
	pairSide: NodeSide,
) => {
	const leftHashBuffer = pairSide === NodeSide.LEFT ? pairHash : currentHash;
	const rightHashBuffer = pairSide === NodeSide.RIGHT ? pairHash : currentHash;
	const newNodeData = buildBranch(
		leftHashBuffer,
		rightHashBuffer,
		location.layerIndex,
		location.nodeIndex,
	);
	const newNode = generateNode(newNodeData.branchHash, newNodeData.branchValue);

	return newNode;
};

export const createNewLeafNode = (value: Buffer, nodeIndex: number, preHashed: boolean) => {
	const newNodeData = buildLeaf(value, nodeIndex, preHashed);
	const newNode = generateNode(newNodeData.leafHash, newNodeData.leafValueWithNodeIndex);

	return newNode;
};

export const getLocationFromIndex = (index: number, size: number) => {
	const treeHeight = Math.ceil(Math.log2(size)) + 1;

	const serializedIndexBinaryString = index.toString(2);
	const indexBinaryString = serializedIndexBinaryString.substring(
		1,
		serializedIndexBinaryString.length,
	);
	const location = {
		nodeIndex: parseInt(indexBinaryString, 2),
		layerIndex: treeHeight - indexBinaryString.length,
	};

	return location;
};

export const getSortedLocationsAndQueryData = (
	locations: NodeIndex[],
	queryData: Buffer[] | ReadonlyArray<Buffer>,
) => {
	const sortedData = [];
	for (let i = 0; i < locations.length; i += 1) {
		sortedData.push({
			location: locations[i],
			queryData: queryData[i],
		});
	}

	(sortedData as {
		location: NonNullableStruct<NodeIndex>;
		queryData: Buffer;
	}[]).sort((a, b) => {
		if (a.location.layerIndex !== b.location.layerIndex) {
			return a.location.layerIndex - b.location.layerIndex;
		}
		return a.location.nodeIndex - b.location.nodeIndex;
	});

	const sortedQueryData: Buffer[] = [];
	const sortedLocations: NodeIndex[] = [];
	for (let i = 0; i < sortedData.length; i += 1) {
		sortedQueryData[i] = sortedData[i].queryData;
		sortedLocations[i] = sortedData[i].location;
	}

	return { sortedLocations, sortedQueryData };
};

export const getNeighborIndex = (index: number) => index ^ 1;

export const ROOT_INDEX = 2;

export const calculatePathNodes = (queryHashes: Buffer[], size: number, idxs: number[], siblingHashes: Buffer[]): Map<number, Buffer> => {
	const tree = new Map<number, Buffer>();
	if (queryHashes.length === 0 || idxs.length === 0) {
		throw new Error('Invalid input. QueryHashes and Indexes must have at least one element.');
	}
	if (queryHashes.length !== idxs.length) {
		throw new Error('Invalid input. QueryHashes and Indexes must match.');
	}
	let sortedIdxs = [];
	for (let i = 0; i < idxs.length; i += 1) {
		const idx = idxs[i];
		if (idx === 0) {
			continue;
		}
		const query = queryHashes[i];
		sortedIdxs.push(idx);
		tree.set(idx, query);
	}
	sortedIdxs.sort(treeSortFn);
	const height = getHeight(size);
	const parentCache = new Map<number, Buffer>();
	while (sortedIdxs.length > 0) {
		const idx = sortedIdxs[0];
		if (idx === ROOT_INDEX) {
			return tree;
		}
		const currentHash = tree.get(idx) ?? parentCache.get(idx);
		const parentIdx = idx >> 1;
		if (!currentHash) {
			throw new Error(`Invalid state. Hash for index ${idx} should exist.`);
		}
		if (tree.has(parentIdx)) {
			sortedIdxs = sortedIdxs.slice(1);
			continue;
		}
		const currentLoc = getLocation(idx, height);
		const siblingLoc = getRightSiblingInfo(currentLoc.nodeIndex, currentLoc.layerIndex, size);
		if (siblingLoc) {
			const siblingIdx = toIndex(siblingLoc.nodeIndex, siblingLoc.layerIndex, height);
			const siblingHash = tree.get(siblingIdx) ?? siblingHashes.splice(0, 1)[0];
			if (isLeft(idx)) {
				tree.set(parentIdx, generateHash(BRANCH_PREFIX, currentHash, siblingHash));
			} else {
				tree.set(parentIdx, generateHash(BRANCH_PREFIX, siblingHash, currentHash))
			}
		} else {
			parentCache.set(parentIdx, currentHash);
		}
		sortedIdxs = sortedIdxs.slice(1);
		insertNewIndex(sortedIdxs, parentIdx);
	}
	return tree;
};
