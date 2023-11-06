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
/* eslint-disable no-loop-func */
import * as fixture from '../fixtures/transaction_merkle_root/transaction_merkle_root.json';
import { MerkleTree } from '../../src/merkle_tree/merkle_tree';
import { calculateRightWitness, verifyRightWitness } from '../../src/merkle_tree/right_witness';

describe('Merkle tree - right witness', () => {
	describe('right witness generation and verification', () => {
		for (const test of fixture.testCases) {
			describe(test.description, () => {
				const fullTree = new MerkleTree();
				const inputs = test.input.transactionIds.map(hexString => Buffer.from(hexString, 'hex'));
				beforeAll(async () => {
					await fullTree.init(inputs);
				});

				it('should generate valid right witness', async () => {
					for (let i = 0; i < fullTree.size; i += 1) {
						const witness = await fullTree.generateRightWitness(i);
						const partialMerkleTree = new MerkleTree();
						await partialMerkleTree.init(inputs.slice(0, i));
						const appendPath = await partialMerkleTree['_getAppendPathHashes']();
						expect(verifyRightWitness(i, appendPath, witness, fullTree.root)).toBeTrue();
					}
				});

				it('should generate valid right witness statelessly', async () => {
					for (let i = 1; i < fullTree.size; i += 1) {
						const partialMerkleTree = new MerkleTree();
						await partialMerkleTree.init(inputs.slice(0, i));
						const appendPath = await partialMerkleTree['_getAppendPathHashes']();
						const values = inputs.slice(i);
						const witness = calculateRightWitness(i, values);
						expect(verifyRightWitness(i, appendPath, witness, fullTree.root)).toBeTrue();
					}
				});
			});
		}
	});
});
