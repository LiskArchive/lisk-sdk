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

var lisk = require('lisk-js');

var phases = require('../common/phases');

var ws = require('../../common/ws/communication');
var randomUtil = require('../../common/utils/random');

function postTransaction (transaction, done) {
	ws.call('postTransactions', {
		transactions: [transaction]
	}, done, true);
}

describe('Posting transaction (type 0)', function () {

	var transaction;
	var goodTransactions = [];
	var badTransactions = [];
	var account = randomUtil.account();

	beforeEach(function () {
		transaction = randomUtil.transaction();
	});

	describe('transaction processing', function () {

		it('when sender has no funds should fail', function (done) {
			var transaction = lisk.transaction.createTransaction('1L', 1, account.password);

			postTransaction(transaction, function (err, res) {
				expect(res).to.have.property('success').to.be.not.ok;
				expect(res).to.have.property('message').to.equal('Account does not have enough LSK: ' + account.address + ' balance: 0');
				badTransactions.push(transaction);
				done();
			});
		});

		it('when sender has funds should be ok', function (done) {
			postTransaction(transaction, function (err, res) {
				expect(res).to.have.property('success').to.be.ok;
				expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
				done();
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
