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

var accountFixtures = require('../../../../fixtures/accounts');
var apiHelpers = require('../../../../common/helpers/api');
var waitFor = require('../../../../common/utils/waitFor');
var normalizer = require('../../../../common/utils/normalizer');

function beforeValidationPhase (account) {

	before(function () {
		var transaction = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);

		return apiHelpers.sendTransactionPromise(transaction)
			.then(function (res) {
				res.should.have.property('status').to.equal(200);
				res.should.have.nested.property('body.data.message').that.is.equal('Transaction(s) accepted');

				return waitFor.confirmations([transaction.id]);
			})
			.then(function () {
				transaction = lisk.signature.createSignature(account.password, account.secondPassword);

				return apiHelpers.sendTransactionPromise(transaction);
			})
			.then(function (res) {
				res.should.have.property('status').to.equal(200);
				res.should.have.nested.property('body.data.message').to.equal('Transaction(s) accepted');

				return waitFor.confirmations([transaction.id]);
			});
	});
};

module.exports = {
	beforeValidationPhase: beforeValidationPhase
};
