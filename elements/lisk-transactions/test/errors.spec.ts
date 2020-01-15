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
				return expect(TxError).toBeInstanceOf(TransactionError);
			});

			it('should have a `message` string', () => {
				expect(TxError.message).toEqual('error message');
				return expect(TxError.message).toBeString();
			});

			it('should have a `id` string', () => {
				expect(TxError.id).toEqual('transaction id');
				return expect(TxError.id).toBeString();
			});

			it('should have a `dataPath` string', () => {
				expect(TxError.dataPath).toEqual('.dataPath');
				return expect(TxError.dataPath).toBeString();
			});

			it('should show provided actual property when present', () => {
				TxError = new TransactionError(
					'error message',
					'transaction id',
					'.dataPath',
					'__ACTUAL_PROPERTY_1__',
				);
				return expect(TxError.toString()).toMatch(
					/actual: __ACTUAL_PROPERTY_1__/,
				);
			});

			it('should show provided expected property when present', () => {
				TxError = new TransactionError(
					'error message',
					'transaction id',
					'.dataPath',
					'actual_value_provided',
					'__EXPECTED_PROPERTY_1__',
				);
				return expect(TxError.toString()).toMatch(
					/expected: __EXPECTED_PROPERTY_1__/,
				);
			});
		});

		describe('#toString', () => {
			it('should return a string from a TransactionError', () => {
				return expect(TxError.toString()).toEqual(
					'Transaction: transaction id failed at .dataPath: error message',
				);
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
				return expect(TxPendingError.toString()).toEqual(
					'Transaction: transaction id failed at .aDataPath: error message ',
				);
			});
		});
	});
});
