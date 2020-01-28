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

import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import {
	TransferTransaction,
	SecondSignatureTransaction,
	DelegateTransaction,
	VoteTransaction,
	MultisignatureTransaction,
} from '@liskhq/lisk-transactions';
import { TransactionInterfaceAdapter } from '../../src/data_access/transaction_interface_adapter';
import * as genesisBlock from '../fixtures/genesis_block.json';

const networkIdentifier = getNetworkIdentifier(
	genesisBlock.payloadHash,
	genesisBlock.communityIdentifier,
);

// TODO: re-implement for new transaction processing
describe('transactions', () => {
	describe('TransactionInterfaceAdapter', () => {
		const registeredTransactions = {
			8: TransferTransaction,
			9: SecondSignatureTransaction,
			10: DelegateTransaction,
			11: VoteTransaction,
			12: MultisignatureTransaction,
		};

		let transactions: TransactionInterfaceAdapter;

		beforeEach(async () => {
			// Act
			transactions = new TransactionInterfaceAdapter(
				networkIdentifier,
				registeredTransactions,
			);
		});

		describe('constructor', () => {
			it('should create initTransaction with correct properties', async () => {
				expect(transactions).toHaveProperty('_transactionClassMap');
			});

			it('should have transactionClassMap property with Lisk transaction types', async () => {
				expect([...(transactions as any)._transactionClassMap.keys()]).toEqual([
					8,
					9,
					10,
					11,
					12,
				]);
			});
		});

		describe('fromJSON', () => {
			it('should throw an error if transaction type is not registered', async () => {
				expect(() => transactions.fromJSON({ type: 1 } as any)).toThrow(
					'Transaction type not found.',
				);
			});

			it('should initialize a transfer transaction', async () => {
				const transfer = {
					type: 8,
					amount: '4008489300000000',
					fee: '10000000',
					recipientId: '1859190791819301L',
					timestamp: 54196076,
					asset: {},
					senderPublicKey:
						'5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca',
					signature:
						'1518a69983e348359f62a8e740f6f5f08c0c3cad651e5116bf991bc5a4b4cfb8bf8c033a86e30f596fac80142df5a4121400ac2e9307614a143ffd75cc07c20b',
					id: '7507990258936015021',
				};

				expect(transactions.fromJSON(transfer)).toBeInstanceOf(
					TransferTransaction,
				);
			});

			it('should initialize a second signature transaction', async () => {
				const secondSignature = {
					type: 9,
					senderPublicKey:
						'5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca',
					timestamp: 54316324,
					asset: {
						signature: {
							publicKey:
								'f9666bfed9ef2ff52a04408f22f2bfffaa81384c9433463697330224f10032a4',
						},
					},
					signature:
						'69d0c7bc50b82465e2b0885cebc422aa9cd575050dc89905e22a6e2cc88802935c6809a59a2daa04ca99623a6fef76b7d03215ed7f401b74ef5301b12bfe2002',
					id: '6998015087494860094',
				};

				expect(transactions.fromJSON(secondSignature)).toBeInstanceOf(
					SecondSignatureTransaction,
				);
			});

			it('should initialize a delegate transaction', async () => {
				const delegate = {
					type: 10,
					senderPublicKey:
						'5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca',
					timestamp: 54196076,
					asset: {
						delegate: {
							username: 'RLI0',
							publicKey:
								'5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca',
						},
					},
					signature:
						'3147b031c6fa71cbfc3f8a74b9cd5ed85b56b01f00e9df13244c354d43bfa90ec89dd2fe66d8e5107233073b5aac387cb54d1454ac68e73d43203d1f14ec0900',
					id: '5337978774712629501',
				};

				expect(transactions.fromJSON(delegate)).toBeInstanceOf(
					DelegateTransaction,
				);
			});

			it('should initialize a vote transaction', async () => {
				const vote = {
					type: 11,
					senderPublicKey:
						'5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca',
					timestamp: 54196078,
					asset: {
						votes: [
							'+900fcb60a949a9269af36f0da4a7da6e5b9a81bafb1929b2882f8aeda5960ff0',
							'+083d534a51c358e6dce6d43f4f0de8abf5bb1d8b8ee7fe817c5b225bb4c46fd8',
							'+2027d6af78cc6b10d1fa9712dbb6241b67531552c2d3a688d8565c37b8a307ff',
							'+9e3f52823ebdb0e07649b1d260f864691b81a4f7e18fdf8935bbb1bcfe454663',
							'-18982fb4caf0cae685a3ca44fe91445c26bef542f09fc8ea0e25fd33fd948fd7',
						],
					},
					signature:
						'45010721b4ed0424a003da5e82f5917a8895d99adb0bf9509b65cd7dbd14653efd9ed0b4f52a4d1ab7da89e3b8ef33337a67737af451df06bee51b124f741c0b',
					id: '9048233810524582722',
				};

				expect(transactions.fromJSON(vote)).toBeInstanceOf(VoteTransaction);
			});

			it('should initialize a multisignature transaction', async () => {
				const multisignature = {
					type: 12,
					senderPublicKey:
						'5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca',
					timestamp: 54196078,
					asset: {
						min: 5,
						lifetime: 1,
						keysgroup: [
							'+6638548d991d49e2b41bf15b595fa19749b25c58483e7e8fc926038074571ebf',
							'+a0ed6137800e9a65f796e423d9ebece0a7df53f0049e90eebc2e597452de69ed',
							'+4bb9e15fa15cbe87d19b6854474d57c3aa515deb586548bb515630dc7121d021',
							'+068bcac57c9d988f0a03bab381785c67ef4b63ca8047f41863fb2a0202aa88a5',
							'+261fb86d60785e208ba7541db9ab56d3e02fcf9357a25bf859f826e87cadb816',
						],
					},
					signature:
						'46f6ce8da1b5948aaa63a51cf28913210d356cc27a2cc952a2bf1b88f47d6cd6f250f8d907b9a4e0c531a66c601b50aa483a461e803412f2ae9543d99155970f',
					id: '15911083597203956215',
				};

				expect(transactions.fromJSON(multisignature)).toBeInstanceOf(
					MultisignatureTransaction,
				);
			});
		});
	});
});
