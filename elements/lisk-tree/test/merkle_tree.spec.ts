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
		it('should append and have correct root when leaf size is 3', () => {
			const values = [
				Buffer.from(
					'eda3b36bf12cecc2cb1b8bd61f8fca182fffe36442bf15dfe2ae448153281904',
					'hex',
				),
				Buffer.from(
					'0c239e9eac45f3def847df4fc32a455deef69463b9d2b169e093eccb5e00b948',
					'hex',
				),
			];
			const merkleTree = new MerkleTree(values);

			merkleTree.append(
				Buffer.from(
					'8232ad1608feaa637a57c0b0591b4a806f7f6c899ccee842cdc79cc3fce1902e',
					'hex',
				),
			);
			expect(merkleTree.root).toEqual(
				Buffer.from(
					'ca46535af3c0e96cb72d24c46552d541870a39c64b27d563b44cc4c50cb614f2',
					'hex',
				),
			);
		});

		it('should append and have correct root when leaf size is 4', () => {
			const values = [
				Buffer.from(
					'e14d73e96cd35bd6f7b8192ba00888bb69c757827cfe6375ccfff82769fc0c56',
					'hex',
				),
				Buffer.from(
					'9a6f672c2fb08b466c719c4fe4c44c5f38919c8ef6e94dbc4309b88ad7619619',
					'hex',
				),
				Buffer.from(
					'f740d8abf2b114424b6c27527dead8fd81aa8973fd3bc6095a50145003ea197c',
					'hex',
				),
			];
			const merkleTree = new MerkleTree(values);

			merkleTree.append(
				Buffer.from(
					'24109aeebd9dc99c4a65ee778c861a4c521fc756483f8412c76960a81ed2fff0',
					'hex',
				),
			);

			expect(merkleTree.root).toEqual(
				Buffer.from(
					'a35f00b2a86d7bf43371b026f0a80f4e0c7c2ab50bccd762001f437960168bc9',
					'hex',
				),
			);
		});

		it('should append and have correct root when leaf size is 5', () => {
			const values = [
				Buffer.from(
					'204d734600ca3151e1d92c5445865ab1f16bfb0f0b14512f96a75cd2877f460d',
					'hex',
				),
				Buffer.from(
					'b163e2702ac307893b2d4ee8fbf4e234dcb7631eca3c68d2114a78608c9f8854',
					'hex',
				),
				Buffer.from(
					'd996b099c10a58e417aaf26c83424ad0fd4838e1357b20903e5f9cfa21fc0759',
					'hex',
				),
				Buffer.from(
					'b9bc4cd87cdf2ea5168e80dfff81ef91f538776644c81a15250b91af871bb729',
					'hex',
				),
			];
			const merkleTree = new MerkleTree(values);

			merkleTree.append(
				Buffer.from(
					'dd8fdd25b02b1778cdb4d2f5643b402a3091845e0b7b05081987f42fa2a994c6',
					'hex',
				),
			);

			expect(merkleTree.root).toEqual(
				Buffer.from(
					'3e38183b0c13090bfe781f15cde029bb20cc8beccd942439a3162ec5799967b3',
					'hex',
				),
			);
		});

		it('should append and have correct root when leaf size is 6', () => {
			const values = [
				Buffer.from(
					'57cc00c7984a8dc76e5df23cb488ccb4e54e7b473cf6df08d0d7d5f4498bfc3c',
					'hex',
				),
				Buffer.from(
					'1645c87cb741fa836f7f8ba5405d37c909f8532739c14251335ef3a38a4bc7f2',
					'hex',
				),
				Buffer.from(
					'34c729160d7a2a655c2bb70ac5deb16f76527e4755531c794d104ed605cf6ce8',
					'hex',
				),
				Buffer.from(
					'dc8e71c565a022a3ccb0b9e4ee5b0b6c09fadd6b763e06a309ec7406e4866005',
					'hex',
				),
				Buffer.from(
					'e76031f1e8acfaf397724ec44bb6fdf705dea572e984874651e79237e3e788b8',
					'hex',
				),
			];
			const merkleTree = new MerkleTree(values);

			merkleTree.append(
				Buffer.from(
					'd8b690df2d1dcf05356619b25c858de978f0c35d653b1e137524b06b78cbc083',
					'hex',
				),
			);

			expect(merkleTree.root).toEqual(
				Buffer.from(
					'c762e8bb678b2f253449fdd4af3ca4fbd536f0003a9a5163132b4972cab95d35',
					'hex',
				),
			);
		});

		it('should append and have correct root when leaf size is 7', () => {
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

		it('should append and have correct root when leaf size is 9', () => {
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
