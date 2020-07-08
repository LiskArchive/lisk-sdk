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

import {
	TransferTransaction,
	DelegateTransaction,
	MultisignatureTransaction,
	VoteTransaction,
	UnlockTransaction,
} from '@liskhq/lisk-transactions';
import { TransactionInterfaceAdapter } from '../../src/data_access/transaction_interface_adapter';

// TODO: re-implement for new transaction processing
describe('transactions', () => {
	describe('TransactionInterfaceAdapter', () => {
		const registeredTransactions = {
			8: TransferTransaction,
			10: DelegateTransaction,
			12: MultisignatureTransaction,
			13: VoteTransaction,
			14: UnlockTransaction,
		};

		let transactions: TransactionInterfaceAdapter;

		beforeEach(() => {
			// Arrange
			transactions = new TransactionInterfaceAdapter(registeredTransactions);
		});

		describe('constructor', () => {
			it('should create initTransaction with correct properties', () => {
				expect(transactions).toHaveProperty('_transactionClassMap');
			});

			it('should have transactionClassMap property with Lisk transaction types', () => {
				expect([...(transactions as any)._transactionClassMap.keys()]).toEqual([8, 10, 12, 13, 14]);
			});
		});

		describe('decode', () => {
			it('should initialize a transfer transaction', () => {
				const encodedTx = new TransferTransaction({
					id: Buffer.from('7507990258936015021'),
					type: 8,
					nonce: BigInt('0'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
						'hex',
					),
					signatures: [
						Buffer.from(
							'1518a69983e348359f62a8e740f6f5f08c0c3cad651e5116bf991bc5a4b4cfb8bf8c033a86e30f596fac80142df5a4121400ac2e9307614a143ffd75cc07c20b',
							'hex',
						),
					],
					asset: {
						recipientAddress: Buffer.from('1859190791819301L'),
						amount: BigInt('4008489300000000'),
						data: '',
					},
				}).getBytes();
				expect(transactions.decode(encodedTx)).toBeInstanceOf(TransferTransaction);
			});

			it('should initialize a delegate transaction', () => {
				const encodedTx = new DelegateTransaction({
					id: Buffer.from('7507990258936015021'),
					type: 10,
					nonce: BigInt('0'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
						'hex',
					),
					signatures: [
						Buffer.from(
							'1518a69983e348359f62a8e740f6f5f08c0c3cad651e5116bf991bc5a4b4cfb8bf8c033a86e30f596fac80142df5a4121400ac2e9307614a143ffd75cc07c20b',
							'hex',
						),
					],
					asset: {
						username: 'RLI0',
					},
				}).getBytes();

				expect(transactions.decode(encodedTx)).toBeInstanceOf(DelegateTransaction);
			});

			it('should initialize a vote transaction', () => {
				const encodedTx = new VoteTransaction({
					id: Buffer.from('7507990258936015021'),
					type: 13,
					nonce: BigInt('0'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
						'hex',
					),
					signatures: [
						Buffer.from(
							'1518a69983e348359f62a8e740f6f5f08c0c3cad651e5116bf991bc5a4b4cfb8bf8c033a86e30f596fac80142df5a4121400ac2e9307614a143ffd75cc07c20b',
							'hex',
						),
					],
					asset: {
						votes: [
							{
								delegateAddress: Buffer.from('123L'),
								amount: BigInt('1000000000'),
							},
							{
								delegateAddress: Buffer.from('456L'),
								amount: BigInt('1000000000'),
							},
						],
					},
				}).getBytes();
				expect(transactions.decode(encodedTx)).toBeInstanceOf(VoteTransaction);
			});

			it('should initialize a multisignature transaction', () => {
				const encodedTx = new MultisignatureTransaction({
					id: Buffer.from('7507990258936015021'),
					type: 12,
					nonce: BigInt('0'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
						'hex',
					),
					signatures: [
						Buffer.from(
							'1518a69983e348359f62a8e740f6f5f08c0c3cad651e5116bf991bc5a4b4cfb8bf8c033a86e30f596fac80142df5a4121400ac2e9307614a143ffd75cc07c20b',
							'hex',
						),
					],
					asset: {
						mandatoryKeys: [
							Buffer.from(
								'6638548d991d49e2b41bf15b595fa19749b25c58483e7e8fc926038074571ebf',
								'hex',
							),
							Buffer.from(
								'a0ed6137800e9a65f796e423d9ebece0a7df53f0049e90eebc2e597452de69ed',
								'hex',
							),
						],
						optionalKeys: [],
						numberOfSignatures: 2,
					},
				}).getBytes();
				expect(transactions.decode(encodedTx)).toBeInstanceOf(MultisignatureTransaction);
			});
		});

		describe('encode', () => {
			it('should encode a transfer transaction', () => {
				const tx = new TransferTransaction({
					id: Buffer.from('7507990258936015021'),
					type: 8,
					nonce: BigInt('0'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
						'hex',
					),
					signatures: [
						Buffer.from(
							'1518a69983e348359f62a8e740f6f5f08c0c3cad651e5116bf991bc5a4b4cfb8bf8c033a86e30f596fac80142df5a4121400ac2e9307614a143ffd75cc07c20b',
							'hex',
						),
					],
					asset: {
						recipientAddress: Buffer.from('1859190791819301L'),
						amount: BigInt('4008489300000000'),
						data: '',
					},
				});
				expect(transactions.encode(tx)).toBeInstanceOf(Buffer);
			});

			it('should encode a delegate transaction', () => {
				const tx = new DelegateTransaction({
					id: Buffer.from('7507990258936015021'),
					type: 10,
					nonce: BigInt('0'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
						'hex',
					),
					signatures: [
						Buffer.from(
							'1518a69983e348359f62a8e740f6f5f08c0c3cad651e5116bf991bc5a4b4cfb8bf8c033a86e30f596fac80142df5a4121400ac2e9307614a143ffd75cc07c20b',
							'hex',
						),
					],
					asset: {
						username: 'RLI0',
					},
				});

				expect(transactions.encode(tx)).toBeInstanceOf(Buffer);
			});

			it('should encode a vote transaction', () => {
				const tx = new VoteTransaction({
					id: Buffer.from('7507990258936015021'),
					type: 13,
					nonce: BigInt('0'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
						'hex',
					),
					signatures: [
						Buffer.from(
							'1518a69983e348359f62a8e740f6f5f08c0c3cad651e5116bf991bc5a4b4cfb8bf8c033a86e30f596fac80142df5a4121400ac2e9307614a143ffd75cc07c20b',
							'hex',
						),
					],
					asset: {
						votes: [
							{
								delegateAddress: Buffer.from('123L'),
								amount: BigInt('1000000000'),
							},
							{
								delegateAddress: Buffer.from('456L'),
								amount: BigInt('1000000000'),
							},
						],
					},
				});
				expect(transactions.encode(tx)).toBeInstanceOf(Buffer);
			});

			it('should encode a multisignature transaction', () => {
				const tx = new MultisignatureTransaction({
					id: Buffer.from('7507990258936015021'),
					type: 12,
					nonce: BigInt('0'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
						'hex',
					),
					signatures: [
						Buffer.from(
							'1518a69983e348359f62a8e740f6f5f08c0c3cad651e5116bf991bc5a4b4cfb8bf8c033a86e30f596fac80142df5a4121400ac2e9307614a143ffd75cc07c20b',
							'hex',
						),
					],
					asset: {
						mandatoryKeys: [
							Buffer.from(
								'6638548d991d49e2b41bf15b595fa19749b25c58483e7e8fc926038074571ebf',
								'hex',
							),
							Buffer.from(
								'a0ed6137800e9a65f796e423d9ebece0a7df53f0049e90eebc2e597452de69ed',
								'hex',
							),
						],
						optionalKeys: [],
						numberOfSignatures: 2,
					},
				});
				expect(transactions.encode(tx)).toBeInstanceOf(Buffer);
			});
		});
	});
});
