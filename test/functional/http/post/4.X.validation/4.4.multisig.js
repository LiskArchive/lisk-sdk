'use strict';

var test = require('../../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var phases = require('../../../common/phases');
var Scenarios = require('../../../common/scenarios');
var localCommon = require('./common');
var errorCodes = require('../../../../../helpers/apiCodes');

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

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Account already has multisignatures enabled');
				badTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
