'use strict';

var test = require('../../../functional.js');

var phases = require('../../../common/phases');
var Scenarios = require('../../../common/scenarios');
var localCommon = require('./common');

describe('POST /api/transactions (validate type 7 on top of type 4)', function () {

	var scenarios = {
		'regular': new Scenarios.Multisig(),
	};

	var transaction, signature;
	var badTransactions = [];
	var goodTransactions = [];

	localCommon.beforeValidationPhase(scenarios);

	describe('registering dapp', function () {

		it('regular scenario should be ok', function () {
			return localCommon.sendAndSignMultisigTransaction('dapp', scenarios.regular)
				.then(function (transaction) {
					goodTransactions.push(transaction);
				});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});

	describe('sending outTransfer', function () {

		it('regular scenario should be ok', function () {
			return localCommon.sendAndSignMultisigTransaction('outTransfer', scenarios.regular)
				.then(function (transaction) {
					goodTransactions.push(transaction);
				});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
