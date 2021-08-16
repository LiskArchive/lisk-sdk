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
import { verifyProof } from '../../src/merkle_tree/verify_proof';
import * as fixtures from '../fixtures/merkle_tree/rmt-generate-verify-proof-fixtures.json';

describe('generate and verify proof', () => {
	describe('generate proof', () => {
		for (const test of fixtures.testCases) {
			it(test.description, async () => {
				const values = test.input.values.map(val => Buffer.from(val, 'hex'));
				const merkleTree = new MerkleTree();
				await merkleTree.init(values);
				const queryHashes = test.input.queryHashes.map(v => Buffer.from(v, 'hex'));

				const generatedProof = await merkleTree.generateProof(queryHashes);

				expect(generatedProof.idxs).toEqual(test.output.proof.idxs.map(v => Number(`0x${v}`)));
				expect(generatedProof.size).toEqual(Number(test.output.proof.size));
				expect(generatedProof.siblingHashes).toEqual(
					test.output.proof.siblingHashes.map(v => Buffer.from(v, 'hex')),
				);
			});
		}
	});

	describe('verify proof', () => {
		for (const test of fixtures.testCases) {
			it(test.description, () => {
				const queryHashes = test.input.queryHashes.map(v => Buffer.from(v, 'hex'));
				const proof = {
					idxs: test.output.proof.idxs.map(v => Number(`0x${v}`)),
					siblingHashes: test.output.proof.siblingHashes.map(v => Buffer.from(v, 'hex')),
					size: Number(test.output.proof.size),
				};
				const root = Buffer.from(test.output.merkleRoot, 'hex');

				expect(verifyProof(queryHashes, proof, root)).toBeTrue();
			});
		}
	});
});
