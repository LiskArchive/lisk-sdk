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
import {
	createSignatureObject,
	SignatureObject,
} from '../src/create_signature_object';
import { TransactionJSON } from '../src/transaction_types';
import * as multisignatureFixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_with_multi_signature_validate.json';

const testCase = multisignatureFixture.testCases[0];

describe('#createSignatureObject', () => {
	describe('when invalid transaction is used', () => {
		it("should throw an Error when id doesn't exist", () => {
			const { id, ...mutatedTransaction } = testCase.output;
			return expect(
				createSignatureObject.bind(null, {
					transaction: {
						...mutatedTransaction,
						networkIdentifier: testCase.input.networkIdentifier,
					} as TransactionJSON,
					passphrase: testCase.input.coSigners[0].passphrase,
					networkIdentifier: testCase.input.networkIdentifier,
				}),
			).toThrowError(
				'Transaction ID is required to create a signature object.',
			);
		});

		it('should throw an Error when sender public key is mutated', () => {
			const mutatedTransaction = {
				...testCase.output,
				networkIdentifier: testCase.input.networkIdentifier,
				senderPublicKey:
					'3358a1562f9babd523a768e700bb12ad58f230f84031055802dc0ea58cef1000',
			};
			return expect(
				createSignatureObject.bind(null, {
					transaction: mutatedTransaction,
					passphrase: testCase.input.coSigners[0].passphrase,
					networkIdentifier: testCase.input.networkIdentifier,
				}),
			).toThrowError('Invalid transaction.');
		});

		it('should throw an Error when signature is mutated', () => {
			const mutatedTransaction = {
				...testCase.output,
				signature:
					'b84b95087c381ad25b5701096e2d9366ffd04037dcc941cd0747bfb0cf93111834a6c662f149018be4587e6fc4c9f5ba47aa5bbbd3dd836988f153aa8258e600',
				networkIdentifier: testCase.input.networkIdentifier,
			};
			return expect(
				createSignatureObject.bind(null, {
					transaction: mutatedTransaction,
					passphrase: testCase.input.coSigners[0].passphrase,
					networkIdentifier: testCase.input.networkIdentifier,
				}),
			).toThrowError('Invalid transaction.');
		});
	});

	describe('when valid transaction and invalid passphrase is used', () => {
		it('should throw an Error if passphrase is number', () => {
			const passphrase = 1;
			return expect(
				createSignatureObject.bind(null, {
					transaction: {
						...testCase.output,
						networkIdentifier: testCase.input.networkIdentifier,
					},
					passphrase: (passphrase as unknown) as string,
					networkIdentifier: testCase.input.networkIdentifier,
				}),
			).toThrowError(
				'Unsupported data format. Currently only Buffers or `hex` and `utf8` strings are supported.',
			);
		});
	});

	describe('when valid transaction and passphrase is used', () => {
		let signatureObject: SignatureObject;
		beforeEach(async () => {
			signatureObject = createSignatureObject({
				transaction: {
					...testCase.output,
					networkIdentifier: testCase.input.networkIdentifier,
				},
				passphrase: testCase.input.coSigners[0].passphrase,
				networkIdentifier: testCase.input.networkIdentifier,
			});
		});

		it('should have the same transaction id as the input', () => {
			return expect(signatureObject.transactionId).toBe(testCase.output.id);
		});

		it('should have the corresponding public key with the passphrase', () => {
			return expect(signatureObject.publicKey).toBe(
				testCase.input.coSigners[0].publicKey,
			);
		});

		it('should have non-empty hex string signature', () => {
			return expect(signatureObject.signature).toBe(
				testCase.output.signatures[0],
			);
		});
	});

	describe('when invalid transaction transaction is used', () => {
		it('should throw an Error if type is not defined', () => {
			const passphrase = 1;
			return expect(() =>
				createSignatureObject({
					transaction: {} as any,
					passphrase: (passphrase as unknown) as string,
					networkIdentifier: testCase.input.networkIdentifier,
				}),
			).toThrowError('Transaction type is required');
		});
	});

	it('should throw an Error if type is invalid', () => {
		const passphrase = 1;
		return expect(() =>
			createSignatureObject({
				transaction: {
					type: 1966,
				} as any,
				passphrase: (passphrase as unknown) as string,
				networkIdentifier: testCase.input.networkIdentifier,
			}),
		).toThrowError('Invalid transaction type.');
	});
});
