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

var Promise = require('bluebird');

var test = require('../functional.js');
var apiHelpers = require('../../common/helpers/api');
var waitFor = require('../../common/utils/waitFor');

function confirmation (goodTransactions, badTransactions, pendingMultisignatures) {

	describe('after transactions get confirmed', function () {

		before(function () {
			return waitFor.confirmations(test._.map(goodTransactions, 'id'));
		});

		it('bad transactions should not be confirmed', function () {
			return Promise.map(badTransactions, function (transaction) {
				var params = [
					'id=' + transaction.id
				];
				return apiHelpers.getTransactionsPromise(params).then(function (res) {
					res.body.data.should.have.length(0);
				});
			});
		});

		it('good transactions should not be unconfirmed', function () {
			return Promise.map(goodTransactions, function (transaction) {
				return apiHelpers.getUnconfirmedTransactionPromise(transaction.id).then(function (res) {
					res.body.data.should.be.empty;
				});
			});
		});

		it('good transactions should be confirmed', function () {
			return Promise.map(goodTransactions, function (transaction) {
				var params = [
					'id=' + transaction.id
				];
				return apiHelpers.getTransactionsPromise(params).then(function (res) {
					res.body.data.should.have.length(1);
				});
			});
		});

		if (pendingMultisignatures) {
			it('pendingMultisignatures should remain in the pending queue', function () {
				return Promise.map(pendingMultisignatures, function (transaction) {
					var params = [
						'id=' + transaction.id
					];

					return apiHelpers.getPendingMultisignaturesPromise(params).then(function (res) {
						res.body.data.should.have.length(1);
						res.body.data[0].id.should.be.equal(transaction.id);
					});
				});
			});

			it('pendingMultisignatures should not be confirmed', function () {
				return Promise.map(pendingMultisignatures, function (transaction) {
					var params = [
						'id=' + transaction.id
					];
					return apiHelpers.getTransactionsPromise(params).then(function (res) {
						res.body.data.should.have.length(0);
					});
				});
			});
		};
	});
};

module.exports = {
	confirmation: confirmation
};
