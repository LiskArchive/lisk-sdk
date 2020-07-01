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

import { hash } from '@liskhq/lisk-cryptography';
import { LEAF_PREFIX } from './constants';
import { NodeLocation, NodeSide } from './types';

export const isLeaf = (value: Buffer): boolean => value[0] === LEAF_PREFIX[0];

export const generateHash = (
	prefix: Buffer,
	leftHash: Buffer,
	rightHash: Buffer,
): Buffer =>
	hash(
		Buffer.concat(
			[prefix, leftHash, rightHash],
			prefix.length + leftHash.length + rightHash.length,
		),
	);

export const getMaxIdxAtLayer = (layer: number, datalength: number): number => {
	let [max, r] = [datalength, 0];
	for (let i = 0; i < layer; i += 1) {
		[max, r] = [[Math.floor, Math.ceil][r % 2](max / 2), r + (max % 2)];
	}
	return max;
};

export const getLayerStructure = (datalength: number): number[] => {
	const structure = [];
	for (let i = 0; i <= Math.ceil(Math.log2(datalength)); i += 1) {
		structure.push(getMaxIdxAtLayer(i, datalength));
	}

	return structure;
};

export const getBinary = (num: number, length: number): number[] => {
	if (length === 0) {
		return [];
	}
	let binaryString = num.toString(2);
	while (binaryString.length < length) binaryString = `0${binaryString}`;

	return binaryString.split('').map(d => parseInt(d, 10));
};

export const getPairLocation = (nodeInfo: {
	layerIndex: number;
	nodeIndex: number;
	dataLength: number;
}): NodeLocation => {
	const { layerIndex, nodeIndex, dataLength } = nodeInfo;
	const treeHeight = Math.ceil(Math.log2(dataLength)) + 1;
	const layerStructure = getLayerStructure(dataLength);
	const numberOfNodesinLayer = layerStructure[layerIndex];
	const binary = getBinary(nodeIndex, treeHeight - layerIndex);
	const side = [NodeSide.LEFT, NodeSide.RIGHT][binary[binary.length - 1]];
	const pairSide = side === NodeSide.LEFT ? NodeSide.RIGHT : NodeSide.LEFT;

	// If queried node is root, provide root node location
	if (layerIndex + 1 === treeHeight) {
		return { layerIndex: treeHeight - 1, nodeIndex: 0 };
	}
	// If node is left node not last element in the layer
	if (side === NodeSide.LEFT && nodeIndex < numberOfNodesinLayer - 1) {
		const pairNodeIndex = nodeIndex + 1;
		return { layerIndex, nodeIndex: pairNodeIndex, side: pairSide };
	}
	// If node is right node AND (not last element in layer OR last element in the layer with even # of nodes)
	if (
		side === NodeSide.RIGHT &&
		((numberOfNodesinLayer % 2 === 0 &&
			nodeIndex === numberOfNodesinLayer - 1) ||
			(nodeIndex < numberOfNodesinLayer - 1 &&
				nodeIndex < numberOfNodesinLayer - 1))
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
