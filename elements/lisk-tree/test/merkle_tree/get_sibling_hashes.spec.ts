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

describe('siblingHashes', () => {
	for (const test of fixtures.testCases) {
		it(test.description, async () => {
			const values = test.input.values.map(hexString => Buffer.from(hexString, 'hex'));
			const testSiblingHashes = test.input.proof.siblingHashes.map(hexString =>
				Buffer.from(hexString, 'hex'),
			);
			const indexes = test.input.proof.indexes.map(hexString => Number(`0x${hexString}`));
			const merkleTree = new MerkleTree();
			await merkleTree.init(values);

			const siblingHashes = await merkleTree['_getSiblingHashes'](indexes);
			for (let i = 0; i < testSiblingHashes.length; i += 1) {
				const testSiblingHash = testSiblingHashes[i];
				const siblingHash = siblingHashes[i];
				expect(testSiblingHash.equals(siblingHash)).toBe(true);
			}
		});
	}
});
