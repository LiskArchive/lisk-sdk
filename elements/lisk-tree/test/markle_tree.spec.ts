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
import { hash } from '@liskhq/lisk-cryptography';
import { MerkleTree } from '../src/merkle_tree';
import { EMPTY_HASH, LEAF_PREFIX } from '../src/constants';

describe('MerkleTree', () => {
	describe('constructor', () => {
		it('should have empty hash as merkle root', () => {
			const merkleTree = new MerkleTree();
			expect(merkleTree.root).toEqual(EMPTY_HASH);
		});

		it('should have leaf hash as merkle root when data length is 1', () => {
			const values = [Buffer.from('c52b7e9ff957', 'hex')];
			const merkleTree = new MerkleTree(values);
			expect(merkleTree.root).toEqual(
				hash(Buffer.concat([LEAF_PREFIX, values[0]])),
			);
		});

		it('should have correct merkle root when leaf size is 2', () => {
			const values = [
				Buffer.from('118a0227', 'hex'),
				Buffer.from('21aa9ea3', 'hex'),
			];
			const merkleTree = new MerkleTree(values);
			expect(merkleTree.root).toEqual(
				Buffer.from(
					'8d066c6c16a06307c837f901ca735f0f0a9460c42d9868d948ad01432b8c24e8',
					'hex',
				),
			);
		});

		it('should have correct merkle root when leaf size is 3', () => {
			const values = [
				Buffer.from('1d8259c1', 'hex'),
				Buffer.from('3011638b', 'hex'),
				Buffer.from('eb4031', 'hex'),
			];
			const merkleTree = new MerkleTree(values);
			expect(merkleTree.root).toEqual(
				Buffer.from(
					'c35ebf5a2e7556f1d79367cd0ae0d660075f50d7ed70a2ac29b318849a13b972',
					'hex',
				),
			);
		});

		it('should have correct merkle root when leaf size is 4', () => {
			const values = [
				Buffer.from('2ee1f1b7', 'hex'),
				Buffer.from('c57670', 'hex'),
				Buffer.from('2f119876', 'hex'),
				Buffer.from('8594ad', 'hex'),
			];
			const merkleTree = new MerkleTree(values);
			expect(merkleTree.root).toEqual(
				Buffer.from(
					'7d2c946bdb3acb78e24dd007a584ff9e658e2c5843da7bc40fa57672bc98489a',
					'hex',
				),
			);
		});

		it('should have correct merkle root when leaf size is 6', () => {
			const values = [
				Buffer.from('7bc78e', 'hex'),
				Buffer.from('2da6ea8b', 'hex'),
				Buffer.from('27245a5c', 'hex'),
				Buffer.from('3633f17e', 'hex'),
				Buffer.from('395c934e', 'hex'),
				Buffer.from('167f1c4b', 'hex'),
			];

			const merkleTree = new MerkleTree(values);
			expect(merkleTree.root).toEqual(
				Buffer.from(
					'8880becaf85898f67823f174f9851cb4e3518d362aa7b5f8836490942b14e4ce',
					'hex',
				),
			);
		});

		it('should have correct merkle root when leaf size is 7', () => {
			const values = [
				Buffer.from('c52b7e9ff957', 'hex'),
				Buffer.from('a6d3535449f2', 'hex'),
				Buffer.from('66d818dc18be', 'hex'),
				Buffer.from('a21cc76476a6', 'hex'),
				Buffer.from('db530614b19b', 'hex'),
				Buffer.from('10fa2f056c8b', 'hex'),
				Buffer.from('340222bba8ba', 'hex'),
			];

			const merkleTree = new MerkleTree(values);
			expect(merkleTree.root).toEqual(
				Buffer.from(
					'd4aa6b41cd405f159d88afaa0a27451fe6f7990741fbb38fd438dbff13e5f581',
					'hex',
				),
			);
		});

		it('should have correct merkle root when leaf size is 9', () => {
			const values = [
				Buffer.from('1d28634b', 'hex'),
				Buffer.from('1b35e11c', 'hex'),
				Buffer.from('21602694', 'hex'),
				Buffer.from('1fd63c55', 'hex'),
				Buffer.from('2e54aeff', 'hex'),
				Buffer.from('160869d5', 'hex'),
				Buffer.from('27f40577', 'hex'),
				Buffer.from('2b3d1e', 'hex'),
				Buffer.from('1232b97e', 'hex'),
			];
			const merkleTree = new MerkleTree(values);
			expect(merkleTree.root).toEqual(
				Buffer.from(
					'e22f09df586565e5b9adc0ba9b49da1678c8d17c416f396db3b4c529339aa669',
					'hex',
				),
			);
		});
	});

	describe('append', () => {
		it('should append have correct root when leaf size is 3', () => {
			const values = [
				Buffer.from('1d8259c1', 'hex'),
				Buffer.from('3011638b', 'hex'),
			];
			const merkleTree = new MerkleTree(values);

			merkleTree.append(Buffer.from('eb4031', 'hex'));

			expect(merkleTree.root).toEqual(
				Buffer.from(
					'c35ebf5a2e7556f1d79367cd0ae0d660075f50d7ed70a2ac29b318849a13b972',
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

			console.info(merkleTree.toString());

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
