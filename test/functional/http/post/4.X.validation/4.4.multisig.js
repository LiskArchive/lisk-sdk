'use strict';

var test = require('../../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var phases = require('../../../common/phases');
var Scenarios = require('../../../common/scenarios');
var localCommon = require('./common');

var sendTransactionPromise = require('../../../../common/helpers/api').sendTransactionPromise;

describe('POST /api/transactions (validate type 4 on top of type 4)', function () {

	var scenarios = {
		'regular': new Scenarios.Multisig(),
	};

	var transaction, signature;
	var badTransactions = [];
	var goodTransactions = [];

	localCommon.beforeValidationPhase(scenarios);

	describe('registering multisig', function () {

		it('with an account already registered should fail', function () {
			transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Account already has multisignatures enabled');
				badTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
