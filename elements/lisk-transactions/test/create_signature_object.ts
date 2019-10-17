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

describe('#createSignatureObject', () => {
	const transaction = {
		senderPublicKey:
			'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		timestamp: 0,
		type: 0,
		asset: {
			recipientId: '18160565574430594874L',
			amount: '1000',
		},
		signature:
			'6287074a2a05d2438f30b32130b200ef19d5ec28bbb661b2e5ab7567f10922c5b2e0315e0a8b3b7d0b258435d84990b28588492f429172fb70fd2d0e97096500',
		id: '1085291840242865106',
	};
	const account = {
		passphrase:
			'love road panic horn cover grape nerve mechanic slice relax mobile salon',
		publicKey:
			'87696cfc48f5f5bd4ec2473615ac1618ffedfdc20005ae71a3d0dba209471c04',
	};
	const generatedSignature =
		'05a501135814de3e10126580597cfa25f9a40d89acf0fea206549e47ba7b961d8be3fe94e339b26b5e986c0b86ee9a5c6c27706c1446e8ca1a4e254a036d4503';
	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	describe('when invalid transaction is used', () => {
		it("should throw an Error when id doesn't exist", () => {
			const { id, ...mutatedTransaction } = transaction;
			return expect(
				createSignatureObject.bind(null, {
					transaction: mutatedTransaction as TransactionJSON,
					passphrase: account.passphrase,
					networkIdentifier: networkIdentifier,
				}),
			).to.throw('Transaction ID is required to create a signature object.');
		});
		it('should throw an Error when sender public key is mutated', () => {
			const mutatedTransaction = {
				...transaction,
				senderPublicKey:
					'3358a1562f9babd523a768e700bb12ad58f230f84031055802dc0ea58cef1000',
			};
			return expect(
				createSignatureObject.bind(null, {
					transaction: mutatedTransaction,
					passphrase: account.passphrase,
					networkIdentifier,
				}),
			).to.throw('Invalid transaction.');
		});

		it('should throw an Error when signature is mutated', () => {
			const mutatedTransaction = {
				...transaction,
				signature:
					'b84b95087c381ad25b5701096e2d9366ffd04037dcc941cd0747bfb0cf93111834a6c662f149018be4587e6fc4c9f5ba47aa5bbbd3dd836988f153aa8258e600',
			};
			return expect(
				createSignatureObject.bind(null, {
					transaction: mutatedTransaction,
					passphrase: account.passphrase,
					networkIdentifier,
				}),
			).to.throw('Invalid transaction.');
		});
	});

	describe('when valid transaction and invalid passphrase is used', () => {
		it('should throw an Error if passphrase is number', () => {
			const passphrase = 1;
			return expect(
				createSignatureObject.bind(null, {
					transaction,
					passphrase: (passphrase as unknown) as string,
					networkIdentifier,
				}),
			).to.throw(
				'Unsupported data format. Currently only Buffers or `hex` and `utf8` strings are supported.',
			);
		});
	});

	describe('when valid transaction and passphrase is used', () => {
		let signatureObject: SignatureObject;
		beforeEach(() => {
			signatureObject = createSignatureObject({
				transaction: transaction as TransactionJSON,
				passphrase: account.passphrase,
				networkIdentifier,
			});
			return Promise.resolve();
		});

		it('should have the same transaction id as the input', () => {
			return expect(signatureObject.transactionId).to.equal(transaction.id);
		});

		it('should have the corresponding public key with the passphrase', () => {
			return expect(signatureObject.publicKey).to.equal(account.publicKey);
		});

		it('should have non-empty hex string signature', () => {
			return expect(signatureObject.signature).to.equal(generatedSignature);
		});
	});
});
