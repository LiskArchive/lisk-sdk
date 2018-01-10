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

var test = require('../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var phases = require('../../common/phases');
var localCommon = require('./common');
var accountFixtures = require('../../../fixtures/accounts');

var sendTransactionPromise = require('../../../common/helpers/api').sendTransactionPromise;

var randomUtil = require('../../../common/utils/random');
var errorCodes = require('../../../../helpers/apiCodes');

describe('POST /api/transactions (unconfirmed type 4 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];
	var pendingMultisignatures = [];

	var account = randomUtil.account();

	localCommon.beforeUnconfirmedPhase(account);

	describe('creating multisig', function () {

		it('using second signature with an account that has a pending second passphrase registration should fail', function () {
			transaction = lisk.multisignature.createMultisignature(account.password, account.secondPassword, ['+' + accountFixtures.existingDelegate.publicKey], 1, 1);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
				badTransactions.push(transaction);
			});
		});

		it('using no second signature with an account that has a pending second passphrase registration should be ok', function () {
			transaction = lisk.multisignature.createMultisignature(account.password, null, ['+' + accountFixtures.existingDelegate.publicKey], 1, 1);

			return sendTransactionPromise(transaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');
				pendingMultisignatures.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions, pendingMultisignatures);
	});
});
