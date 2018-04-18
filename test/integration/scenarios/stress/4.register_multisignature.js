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
var lisk = require('lisk-js').default;
var accountFixtures = require('../../../fixtures/accounts');
var constants = require('../../../../helpers/constants');
var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/wait_for');
var createSignatureObject = require('../../../common/helpers/api')
	.createSignatureObject;
var sendSignaturePromise = require('../../../common/helpers/api')
	.sendSignaturePromise;
var sendTransactionPromise = require('../../../common/helpers/api')
	.sendTransactionPromise;
var getTransaction = require('../../utils/http').getTransaction;

module.exports = function(params) {
	describe('stress test for type 4 transactions @slow', () => {
		var transactions = [];
		var accounts = [];
		var maximum = 1000;

		function confirmTransactionsOnAllNodes() {
			return Promise.all(
				_.flatMap(params.configurations, configuration => {
					return transactions.map(transaction => {
						return getTransaction(transaction.id, configuration.httpPort);
					});
				})
			).then(results => {
				results.forEach(transaction => {
					expect(transaction)
						.to.have.property('id')
						.that.is.an('string');
				});
			});
		}

		describe('prepare accounts', () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(maximum).map(() => {
						var tmpAccount = randomUtil.account();
						var transaction = lisk.transaction.transfer({
							amount: 2500000000,
							passphrase: accountFixtures.genesis.password,
							recipientId: tmpAccount.address,
						});
						accounts.push(tmpAccount);
						transactions.push(transaction);
						return sendTransactionPromise(transaction);
					})
				);
			});

			it('should confirm all transactions on all nodes', done => {
				var blocksToWait =
					Math.ceil(maximum / constants.maxTransactionsPerBlock) + 2;
				waitFor.blocks(blocksToWait, () => {
					confirmTransactionsOnAllNodes().then(done);
				});
			});
		});

		describe('sending multisignature registrations', () => {
			var signatures = [];
			var agreements = [];
			var numbers = _.range(maximum);
			var i = 0;
			var j = 0;

			before(() => {
				transactions = [];
				return Promise.all(
					numbers.map(num => {
						i = (num + 1) % numbers.length;
						j = (num + 2) % numbers.length;
						var transaction = lisk.transaction.registerMultisignature({
							keysgroup: [accounts[i].publicKey, accounts[j].publicKey],
							lifetime: 24,
							minimum: 1,
							passphrase: accounts[num].password,
						});
						transactions.push(transaction);
						agreements = [
							createSignatureObject(transaction, accounts[i]),
							createSignatureObject(transaction, accounts[j]),
						];
						signatures.push(agreements);
						return sendTransactionPromise(transaction).then(res => {
							expect(res.statusCode).to.be.eql(200);
							return sendSignaturePromise(signatures[num][0])
								.then(res => {
									expect(res.statusCode).to.be.eql(200);
									return sendSignaturePromise(signatures[num][1]);
								})
								.then(res => {
									expect(res.statusCode).to.be.eql(200);
								});
						});
					})
				);
			});

			it('should confirm all transactions on all nodes', done => {
				var blocksToWait =
					Math.ceil(maximum / constants.maxTransactionsPerBlock) + 2;
				waitFor.blocks(blocksToWait, () => {
					confirmTransactionsOnAllNodes().then(done);
				});
			});
		});
	});
};
