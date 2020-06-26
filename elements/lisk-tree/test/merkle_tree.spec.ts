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
import * as fixture from './fixtures/transaction_merkle_root/transaction_merkle_root.json';
import { MerkleTree } from '../src/merkle_tree';
import { Proof } from '../src/types';
import { verifyProof } from '../src/verify_proof';

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

	describe('generateProof and verifyProof', () => {
		for (const test of fixture.testCases.slice(2)) {
			describe(test.description, () => {
				it(`should generate and verify correct proof`, () => {
					const inputs = test.input.transactionIds.map(hexString =>
						Buffer.from(hexString, 'hex'),
					);
					const merkleTree = new MerkleTree(inputs);
					const nodes = (merkleTree as any)._getData();
					const queryData = nodes
						.sort(() => 0.5 - Math.random())
						.slice(0, Math.floor(Math.random() * nodes.length + 1))
						.map((node: any) => node.hash);
					const proof = merkleTree.generateProof(queryData) as Proof;
					const result = verifyProof({
						queryData,
						proof,
						rootHash: merkleTree.root,
					});

					expect(result).toBeTrue();
				});
			});
		}
	});
});
