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

import { MerkleTree } from '../src/merkle_tree';
import * as fixture from './fixtures/transaction_merkle_root/transaction_merkle_root.json';

describe('MerkleTree', () => {
	describe('constructor', () => {
		for (const test of fixture.testCases) {
			describe(test.description, () => {
				it('should result in correct merkle root', () => {
					const inputs = test.input.transactionIds.map(hexString =>
						Buffer.from(hexString, 'hex'),
					);
					const merkleTree = new MerkleTree(inputs);

					expect(merkleTree.root).toEqual(
						Buffer.from(test.output.transactionMerkleRoot, 'hex'),
					);
				});
			});
		}
	});

	describe('append', () => {
		for (const test of fixture.testCases.slice(1)) {
			describe(test.description, () => {
				it(`should append and have correct root`, () => {
					const inputs = test.input.transactionIds.map(hexString =>
						Buffer.from(hexString, 'hex'),
					);
					const toAppend = inputs.pop();
					const merkleTree = new MerkleTree(inputs);
					merkleTree.append(toAppend as Buffer);
					expect(merkleTree.root).toEqual(
						Buffer.from(test.output.transactionMerkleRoot, 'hex'),
					);
				});
			});
		}
	});

	describe('generateProof', () => {
		describe('when given a tree with two leaves', () => {
			let merkleTree: MerkleTree;
			const queryData = [
				Buffer.from(
					'ceb669e057511ef944a000b46dd2b15d2479bcdf5a58425843046e25a739cabb',
					'hex',
				),
			];

			beforeEach(() => {
				const inputs = fixture.testCases[2].input.transactionIds.map(
					hexString => Buffer.from(hexString, 'hex'),
				);
				merkleTree = new MerkleTree(inputs);
			});

			it('should generate the expected path hash', () => {
				const expectedProofHash = Buffer.from(
					'4dd4ad391dcabcc6e1c07478b13ea52b94ace83a7ed6f84559b3c25a7d5011ff',
					'hex',
				);

				expect(
					merkleTree
						.generateProof(queryData)[0]
						.hash.compare(expectedProofHash),
				).toEqual(0);
			});

			it('should generate the expected proof path hash direction', () => {
				const expectedProofHashDirection = 0;

				expect(merkleTree.generateProof(queryData)[0].direction).toEqual(
					expectedProofHashDirection,
				);
			});
		});
	});
});
