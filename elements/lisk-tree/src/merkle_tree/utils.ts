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

import { utils } from '@liskhq/lisk-cryptography';
import { binarySearch } from '../utils';
import { BRANCH_PREFIX, LEAF_PREFIX, EMPTY_HASH } from './constants';
import { NodeLocation, MerkleRootInfo } from './types';

export const isLeaf = (value: Buffer): boolean => value[0] === LEAF_PREFIX[0];

export const generateHash = (prefix: Buffer, leftHash: Buffer, rightHash: Buffer): Buffer =>
	utils.hash(
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

export const getBinaryString = (nodeIndex: number, length: number): Buffer => {
	if (length === 0) {
		return Buffer.alloc(0);
	}
	let binaryString = nodeIndex.toString(2);
	while (binaryString.length < length) {
		binaryString = `0${binaryString}`;
	}

	return Buffer.from(binaryString, 'utf8');
};

// getRightSiblingInfo returns sibling in the same layer or lower. It will not find the sibling in left top.
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
	if (siblingNodeIndex >= size) {
		return undefined;
	}
	return {
		nodeIndex: siblingNodeIndex,
		layerIndex: siblingLayerIndex,
	};
};

export const calculateMerkleRoot = ({ value, appendPath, size }: MerkleRootInfo) => {
	// 1. Calculate the new root

	// Add prefix to value
	const leafValueWithPrefix = Buffer.concat(
		[LEAF_PREFIX, value],
		LEAF_PREFIX.length + value.length,
	);

	// Set current hash to hash of value
	const newLeafHash = utils.hash(leafValueWithPrefix);
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

export const largestPowerOfTwoSmallerThan = (size: number) => 2 ** Math.floor(Math.log2(size - 1));

export const calculateMerkleRootWithLeaves = (data: Buffer[]): Buffer => {
	if (data.length === 0) {
		return EMPTY_HASH;
	}

	// If data length is 1 it is a leaf node; return the leaf hash
	if (data.length === 1) {
		// Add prefix to value
		const leafValueWithPrefix = Buffer.concat(
			[LEAF_PREFIX, data[0]],
			LEAF_PREFIX.length + data[0].length,
		);

		return utils.hash(leafValueWithPrefix);
	}

	const k = largestPowerOfTwoSmallerThan(data.length);
	const leftTree = data.slice(0, k);
	const rightTree = data.slice(k, data.length);

	// Recursively calculate branch hashes from the leaf nodes up to the tree root
	return generateHash(
		BRANCH_PREFIX,
		calculateMerkleRootWithLeaves(leftTree),
		calculateMerkleRootWithLeaves(rightTree),
	);
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
};

export const insertNewIndex = (arr: number[], val: number) => {
	const insertIndex = binarySearch(arr, n => treeSortFn(val, n) <= 0);
	if (arr[insertIndex] !== val) {
		arr.splice(insertIndex, 0, val);
	}
};

export const getLocation = (index: number, height: number): NodeLocation => {
	const serializedIndexBinaryString = index.toString(2);
	const indexBinaryString = serializedIndexBinaryString.substring(
		1,
		serializedIndexBinaryString.length,
	);
	const layerIndex = height - indexBinaryString.length;
	if (layerIndex < 0) {
		throw new Error(`Invalid index ${index} with height ${height}`);
	}
	const location = {
		nodeIndex: parseInt(indexBinaryString, 2),
		layerIndex,
	};

	return location;
};

export const toIndex = (nodeIndex: number, layerIndex: number, height: number): number => {
	const length = height - layerIndex;
	if (length <= 0) {
		throw new Error(`Invalid height ${height} or layer index ${layerIndex}`);
	}
	let binaryString = nodeIndex.toString(2);
	while (binaryString.length < length) {
		binaryString = `0${binaryString}`;
	}
	return parseInt(`1${binaryString}`, 2);
};

export const ROOT_INDEX = 2;

export const calculatePathNodes = (
	queryHashes: ReadonlyArray<Buffer>,
	size: number,
	idxs: ReadonlyArray<number>,
	siblingHashes: ReadonlyArray<Buffer>,
): Map<number, Buffer> => {
	const copiedSiblingHashes = [...siblingHashes];
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
		const parentIdx = idx >>> 1;
		if (!currentHash) {
			throw new Error(`Invalid state. Hash for index ${idx} should exist.`);
		}
		const currentLoc = getLocation(idx, height);
		const siblingLoc = getRightSiblingInfo(currentLoc.nodeIndex, currentLoc.layerIndex, size);
		if (siblingLoc) {
			const siblingIdx = toIndex(siblingLoc.nodeIndex, siblingLoc.layerIndex, height);
			const siblingHash = tree.get(siblingIdx) ?? copiedSiblingHashes.splice(0, 1)[0];
			const parentHash = isLeft(idx)
				? generateHash(BRANCH_PREFIX, currentHash, siblingHash)
				: generateHash(BRANCH_PREFIX, siblingHash, currentHash);
			// if parent hash is included in the queryHashes, check if it matches with calculated one
			const existingParentHash = tree.get(parentIdx);
			if (existingParentHash !== undefined && !parentHash.equals(existingParentHash)) {
				throw new Error('Invalid query hashes. Calculated parent hash does not match.');
			}
			tree.set(parentIdx, parentHash);
		} else {
			parentCache.set(parentIdx, currentHash);
		}
		sortedIdxs = sortedIdxs.slice(1);
		insertNewIndex(sortedIdxs, parentIdx);
	}
	return tree;
};
