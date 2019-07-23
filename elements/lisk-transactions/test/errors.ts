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
import { TransactionError } from '../src/errors';

describe('errors', () => {
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
		});
	});
});
