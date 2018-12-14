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
import { expect } from 'chai';
import { TransactionError } from '../../../src/errors';
import { verifySignature } from '../../../src/transactions/helpers';

describe('#verifySignature', () => {
	const defaultTransaction = {
		amount: '10000000000',
		recipientId: '13356260975429434553L',
		senderId: '',
		senderPublicKey:
			'bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8',
		timestamp: 80685381,
		type: 0,
		fee: '10000000',
		recipientPublicKey: '',
		asset: {},
		signature:
			'3357658f70b9bece24bd42769b984b3e7b9be0b2982f82e6eef7ffbd841598d5868acd45f8b1e2f8ab5ccc8c47a245fe9d8e3dc32fc311a13cc95cc851337e01',
		signSignature:
			'11f77b8596df14400f5dd5cf9ef9bd2a20f66a48863455a163cabc0c220ea235d8b98dec684bd86f62b312615e7f64b23d7b8699775e7c15dad0aef0abd4f503',
		id: '11638517642515821734',
		receivedAt: new Date(),
	};

	const defaultSecondPublicKey =
		'bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8';

	describe('given a valid signature', () => {
		it('should return an object with verfied = true', () => {
			const { verified } = verifySignature(
				defaultTransaction.senderPublicKey,
				defaultTransaction.signature,
				defaultTransaction,
			);
			return expect(verified).to.be.true;
		});
	});

	describe('given an invalid signature', () => {
		let invalidSignature = defaultTransaction.signature.replace('1', '0');

		it('should return an object with verified = false', () => {
			const { verified } = verifySignature(
				defaultTransaction.senderPublicKey,
				invalidSignature,
				defaultTransaction,
			);

			return expect(verified).to.be.false;
		});

		it('should return an object with transaction error', () => {
			const { error } = verifySignature(
				defaultTransaction.senderPublicKey,
				invalidSignature,
				defaultTransaction,
			);

			return expect(error).to.be.instanceof(TransactionError);
		});
	});

	describe('given a valid signSignature', () => {
		it('should return an object with verfied = true', () => {
			const { verified } = verifySignature(
				defaultSecondPublicKey,
				defaultTransaction.signSignature,
				defaultTransaction,
				true,
			);
			return expect(verified).to.be.true;
		});
	});

	describe('given an invalid signSignature', () => {
		let invalidSignature = defaultTransaction.signSignature.replace('1', '0');

		it('should return an object with verified = false', () => {
			const { verified } = verifySignature(
				defaultSecondPublicKey,
				invalidSignature,
				defaultTransaction,
				true,
			);

			return expect(verified).to.be.false;
		});

		it('should return an object with transaction error', () => {
			const { error } = verifySignature(
				defaultSecondPublicKey,
				invalidSignature,
				defaultTransaction,
				true,
			);

			return expect(error).to.be.instanceof(TransactionError);
		});
	});
});
