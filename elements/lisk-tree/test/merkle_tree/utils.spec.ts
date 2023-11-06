/*
 * LiskHQ/lisk-commander
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
 *
 */

import * as fixture from '../fixtures/transaction_merkle_root/transaction_merkle_root.json';
import { MerkleTree } from '../../src/merkle_tree/merkle_tree';
import { calculateMerkleRoot, calculateMerkleRootWithLeaves } from '../../src/merkle_tree/utils';

describe('utils', () => {
	describe('calculateMerkleRoot', () => {
		describe('should generate correct merkle root info', () => {
			// Skip the case of empty tree since there is no value to pop
			for (const test of fixture.testCases.slice(1)) {
				describe(test.description, () => {
					const fullTree = new MerkleTree();
					const partialTree = new MerkleTree();
					const transactionIds = test.input.transactionIds.map(hexString =>
						Buffer.from(hexString, 'hex'),
					);
					let valueToAppend: Buffer;

					beforeAll(async () => {
						await fullTree.init(transactionIds);
						valueToAppend = transactionIds.pop() as Buffer;
						await partialTree.init(transactionIds);
					});

					it('should return correct merkle root, appendPath and size', async () => {
						const previousAppendPath = await partialTree['_getAppendPathHashes']();
						const previousSize = partialTree.size;
						const { root, appendPath, size } = calculateMerkleRoot({
							value: valueToAppend,
							appendPath: previousAppendPath,
							size: previousSize,
						});

						expect(root).toEqual(fullTree.root);
						expect(appendPath).toEqual(await fullTree['_getAppendPathHashes']());
						expect(size).toEqual(fullTree.size);
					});
				});
			}
		});
	});

	describe('calculateMerkleRootWithLeaves', () => {
		describe('should generate correct merkle root info', () => {
			for (const test of fixture.testCases) {
				describe(test.description, () => {
					const transactionIds = test.input.transactionIds.map(hexString =>
						Buffer.from(hexString, 'hex'),
					);

					it('should return correct merkle root', () => {
						expect(calculateMerkleRootWithLeaves(transactionIds)).toEqual(
							Buffer.from(test.output.transactionMerkleRoot, 'hex'),
						);
					});
				});
			}
		});
	});
});
