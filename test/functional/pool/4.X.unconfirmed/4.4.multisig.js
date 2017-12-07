'use strict';

var test = require('../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var phases = require('../../common/phases');
var Scenarios = require('../../common/scenarios');
var localCommon = require('./common');

var sendTransactionPromise = require('../../../common/helpers/api').sendTransactionPromise;

describe('POST /api/transactions (unconfirmed type 4 on top of type 4)', function () {

	var scenarios = {
		'regular': new Scenarios.Multisig(),
	};

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	localCommon.beforeValidationPhase(scenarios);

	describe('registering multisignature', function () {

		it('duplicate submission should be ok and only first transaction to arrive should be confirmed', function () {
			transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, 1, 1);

			return sendTransactionPromise(transaction).then(function (res) {

				res.body.data.message.should.be.equal('Transaction(s) accepted');
				badTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
