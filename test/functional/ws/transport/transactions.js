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
 */

'use strict';

require('../../functional.js');
var lisk = require('lisk-js');
var ws = require('../../../common/ws/communication');
var randomUtil = require('../../../common/utils/random');
var normalizeTransactionObject = require('../../../common/helpers/api')
	.normalizeTransactionObject;

function postTransaction(transaction, cb) {
	transaction = normalizeTransactionObject(transaction);

	ws.call(
		'postTransactions',
		{
			transactions: [transaction],
		},
		cb,
		true
	);
}

describe('Posting transaction (type 0)', () => {
	var account;
	var transaction;
	var error;
	var response;

	beforeEach(() => {
		account = randomUtil.account();
		transaction = randomUtil.transaction();
	});

	describe('when sender has no funds for a transaction in batch', () => {
		beforeEach(done => {
			transaction = lisk.transaction.createTransaction(
				'1L',
				1,
				account.password
			);
			postTransaction(transaction, (err, res) => {
				error = err;
				response = res;
				done();
			});
		});

		// For peer-to-peer communiation, the peer does not need to send back
		// an error message if one of the transactions in the batch fails.
		// Either the peer acknowledges the receipt of the batch or their don't.
		it('operation should succeed', () => {
			expect(error).to.be.null;
			expect(response).to.have.property('success').to.be.ok;
		});
	});

	describe('when sender has funds for a transaction in batch', () => {
		beforeEach(done => {
			postTransaction(transaction, (err, res) => {
				error = err;
				response = res;
				done();
			});
		});

		it('operation should succeed', () => {
			expect(error).to.be.null;
			expect(response).to.have.property('success').to.be.ok;
		});
	});
});
