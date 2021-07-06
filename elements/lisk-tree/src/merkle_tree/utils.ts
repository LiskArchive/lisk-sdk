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
import { BRANCH_PREFIX, LEAF_PREFIX } from './constants';
import { NodeLocation, NodeSide, MerkleRootInfo } from './types';

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
	const binaryLength = size.toString(2);

	// Calculate the new root

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

	for (let i = 0; i < binaryLength.length; i += 1) {
		// Loop the binaryLength from the right
		// The right-most digits correspond to lower layers in the tree
		if (binaryLength[binaryLength.length - i - 1] === '1') {
			const siblingHash = appendPath[count];
			currentHash = generateHash(BRANCH_PREFIX, siblingHash, currentHash);
			count += 1;
		}
	}

	// Update the append path
	let subTreeIndex;

	for (subTreeIndex = 0; subTreeIndex < binaryLength.length; subTreeIndex += 1) {
		if (binaryLength[binaryLength.length - subTreeIndex - 1] === '0') {
			break;
		}
	}

	let currentAppendPath = appendPath.slice(0);
	let branchHash = newLeafHash;
	const splicedPath = currentAppendPath.splice(subTreeIndex);
	for (const sibling of currentAppendPath) {
		branchHash = generateHash(BRANCH_PREFIX, sibling, branchHash);
	}
	currentAppendPath = [branchHash].concat(splicedPath);

	return { root: currentHash, appendPath: currentAppendPath, size: size + 1 };
};
