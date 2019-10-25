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
 *
 */
import { expect } from 'chai';
import {
	createSignatureObject,
	SignatureObject,
} from '../src/create_signature_object';
import { TransactionJSON } from '../src/transaction_types';

describe.only('#createSignatureObject', () => {
	// TODO: later use fixtures from proto spec
	const testSuite = {
		title: 'Valid transfer transaction with multi signature',
		summary: 'A valid transfer transaction with multi signature',
		config: 'devnet',
		runner: 'transaction_network_id_and_change_order',
		handler: 'transfer_transaction_with_multi_signature_validate',
		testCases: {
			input: {
				account: {
					passphrase:
						'wear protect skill sentence lift enter wild sting lottery power floor neglect',
					privateKey:
						'8f41ff1e75c4f0f8a71bae4952266928d0e91660fc513566ac694fed61157497efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
					publicKey:
						'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
					address: '2129300327344985743L',
				},
				coSigners: [
					{
						passphrase:
							'better across runway mansion jar route valid crack panic favorite smooth sword',
						privateKey:
							'de1520f8589408e76a97643ba7d27f20009b06899816c8af20f9b03f4a4bd8a66766ce280eb99e45d2cc7d9c8c852720940dab5d69f480e80477a97b4255d5d8',
						publicKey:
							'6766ce280eb99e45d2cc7d9c8c852720940dab5d69f480e80477a97b4255d5d8',
						address: '13191770412077040757L',
					},
					{
						passphrase:
							'mirror swap middle hunt angle furnace maid scheme amazing box bachelor debris',
						privateKey:
							'ad7462eb8f682b0c3424213ead044381ba0007bb65ce26287fc308027c871d951387d8ec6306807ffd6fe27ea3443985765c1157928bb09904307956f46a9972',
						publicKey:
							'1387d8ec6306807ffd6fe27ea3443985765c1157928bb09904307956f46a9972',
						address: '2443122499609067441L',
					},
				],
				networkIdentifier:
					'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
				transaction: {
					type: 8,
					senderPublicKey:
						'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
					timestamp: 54316325,
					asset: {
						recipientId: '18141291412139607230L',
						amount: '1234567890',
						data: 'random data',
					},
				},
			},
			output: {
				type: 8,
				senderPublicKey:
					'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
				timestamp: 54316325,
				asset: {
					recipientId: '18141291412139607230L',
					amount: '1234567890',
					data: 'random data',
				},
				signature:
					'c41169ce968e1bc8af2a83cab19fa3f697cda22cb84b40baf9adf844e8a1a8be5545eab1e7e5d0990d092e164024ee7d6f629f70f2e6486739084c4235b0060f',
				signatures: [
					'85d59ca41baa5fa789cf445b42268a9adf4336284e55b8d20091124f1916c8c7368aba0ec75587210d8c5d920243a1c6919b4bac9c3b9ab2aff8a4bb450f890e',
					'a7e8d041b3834dc69e54734faa7fdabf1a6c973634e8890735e2948bf02a51f10cb32ed549947d890e4a579c320bbea2137a301485704001cabb2ce510cdf10a',
				],
				id: '7887822993401942261',
			},
		},
	};

	describe('when invalid transaction is used', () => {
		it("should throw an Error when id doesn't exist", () => {
			const { id, ...mutatedTransaction } = testSuite.testCases.output;
			return expect(
				createSignatureObject.bind(null, {
					transaction: {
						...mutatedTransaction,
						networkIdentifier: testSuite.testCases.input.networkIdentifier,
					} as TransactionJSON,
					passphrase: testSuite.testCases.input.coSigners[0].passphrase,
					networkIdentifier: testSuite.testCases.input.networkIdentifier,
				}),
			).to.throw('Transaction ID is required to create a signature object.');
		});

		it('should throw an Error when sender public key is mutated', () => {
			const mutatedTransaction = {
				...testSuite.testCases.output,
				networkIdentifier: testSuite.testCases.input.networkIdentifier,
				senderPublicKey:
					'3358a1562f9babd523a768e700bb12ad58f230f84031055802dc0ea58cef1000',
			};
			return expect(
				createSignatureObject.bind(null, {
					transaction: mutatedTransaction,
					passphrase: testSuite.testCases.input.coSigners[0].passphrase,
					networkIdentifier: testSuite.testCases.input.networkIdentifier,
				}),
			).to.throw('Invalid transaction.');
		});

		it('should throw an Error when signature is mutated', () => {
			const mutatedTransaction = {
				...testSuite.testCases.output,
				signature:
					'b84b95087c381ad25b5701096e2d9366ffd04037dcc941cd0747bfb0cf93111834a6c662f149018be4587e6fc4c9f5ba47aa5bbbd3dd836988f153aa8258e600',
				networkIdentifier: testSuite.testCases.input.networkIdentifier,
			};
			return expect(
				createSignatureObject.bind(null, {
					transaction: mutatedTransaction,
					passphrase: testSuite.testCases.input.coSigners[0].passphrase,
					networkIdentifier: testSuite.testCases.input.networkIdentifier,
				}),
			).to.throw('Invalid transaction.');
		});
	});

	describe('when valid transaction and invalid passphrase is used', () => {
		it('should throw an Error if passphrase is number', () => {
			const passphrase = 1;
			return expect(
				createSignatureObject.bind(null, {
					transaction: {
						...testSuite.testCases.output,
						networkIdentifier: testSuite.testCases.input.networkIdentifier,
					},
					passphrase: (passphrase as unknown) as string,
					networkIdentifier: testSuite.testCases.input.networkIdentifier,
				}),
			).to.throw(
				'Unsupported data format. Currently only Buffers or `hex` and `utf8` strings are supported.',
			);
		});
	});

	describe('when valid transaction and passphrase is used', () => {
		let signatureObject: SignatureObject;
		beforeEach(async () => {
			signatureObject = createSignatureObject({
				transaction: {
					...testSuite.testCases.output,
					networkIdentifier: testSuite.testCases.input.networkIdentifier,
				},
				passphrase: testSuite.testCases.input.coSigners[0].passphrase,
				networkIdentifier: testSuite.testCases.input.networkIdentifier,
			});
		});

		it('should have the same transaction id as the input', () => {
			return expect(signatureObject.transactionId).to.equal(
				testSuite.testCases.output.id,
			);
		});

		it('should have the corresponding public key with the passphrase', () => {
			return expect(signatureObject.publicKey).to.equal(
				testSuite.testCases.input.coSigners[0].publicKey,
			);
		});

		it('should have non-empty hex string signature', () => {
			return expect(signatureObject.signature).to.equal(
				testSuite.testCases.output.signatures[0],
			);
		});
	});
});
