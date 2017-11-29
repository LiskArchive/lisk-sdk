'use strict';

require('../../functional.js');

var node = require('../../../node');
var shared = require('../../shared');
var localShared = require('./shared');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;

describe('POST /api/transactions (unconfirmed type 1 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	var account = node.randomAccount();

	localShared.beforeUnconfirmedPhase(account);

	describe('registering second secret', function () {

		it('duplicate submission should be ok and only last transaction to arrive should be confirmed', function () {
			transaction = node.lisk.signature.createSignature(account.password, 'secondpassword');

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				// TODO: Enable when transaction pool order is fixed
				// goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
