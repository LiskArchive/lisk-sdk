'use strict';

var test = require('../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var phases = require('../../common/phases');
var Scenarios = require('../../common/scenarios');
var localCommon = require('./common');

var sendTransactionPromise = require('../../../common/helpers/api').sendTransactionPromise;

describe('POST /api/transactions (unconfirmed type 1 on top of type 4)', function () {

	var scenarios = {
		'regular': new Scenarios.Multisig(),
	};

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	localCommon.beforeValidationPhase(scenarios);

	describe('registering second password', function () {

		it('regular scenario should be ok', function () {
			transaction = lisk.signature.createSignature(scenarios.regular.account.password, scenarios.regular.account.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
