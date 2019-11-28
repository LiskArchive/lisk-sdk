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
import { TransactionError, TransactionPendingError } from '../src/errors';

describe('errors', () => {
	describe('TransactionError', () => {
		let TxError: TransactionError;

		beforeEach(() => {
			TxError = new TransactionError(
				'error message',
				'transaction id',
				'.dataPath',
			);
		});

		describe('#constructor', () => {
			it('should create a new instance of TransactionError', () => {
				return expect(TxError).to.be.instanceof(TransactionError);
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

			it('should show provided actual property when present', () => {
				TxError = new TransactionError(
					'error message',
					'transaction id',
					'.dataPath',
					'actual property',
				);
				return expect(TxError.toString()).to.match(/actual: actual property/);
			});

			it('should show provided expected property when present', () => {
				TxError = new TransactionError(
					'error message',
					'transaction id',
					'.dataPath',
					'actual property',
					'expected property',
				);
				return expect(TxError.toString()).to.match(
					/expected: expected property/,
				);
			});
		});

		describe('#toString', () => {
			it('should return a string from a TransactionError', () => {
				return expect(TxError.toString())
					.to.be.eql(
						'Transaction: transaction id failed at .dataPath: error message',
					)
					.and.be.an('string');
			});
		});
	});

	describe('TransactionPendingError', () => {
		let TxPendingError: TransactionPendingError;

		beforeEach(() => {
			TxPendingError = new TransactionPendingError(
				'error message',
				'transaction id',
				'.aDataPath',
			);
		});

		describe('#toString', () => {
			it('should return a string from a TransactionPendingError', () => {
				return expect(TxPendingError.toString())
					.to.be.an('string')
					.to.be.eql(
						'Transaction: transaction id failed at .aDataPath: error message ',
					);
			});
		});
	});
});
