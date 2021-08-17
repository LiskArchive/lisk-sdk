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
import * as fixture from '../fixtures/transaction_merkle_root/transaction_merkle_root.json';
import { MerkleTree } from '../../src/merkle_tree/merkle_tree';

describe('MerkleTree', () => {
	describe('constructor', () => {
		for (const test of fixture.testCases) {
			// eslint-disable-next-line jest/valid-title
			describe(test.description, () => {
				it('should result in correct merkle root', async () => {
					const inputs = test.input.transactionIds.map(hexString => Buffer.from(hexString, 'hex'));
					const merkleTree = new MerkleTree();
					await merkleTree.init(inputs);

					expect(merkleTree.root).toEqual(Buffer.from(test.output.transactionMerkleRoot, 'hex'));
				});

				describe('should allow pre-hashed leafs', () => {
					if (test.input.transactionIds.length > 2 ** 2) {
						it('should result in same merkle root if divided into sub tree of power of 2', async () => {
							const inputs = test.input.transactionIds.map(hexString =>
								Buffer.from(hexString, 'hex'),
							);
							const subTreeRoots = [];

							const chunk = 2 ** 2;
							for (let i = 0; i < inputs.length; i += chunk) {
								const tree = new MerkleTree();
								await tree.init(inputs.slice(i, i + chunk));
								subTreeRoots.push(tree.root);
							}

							const expectedTree = new MerkleTree({ preHashedLeaf: true });
							await expectedTree.init(subTreeRoots);

							expect(expectedTree.root).toEqual(
								Buffer.from(test.output.transactionMerkleRoot, 'hex'),
							);
						});

						it('should not result in same merkle root if divided into sub tree which is not power of 2', async () => {
							const inputs = test.input.transactionIds.map(hexString =>
								Buffer.from(hexString, 'hex'),
							);
							const subTreeRoots = [];

							const chunk = 3;
							for (let i = 0; i < inputs.length; i += chunk) {
								const tree = new MerkleTree();
								await tree.init(inputs.slice(i, i + chunk));
								subTreeRoots.push(tree.root);
							}

							const expectedTree = new MerkleTree({ preHashedLeaf: true });
							await expectedTree.init(subTreeRoots);

							expect(expectedTree.root).not.toEqual(
								Buffer.from(test.output.transactionMerkleRoot, 'hex'),
							);
						});
					}
				});
			});
		}
	});

	describe('append', () => {
		for (const test of fixture.testCases.slice(1)) {
			// eslint-disable-next-line jest/valid-title
			describe(test.description, () => {
				it('should append and have correct root', async () => {
					const inputs = test.input.transactionIds.map(hexString => Buffer.from(hexString, 'hex'));
					const toAppend = inputs.pop();
					const merkleTree = new MerkleTree();
					await merkleTree.init(inputs);
					await merkleTree.append(toAppend as Buffer);
					expect(merkleTree.root).toEqual(Buffer.from(test.output.transactionMerkleRoot, 'hex'));
				});
			});
		}
	});
});
