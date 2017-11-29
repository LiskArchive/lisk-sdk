'use strict';

require('../../functional.js');

var node = require('../../../node');
var shared = require('../../shared');
var localShared = require('./shared');
var accountFixtures = require('../../../fixtures/accounts');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;

describe('POST /api/transactions (unconfirmed type 3 on top of type 4)', function () {

	var scenarios = {
		'regular': new shared.MultisigScenario(),
	};

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	localShared.beforeValidationPhase(scenarios);

	describe('voting delegate', function () {

		it('regular scenario should be ok', function () {
			transaction = node.lisk.vote.createVote(scenarios.regular.account.password, ['+' + accountFixtures.existingDelegate.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});