/*
 * Copyright © 2021 Lisk Foundation
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
import { calculatePathNodes, ROOT_INDEX } from './utils';

export const calculateRootFromUpdateData = (
	updateData: Buffer[],
	proof: {
		siblingHashes: Buffer[];
		indexes: number[];
		size: number;
	},
): Buffer => {
	const { indexes, size, siblingHashes } = proof;

	if (size === 0 || indexes.length === 0) {
		throw new Error('Invalid proof.');
	}

	if (updateData.length !== indexes.length) {
		throw new Error("Amount of update data doesn't match amount of indexes");
	}

	const updateHashes = [];

	for (const data of updateData) {
		const leafValueWithoutNodeIndex = Buffer.concat(
			[LEAF_PREFIX, data],
			LEAF_PREFIX.length + data.length,
		);
		const leafHash = utils.hash(leafValueWithoutNodeIndex);
		updateHashes.push(leafHash);
	}

	const calculatedTree = calculatePathNodes(updateHashes, size, indexes, siblingHashes);
	const calculatedRoot = calculatedTree.get(ROOT_INDEX);
	return calculatedRoot as Buffer;
};
