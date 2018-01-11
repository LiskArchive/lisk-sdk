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

var test = require('../../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var phases = require('../../../common/phases');
var Scenarios = require('../../../common/scenarios');
var localCommon = require('./common');

var constants = require('../../../../../helpers/constants');

var apiHelpers = require('../../../../common/helpers/api');
var randomUtil = require('../../../../common/utils/random');

var swaggerEndpoint = require('../../../../common/swaggerSpec');
var signatureEndpoint = new swaggerEndpoint('POST /signatures');
var errorCodes = require('../../../../../helpers/apiCodes');

describe('POST /api/transactions (validate type 0 on top of type 4)', function () {

	var scenarios = {
		'without_signatures': new Scenarios.Multisig(
			{
				'members': 4
			}
		),
		'minimum_not_reached': new Scenarios.Multisig(
			{
				'members': 4
			}
		),
		'max_members_max_min': new Scenarios.Multisig(
			{
				'members': constants.multisigConstraints.keysgroup.maxItems + 1,
				'min': constants.multisigConstraints.min.maximum
			}
		),
		'regular': new Scenarios.Multisig(),
	};

	var transaction, signature;
	var badTransactions = [];
	var goodTransactions = [];
	var pendingMultisignatures = [];

	localCommon.beforeValidationPhase(scenarios);

	describe('sending funds', function () {

		it('without_signatures scenario should be ok and never confirmed', function () {
			transaction = lisk.transaction.createTransaction(randomUtil.account().address, 1, scenarios.without_signatures.account.password);

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');
				pendingMultisignatures.push(transaction);
			});
		});

		it('minimum_not_reached scenario should be ok and never confirmed without minimum required signatures', function () {
			transaction = lisk.transaction.createTransaction(randomUtil.account().address, 1, scenarios.minimum_not_reached.account.password);

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');
				scenarios.minimum_not_reached.transaction = transaction;
				pendingMultisignatures.push(transaction);
			})
				.then(function () {
					signature = apiHelpers.createSignatureObject(scenarios.minimum_not_reached.transaction, scenarios.minimum_not_reached.members[0]);

					return signatureEndpoint.makeRequest({signatures: [signature]}, 200).then(function (res) {
						res.body.meta.status.should.be.true;
						res.body.data.message.should.be.equal('Signature Accepted');
					});
				});
		});

		it('regular scenario should be ok', function () {
			return localCommon.sendAndSignMultisigTransaction('transfer', scenarios.regular)
				.then(function (transaction) {
					goodTransactions.push(transaction);
				});
		});

		it('max_members_max_min scenario should be ok', function () {
			return localCommon.sendAndSignMultisigTransaction('transfer', scenarios.max_members_max_min)
				.then(function (transaction) {
					goodTransactions.push(transaction);
				});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions, pendingMultisignatures);
	});
});
