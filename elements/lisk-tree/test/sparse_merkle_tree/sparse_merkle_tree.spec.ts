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
import { verify } from '../../src/sparse_merkle_tree/utils';
import * as fixtures from '../fixtures/sparse_merkle_tree/update_tree.json';
import * as SMTFixtures from '../fixtures/sparse_merkle_tree/smt_fixtures.json';
import * as ProofFixtures from '../fixtures/sparse_merkle_tree/smt_proof_fixtures.json';

describe('SparseMerkleTree', () => {
	describe('constructor', () => {});

	describe('update', () => {
		let db: Database;
		let smt: SparseMerkleTree;

		beforeEach(() => {
			db = new InMemoryDB();
			smt = new SparseMerkleTree({ db, keyLength: 32 });
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

		for (const test of SMTFixtures.testCases) {
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

	describe('generateMultiProof', () => {
		let db: Database;
		let smt: SparseMerkleTree;

		beforeEach(() => {
			db = new InMemoryDB();
			smt = new SparseMerkleTree({ db, keyLength: 32 });
		});

		for (const test of ProofFixtures.testCases) {
			// eslint-disable-next-line no-loop-func
			it(test.description, async () => {
				const inputKeys = test.input.keys;
				const inputValues = test.input.values;
				const queryKeys = test.input.queryKeys.map(keyHex => Buffer.from(keyHex, 'hex'));
				const outputMerkleRoot = test.output.merkleRoot;
				const outputProof = test.output.proof;

				for (let i = 0; i < inputKeys.length; i += 1) {
					await smt.update(Buffer.from(inputKeys[i], 'hex'), Buffer.from(inputValues[i], 'hex'));
				}

				const proof = await smt.generateMultiProof(queryKeys);

				const siblingHashesString = [];
				for (const siblingHash of proof.siblingHashes) {
					siblingHashesString.push(siblingHash.toString('hex'));
				}

				const queriesString = [];
				for (const query of proof.queries) {
					queriesString.push({
						key: query.key.toString('hex'),
						value: query.value.toString('hex'),
						bitmap: query.bitmap.toString('hex'),
					});
				}

				expect(siblingHashesString).toEqual(outputProof.siblingHashes);
				expect(queriesString).toEqual(outputProof.queries);
				expect(verify(queryKeys, proof, Buffer.from(outputMerkleRoot, 'hex'), 32)).toBeTrue();
			});
		}
	});
});
