/*
 * Copyright © 2018 Lisk Foundation
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
import createSignatureObject from '../src/create_signature_object';

describe('#createSignatureObject', () => {
	const transaction = {
		amount: '10',
		recipientId: '8050281191221330746L',
		senderPublicKey:
			'3358a1562f9babd523a768e700bb12ad58f230f84031055802dc0ea58cef1e1b',
		timestamp: 59353522,
		type: 0,
		fee: '10000000',
		recipientPublicKey: null,
		asset: {},
		signature:
			'b84b95087c381ad25b5701096e2d9366ffd04037dcc941cd0747bfb0cf93111834a6c662f149018be4587e6fc4c9f5ba47aa5bbbd3dd836988f153aa8258e604',
		id: '3694188453012384790',
	};
	const account = {
		passphrase:
			'love road panic horn cover grape nerve mechanic slice relax mobile salon',
		publicKey:
			'87696cfc48f5f5bd4ec2473615ac1618ffedfdc20005ae71a3d0dba209471c04',
	};
	const generatedSignature =
		'8222dc7c26cc0ed649af71ebef5d292deb6ad029dadec0cf061b40e2ea9572d1b691e92302ac8cb64e5ea5f8fd846410c8fa033236c8930203ae3b7f3c6bd30c';

	describe('when invalid transaction is used', () => {
		it('should throw an Error when sender public key is mutated', () => {
			const mutatedTransaction = Object.assign({}, transaction, {
				senderPublicKey:
					'3358a1562f9babd523a768e700bb12ad58f230f84031055802dc0ea58cef1000',
			});
			return expect(
				createSignatureObject.bind(
					null,
					mutatedTransaction,
					account.passphrase,
				),
			).to.throw('Invalid transaction.');
		});

		it('should throw an Error when signature is mutated', () => {
			const mutatedTransaction = Object.assign({}, transaction, {
				signature:
					'b84b95087c381ad25b5701096e2d9366ffd04037dcc941cd0747bfb0cf93111834a6c662f149018be4587e6fc4c9f5ba47aa5bbbd3dd836988f153aa8258e600',
			});
			return expect(
				createSignatureObject.bind(
					null,
					mutatedTransaction,
					account.passphrase,
				),
			).to.throw('Invalid transaction.');
		});
	});

	describe('when valid transaction and invalid passphrase is used', () => {
		it('should throw an Error if passphrase is number', () => {
			const passphrase = 1;
			return expect(
				createSignatureObject.bind(null, transaction, passphrase),
			).to.throw(
				'Unsupported data format. Currently only Buffers or `hex` and `utf8` strings are supported.',
			);
		});
	});

	describe('when valid transaction and passphrase is used', () => {
		let signatureObject;
		beforeEach(() => {
			signatureObject = createSignatureObject(transaction, account.passphrase);
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
