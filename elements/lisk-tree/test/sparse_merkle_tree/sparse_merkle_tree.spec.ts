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

import { InMemoryDB } from '../../src/inmemory_db';
import { SparseMerkleTree } from '../../src/sparse_merkle_tree/sparse_merkle_tree';
import { Database } from '../../src/sparse_merkle_tree/types';
import * as fixtures from '../fixtures/sparse_merkle_tree/update_tree.json';

describe('SparseMerkleTree', () => {
	describe('dummy', () => {
		it('is a dummy test', () => {
			expect(SparseMerkleTree).toBeDefined();
		});
	});
	describe('constructor', () => {});
	describe('update', () => {
		let db: Database;
		let smt: SparseMerkleTree;

		beforeEach(() => {
			db = new InMemoryDB();
			smt = new SparseMerkleTree({ db });
		});

		for (const test of fixtures.testCases) {
			// eslint-disable-next-line no-loop-func
			it(test.description, async () => {
				const inputKeys = test.input.keys;
				const inputValues = test.input.values;
				const outputMerkleRoot = test.output.merkleRoot;

				for (let i = 0; i < inputKeys.length; i += 1) {
					await smt.update(Buffer.from(inputKeys[i], 'hex'), Buffer.from(inputValues[i], 'hex'));
				}

				expect(smt.rootHash.toString('hex')).toEqual(outputMerkleRoot);
			});
		}
	});
	describe('remove', () => {});
	describe('generateSingleProof', () => {});
	describe('generateMultiProof', () => {});
	describe('verifyMultiProof', () => {});
});
