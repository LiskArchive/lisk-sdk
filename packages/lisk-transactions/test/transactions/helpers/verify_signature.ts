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
		id: '5374209778555788325',
		type: 0,
		timestamp: 2346273,
		senderPublicKey:
			'b3eae984ec05ea3b4d4564fa1f195d67d14fe56a1a0d038c2c34780e0c0f9a09',
		senderId: '1977368676922172803L',
		recipientId: '7675634738153324567L',
		recipientPublicKey: '',
		amount: '1',
		fee: '10000000',
		signature:
			'bc42403a1a29bcd786839c13d8f84e39d30ff486e032b755bcd1cf9a74c9ef1817ab94f5eccbc61959daf2b2f23721edc1848ee707f9d74dbf2f6f38fe1ada0a',
		signatures: [],
		asset: {},
		receivedAt: new Date(),
	};

	describe('given a valid signature', () => {
		beforeEach(() => {
			return Promise.resolve();
		});

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
});
