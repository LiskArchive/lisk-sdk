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
 */

'use strict';

describe('processTransactions', () => {
	describe('credit account', () => {
		describe('process transactions', () => {
			describe('checkAllowedTransactions', () => {
				it.todo(
					'should return transactionsResponses with status OK for allowed transactions',
				);

				it.todo(
					"should return transactionsResponses with status OK for transactions that don't implement matcher",
				);

				it.todo(
					'should return transactionsResponses with status FAIL for not allowed transactions',
				);
			});

			describe('verifyTransactions', () => {
				it.todo(
					'should return transactionsResponses with status OK for verified transactions',
				);

				it.todo(
					'should return transactionsResponses with status FAIL for unverifiable transaction',
				);

				it.todo(
					'should return transactionsResponses with status PENDING for transactions waiting multi-signatures',
				);
			});

			describe('undoTransactions', () => {
				it.todo('should return stateStore');

				it.todo(
					'should return transactionsResponses with status OK for verified transactions',
				);

				it.todo(
					'should return transactionsResponses with status FAIL for unverifiable transaction',
				);
			});

			describe('applyTransactions', () => {
				it.todo('should return stateStore');

				it.todo(
					'should return transactionsResponses with status OK for verified transactions',
				);

				it.todo(
					'should return transactionsResponses with status FAIL for unverifiable transaction',
				);

				it.todo(
					'should return transactionsResponses with status PENDING for transactions waiting multi-signatures',
				);
			});
		});
	});
});
