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
import { TransactionError } from '../src/errors';

describe('errors', () => {
	describe('TransactionError', () => {
		let TxError: TransactionError;

		beforeEach(() => {
			TxError = new TransactionError('error message', Buffer.from('transaction id'), '.dataPath');
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
				expect(TxError.id).toEqual(Buffer.from('transaction id'));
				return expect(TxError.id).toBeInstanceOf(Buffer);
			});

			it('should have a `dataPath` string', () => {
				expect(TxError.dataPath).toEqual('.dataPath');
				return expect(TxError.dataPath).toBeString();
			});

			it('should show provided actual property when present', () => {
				TxError = new TransactionError(
					'error message',
					Buffer.from('transaction id'),
					'.dataPath',
					'__ACTUAL_PROPERTY_1__',
				);
				return expect(TxError.toString()).toMatch(/actual: __ACTUAL_PROPERTY_1__/);
			});

			it('should show provided expected property when present', () => {
				TxError = new TransactionError(
					'error message',
					Buffer.from('transaction id'),
					'.dataPath',
					'actual_value_provided',
					'__EXPECTED_PROPERTY_1__',
				);
				return expect(TxError.toString()).toMatch(/expected: __EXPECTED_PROPERTY_1__/);
			});
		});

		describe('#toString', () => {
			it('should return a string from a TransactionError', () => {
				return expect(TxError.toString()).toInclude('failed at .dataPath: error message');
			});
		});
	});
});
