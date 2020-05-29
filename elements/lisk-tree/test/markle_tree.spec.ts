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

describe.only('MerkleTree', () => {
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
		it('should append have correct root when leaf size is 3', () => {
			const values = [
				Buffer.from('eda3b36bf12cecc2cb1b8bd61f8fca182fffe36442bf15dfe2ae448153281904', 'hex'),
				Buffer.from('0c239e9eac45f3def847df4fc32a455deef69463b9d2b169e093eccb5e00b948', 'hex'),
			];
			const merkleTree = new MerkleTree(values);

			merkleTree.append(Buffer.from('8232ad1608feaa637a57c0b0591b4a806f7f6c899ccee842cdc79cc3fce1902e', 'hex'));
			expect(merkleTree.root).toEqual(
				Buffer.from(
					'ca46535af3c0e96cb72d24c46552d541870a39c64b27d563b44cc4c50cb614f2',
					'hex',
				),
			);
		});

		it('should append have correct root when leaf size is 4', () => {
			const values = [
				Buffer.from('2ee1f1b7', 'hex'),
				Buffer.from('c57670', 'hex'),
				Buffer.from('2f119876', 'hex'),
			];
			const merkleTree = new MerkleTree(values);

			merkleTree.append(Buffer.from('8594ad', 'hex'));

			expect(merkleTree.root).toEqual(
				Buffer.from(
					'7d2c946bdb3acb78e24dd007a584ff9e658e2c5843da7bc40fa57672bc98489a',
					'hex',
				),
			);
		});

		it('should append have correct root when leaf size is 6', () => {
			const values = [
				Buffer.from('7bc78e', 'hex'),
				Buffer.from('2da6ea8b', 'hex'),
				Buffer.from('27245a5c', 'hex'),
				Buffer.from('3633f17e', 'hex'),
				Buffer.from('395c934e', 'hex'),
			];
			const merkleTree = new MerkleTree(values);

			merkleTree.append(Buffer.from('167f1c4b', 'hex'));

			expect(merkleTree.root).toEqual(
				Buffer.from(
					'8880becaf85898f67823f174f9851cb4e3518d362aa7b5f8836490942b14e4ce',
					'hex',
				),
			);
		});

		it('should append have correct root when leaf size is 7', () => {
			const values = [
				Buffer.from('c52b7e9ff957', 'hex'),
				Buffer.from('a6d3535449f2', 'hex'),
				Buffer.from('66d818dc18be', 'hex'),
				Buffer.from('a21cc76476a6', 'hex'),
				Buffer.from('db530614b19b', 'hex'),
				Buffer.from('10fa2f056c8b', 'hex'),
			];
			const merkleTree = new MerkleTree(values);

			merkleTree.append(Buffer.from('340222bba8ba', 'hex'));

			expect(merkleTree.root).toEqual(
				Buffer.from(
					'd4aa6b41cd405f159d88afaa0a27451fe6f7990741fbb38fd438dbff13e5f581',
					'hex',
				),
			);
		});

		it('should append have correct root when leaf size is 9', () => {
			const values = [
				Buffer.from('1d28634b', 'hex'),
				Buffer.from('1b35e11c', 'hex'),
				Buffer.from('21602694', 'hex'),
				Buffer.from('1fd63c55', 'hex'),
				Buffer.from('2e54aeff', 'hex'),
				Buffer.from('160869d5', 'hex'),
				Buffer.from('27f40577', 'hex'),
				Buffer.from('2b3d1e', 'hex'),
			];
			const merkleTree = new MerkleTree(values);

			merkleTree.append(Buffer.from('1232b97e', 'hex'));

			expect(merkleTree.root).toEqual(
				Buffer.from(
					'e22f09df586565e5b9adc0ba9b49da1678c8d17c416f396db3b4c529339aa669',
					'hex',
				),
			);
		});
	});

	describe('generateProof', () => {
		it.todo('should generate proof that is verifiable');
	});
});
