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
import { NotFoundError } from '../error';
import { InMemoryDB } from '../inmemory_db';
import { NodeSide, Proof, VerifyResult } from './types';
import { generateHash, getBinaryString, getPairLocation } from './utils';

export const verifyProof = async (options: {
	queryData: ReadonlyArray<Buffer>;
	proof: Proof;
	rootHash: Buffer;
}): Promise<VerifyResult> => {
	const { siblingHashes, indexes, size } = options.proof;
	const treeHeight = Math.ceil(Math.log2(size)) + 1;
	const results = new dataStructures.BufferMap();

	// If tree has one empty node
	if (size === 0 || options.queryData.length === 0) {
		return [{ hash: options.rootHash, verified: true }];
	}

	// Create a map for efficient lookup
	const locationToPathMap = new InMemoryDB();
	for (const p of siblingHashes) {
		if (p.layerIndex !== undefined && p.nodeIndex !== undefined) {
			await locationToPathMap.set(getBinaryString(p.nodeIndex, treeHeight - p.layerIndex), p.hash);
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

		// If tree has only one non-empty node, directly compare it to the siblingHashes
		if (size === 1) {
			if (siblingHashes.some(p => p.hash.equals(queryHash))) {
				results.set(queryHash, true);
			} else {
				results.set(queryHash, false);
			}
			continue;
		}

		let currentHash = queryHash;
		while (layerIndex !== treeHeight) {
			const {
				layerIndex: pairLayerIndex,
				nodeIndex: pairNodeIndex,
				side: pairSide,
			} = getPairLocation({ layerIndex, nodeIndex, size });
			let nextPath: Buffer;
			try {
				nextPath = await locationToPathMap.get(
					getBinaryString(pairNodeIndex, treeHeight - pairLayerIndex),
				);
			} catch (error) {
				if (error instanceof NotFoundError) {
					break;
				}
				throw error;
			}

			const leftHashBuffer = pairSide === NodeSide.LEFT ? nextPath : currentHash;
			const rightHashBuffer = pairSide === NodeSide.RIGHT ? nextPath : currentHash;
			currentHash = generateHash(BRANCH_PREFIX, leftHashBuffer, rightHashBuffer);
			layerIndex = pairLayerIndex > layerIndex ? pairLayerIndex + 1 : layerIndex + 1;
			// If tree is balanced, divide pair index by 2, else divide by power of two of layer difference
			nodeIndex =
				size === 2 ** (treeHeight - 1)
					? Math.floor(pairNodeIndex / 2)
					: Math.floor(pairNodeIndex / 2 ** (layerIndex - pairLayerIndex));
		}

		if (!currentHash.equals(options.rootHash)) {
			results.set(queryHash, false);
			continue;
		}
		results.set(queryHash, true);
	}

	return results.entries().map(result => ({ hash: result[0], verified: result[1] as boolean }));
};
