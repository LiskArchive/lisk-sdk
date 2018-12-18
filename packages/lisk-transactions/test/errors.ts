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
import { VError } from 'verror';
import { TransactionError, TransactionMultiError } from '../src/errors';

describe('TransactionError', () => {
	let TxError: TransactionError;

	describe('#constructor', () => {
		beforeEach(() => {
			TxError = new TransactionError(
				'error message',
				'transaction id',
				'.dataPath',
			);
		});

		it('should create a new instance of TransactionError', () => {
			return expect(TxError)
				.to.be.an('object')
				.and.be.instanceof(TransactionError)
				.and.be.instanceof(VError);
		});

		it('should have a `message` string', () => {
			expect(TxError.message).to.eql('error message');
			return expect(TxError)
				.to.have.property('message')
				.and.be.a('string');
		});

		it('should have a `id` string', () => {
			expect(TxError.id).to.eql('transaction id');
			return expect(TxError)
				.to.have.property('id')
				.and.be.a('string');
		});

		it('should have a `dataPath` string', () => {
			expect(TxError.dataPath).to.eql('.dataPath');
			return expect(TxError)
				.to.have.property('dataPath')
				.and.be.a('string');
		});
	});
});

describe('TransactionMultiError', () => {
	let TxMultiError: TransactionMultiError;

	describe('#constructor', () => {
		beforeEach(() => {
			TxMultiError = new TransactionMultiError(
				'Invalid field types',
				'transaction id',
				[
					new TransactionError(
						'Invalid `senderPublicKey`',
						'transaction id',
						'.senderPublicKey',
					),
					new TransactionError(
						'`senderId` does not match `senderPublicKey`',
						'transaction id',
						'.senderId',
					),
					new TransactionError(
						'Invalid transaction id',
						'transaction id',
						'.id',
					),
				],
			);
		});

		it('should create a new instance of TransactionMultiError', () => {
			return expect(TxMultiError)
				.to.be.an('object')
				.and.be.instanceof(TransactionMultiError)
				.and.be.instanceof(VError);
		});

		it('should have a `message` string', () => {
			expect(TxMultiError.message).to.eql('Invalid field types');
			return expect(TxMultiError)
				.to.have.property('message')
				.and.be.a('string');
		});

		it('should have a `id` string', () => {
			expect(TxMultiError.id).to.eql('transaction id');
			return expect(TxMultiError)
				.to.have.property('id')
				.and.be.a('string');
		});

		it('should have a `dataPath` string', () => {
			expect(TxMultiError.dataPath).to.eql('.senderPublicKey:.senderId:.id');
			return expect(TxMultiError)
				.to.have.property('dataPath')
				.and.be.a('string');
		});

		it('should have an array of transaction errors', () => {
			expect(TxMultiError.errors).to.be.an('array');
			const errorArray = TxMultiError.errors as ReadonlyArray<TransactionError>;

			return expect(errorArray[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property('message', 'Invalid `senderPublicKey`');
		});
	});
});
