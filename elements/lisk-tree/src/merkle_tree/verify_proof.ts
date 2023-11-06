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
import { utils } from '@liskhq/lisk-cryptography';
import { LEAF_PREFIX } from './constants';
import { Proof } from './types';
import { calculatePathNodes, ROOT_INDEX } from './utils';

export const verifyProof = (
	queryHashes: ReadonlyArray<Buffer>,
	proof: Proof,
	rootHash: Buffer,
): boolean => {
	const { idxs, siblingHashes, size } = proof;
	if (size === 0) {
		return false;
	}
	let calculatedTree: Map<number, Buffer>;
	try {
		calculatedTree = calculatePathNodes(queryHashes, size, idxs, siblingHashes);
	} catch (error) {
		return false;
	}
	const calculatedRoot = calculatedTree.get(ROOT_INDEX);
	if (!calculatedRoot) {
		return false;
	}
	return calculatedRoot.equals(rootHash);
};

export const verifyDataBlock = (
	queryData: ReadonlyArray<Buffer>,
	proof: Proof,
	rootHash: Buffer,
): boolean => {
	const queryHashes = [];
	for (const data of queryData) {
		const leafValueWithoutNodeIndex = Buffer.concat(
			[LEAF_PREFIX, data],
			LEAF_PREFIX.length + data.length,
		);
		const leafHash = utils.hash(leafValueWithoutNodeIndex);
		queryHashes.push(leafHash);
	}

	return verifyProof(queryHashes, proof, rootHash);
};
