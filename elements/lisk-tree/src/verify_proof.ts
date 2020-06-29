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
import { dataStructures } from '@liskhq/lisk-utils';
import { BRANCH_PREFIX } from './constants';
import { NodeSide, Proof, VerifyResult } from './types';
import { generateHash, getPairLocation } from './utils';

export const verifyProof = (options: {
	queryData: ReadonlyArray<Buffer>;
	proof: Proof;
	rootHash: Buffer;
}): VerifyResult => {
	const { path, indexes, dataLength } = options.proof;
	const treeHeight = Math.ceil(Math.log2(dataLength)) + 1;
	const results = new dataStructures.BufferMap();

	if (dataLength <= 1 || options.queryData.length === 0) {
		return [{ hash: options.rootHash, verified: true }];
	}

	// Create a map for efficient lookup
	const locationToPathMap: { [key: string]: Buffer } = {};
	for (const p of path) {
		if (p.layerIndex !== undefined && p.nodeIndex !== undefined) {
			locationToPathMap[`${p.layerIndex}${p.nodeIndex}`] = p.hash;
		}
	}

	for (let i = 0; i < options.queryData.length; i += 1) {
		const queryHash = options.queryData[i];
		let { nodeIndex, layerIndex } = indexes[i];

		// Flag missing nodes
		if (nodeIndex === undefined || layerIndex === undefined) {
			results.set(queryHash, false);
			continue;
		}

		let currentHash = queryHash;
		while (layerIndex !== treeHeight) {
			const {
				layerIndex: pairLayerIndex,
				nodeIndex: pairNodeIndex,
				side: pairSide,
			} = getPairLocation({ layerIndex, nodeIndex, dataLength });
			const nextPath =
				locationToPathMap[
					`${pairLayerIndex.toString()}${pairNodeIndex.toString()}`
				];
			if (nextPath === undefined) {
				break;
			}
			const leftHashBuffer =
				pairSide === NodeSide.LEFT ? nextPath : currentHash;
			const rightHashBuffer =
				pairSide === NodeSide.RIGHT ? nextPath : currentHash;
			currentHash = generateHash(
				BRANCH_PREFIX,
				leftHashBuffer,
				rightHashBuffer,
			);
			layerIndex =
				pairLayerIndex > layerIndex ? pairLayerIndex + 1 : layerIndex + 1;
			// If tree is balanced, divide pair index by 2, else divide by power of two of layer difference
			nodeIndex =
				dataLength === 2 ** (treeHeight - 1)
					? Math.floor(pairNodeIndex / 2)
					: Math.floor(pairNodeIndex / 2 ** (layerIndex - pairLayerIndex));
		}

		if (!currentHash.equals(options.rootHash)) {
			results.set(queryHash, false);
			continue;
		}
		results.set(queryHash, true);
	}

	return results
		.entries()
		.map(result => ({ hash: result[0], verified: result[1] as boolean }));
};
