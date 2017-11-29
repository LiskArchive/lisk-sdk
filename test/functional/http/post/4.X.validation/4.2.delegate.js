'use strict';

require('../../../functional.js');

var node = require('../../../../node');
var shared = require('../../../shared');
var localShared = require('./shared');

describe('POST /api/transactions (validate type 2 on top of type 4)', function () {

	var scenarios = {
		'regular': new shared.MultisigScenario(),
	};

	var transaction, signature;
	var badTransactions = [];
	var goodTransactions = [];

	localShared.beforeValidationPhase(scenarios);

	describe('registering delegate', function () {

		it('regular scenario should be ok', function () {
			return localShared.sendAndSignMultisigTransaction('delegate', scenarios.regular)
				.then(function (transaction) {
					goodTransactions.push(transaction);
				});
		});			
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
