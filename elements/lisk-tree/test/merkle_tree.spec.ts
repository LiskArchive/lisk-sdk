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
		for (const test of fixture.testCases) {
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
		it.todo('should generate proof that is verifiable');
	});
});
