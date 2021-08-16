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

import { MerkleTree } from '../../src/merkle_tree/merkle_tree';
import * as fixtures from '../fixtures/merkle_tree/update_leaves_fixtures.json';

describe('update', () => {
	for (const test of fixtures.testCases) {
		it(test.description, async () => {
			const tree = new MerkleTree();
			await tree.init(test.input.values.map(v => Buffer.from(v, 'hex')));
			const updateData = test.input.updateValues.map(d => Buffer.from(d, 'hex'));
			const idxs = test.input.proof.indexes.map(hexString => Number(`0x${hexString}`));

			const nextRoot = await tree.update(idxs, updateData);

			expect(nextRoot).toEqual(Buffer.from(test.output.finalMerkleRoot, 'hex'));
		});
	}
});
