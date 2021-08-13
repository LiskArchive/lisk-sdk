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

import { calculateRootFromUpdateData } from '../../src/merkle_tree/calculate';
import * as fixtures from '../fixtures/merkle_tree/update_leaves_fixtures.json';

describe('calculateRootFromUpdateData', () => {
	for (const test of fixtures.testCases) {
		it(test.description, () => {
			const proof = {
				indexes: test.input.proof.indexes.map(hexString => Number(`0x${hexString}`)),
				size: Number(test.input.proof.size),
				siblingHashes: test.input.proof.siblingHashes.map(h => Buffer.from(h, 'hex')),
			};
			const updateData = test.input.updateValues.map(d => Buffer.from(d, 'hex'));
			const root = calculateRootFromUpdateData(updateData, proof);

			expect(root).toEqual(Buffer.from(test.output.finalMerkleRoot, 'hex'));
		});
	}
});
