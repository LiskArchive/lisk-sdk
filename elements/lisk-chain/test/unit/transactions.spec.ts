/*
 * Copyright © 2019 Lisk Foundation
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
import { utils } from '@liskhq/lisk-cryptography';
import { Transaction } from '../../src/transaction';

describe('blocks/transactions', () => {
	describe('transaction', () => {
		it.todo('should have id');
		it.todo('should have senderAddress');
		it.todo('should throw when module is invalid');
		it.todo('should throw when command is invalid');
		it.todo('should throw when sender public key is invalid');
		it.todo('should throw when nonce is invalid');
		it.todo('should throw when fee is invalid');
		it.todo('should throw when params is invalid');
	});
	describe('#validateTransaction', () => {
		let transaction: Transaction;

		it('should throw when module name is invalid', () => {
			transaction = new Transaction({
				module: 'token_mod',
				command: 'transfer',
				fee: BigInt(613000),
				params: utils.getRandomBytes(500),
				nonce: BigInt(2),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [utils.getRandomBytes(64)],
			});
			expect(() => transaction.validate()).toThrow('Invalid module name token_mod');
		});

		it('should throw when command name is invalid', () => {
			transaction = new Transaction({
				module: 'token',
				command: 'transfer_cross\nasd',
				fee: BigInt(613000),
				params: utils.getRandomBytes(500),
				nonce: BigInt(2),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [utils.getRandomBytes(64)],
			});
			expect(() => transaction.validate()).toThrow('Invalid command name');
		});

		it('should throw when sender public key is not 32 bytes', () => {
			transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				fee: BigInt(613000),
				params: utils.getRandomBytes(500),
				nonce: BigInt(2),
				senderPublicKey: utils.getRandomBytes(31),
				signatures: [utils.getRandomBytes(64)],
			});
			expect(() => transaction.validate()).toThrow('Lisk validator found 1 error[s]');
		});

		it('should throw when signatures is empty', () => {
			transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				fee: BigInt(613000),
				params: utils.getRandomBytes(500),
				nonce: BigInt(2),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [],
			});
			expect(() => transaction.validate()).toThrow('Signatures must not be empty');
		});

		it('should throw when any of signatures are not 64 bytes', () => {
			transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				fee: BigInt(613000),
				params: utils.getRandomBytes(500),
				nonce: BigInt(2),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [
					utils.getRandomBytes(64),
					utils.getRandomBytes(32),
					utils.getRandomBytes(32),
					utils.getRandomBytes(64),
				],
			});
			expect(() => transaction.validate()).toThrow('Signature must be empty or 64 bytes');
		});
	});
});
