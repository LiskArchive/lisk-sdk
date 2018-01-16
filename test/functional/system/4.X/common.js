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
var Promise = require('bluebird');
var phases = require('../../common/phases');
var accountFixtures = require('../../../fixtures/accounts');

var apiHelpers = require('../../../common/helpers/api');
var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');
var waitFor = require('../../../common/utils/waitFor');

function beforeValidationPhase (scenarios) {
	var transactionsToWaitFor = [];

	before(function () {
		return Promise.all(Object.keys(scenarios).map(function (type) {
			if (type === 'no_funds') {
				return;
			}

			var transaction = lisk.transaction.createTransaction(scenarios[type].account.address, scenarios[type].amount, accountFixtures.genesis.password);
			transactionsToWaitFor.push(transaction.id);

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');
			});
		}))
			.then(function () {
				return waitFor.confirmations(transactionsToWaitFor);
			})
			.then(function () {
				return Promise.all(Object.keys(scenarios).map(function (type) {
					var transaction = lisk.multisignature.createMultisignature(scenarios[type].account.password, null, scenarios[type].keysgroup, scenarios[type].lifetime, scenarios[type].min);
					scenarios[type].transaction = transaction;
					transactionsToWaitFor.push(transaction.id);

					return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
						res.body.data.message.should.be.equal('Transaction(s) accepted');
					});
				}));
			});
	});
};

function beforeValidationPhaseWithDapp (scenarios) {
	var transactionsToWaitFor = [];

	before(function () {
		return Promise.all(Object.keys(scenarios).map(function (type) {
			if (type === 'no_funds') {
				return;
			}

			var transaction = lisk.transaction.createTransaction(scenarios[type].account.address, scenarios[type].amount, accountFixtures.genesis.password);
			transactionsToWaitFor.push(transaction.id);

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');
			});
		}))
			.then(function () {
				return waitFor.confirmations(transactionsToWaitFor);
			})
			.then(function () {
				return Promise.all(Object.keys(scenarios).map(function (type) {
					scenarios[type].dapp = randomUtil.application();
					var transaction = lisk.dapp.createDapp(scenarios[type].account.password, null, scenarios[type].dapp);
					scenarios[type].dapp.id = transaction.id;
					transactionsToWaitFor.push(transaction.id);

					return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
						res.body.data.message.should.be.equal('Transaction(s) accepted');
					});
				}));
			})
			.then(function () {
				return waitFor.confirmations(transactionsToWaitFor);
			})
			.then(function () {
				return Promise.all(Object.keys(scenarios).map(function (type) {
					var transaction = lisk.multisignature.createMultisignature(scenarios[type].account.password, null, scenarios[type].keysgroup, scenarios[type].lifetime, scenarios[type].min);
					scenarios[type].transaction = transaction;
					transactionsToWaitFor.push(transaction.id);

					return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
						res.body.data.message.should.be.equal('Transaction(s) accepted');
					});
				}));
			});
	});
};

module.exports = {
	beforeValidationPhase: beforeValidationPhase,
	beforeValidationPhaseWithDapp: beforeValidationPhaseWithDapp
};
