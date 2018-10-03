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

var async = require('async');
var lisk = require('lisk-elements').default;
var accountFixtures = require('../../fixtures/accounts');
var randomUtil = require('../../common/utils/random');
var localCommon = require('./../common');

const { NORMALIZER } = global.constants;

describe('system test - get unconfirmed transactions', () => {
	var account1 = randomUtil.account();
	var account2 = randomUtil.account();
	var transaction1 = lisk.transaction.transfer({
		amount: 1100 * NORMALIZER,
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account1.address,
	});
	var transaction2 = lisk.transaction.transfer({
		amount: 1100 * NORMALIZER,
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account2.address,
	});

	var library;
	localCommon.beforeBlock('system_get_transactions_unconfirmed', lib => {
		library = lib;
	});

	before(done => {
		async.waterfall(
			[
				function(seriesCb) {
					localCommon.addTransaction(library, transaction1, (err, res) => {
						expect(res).to.equal(transaction1.id);
						seriesCb();
					});
				},
				function(seriesCb) {
					localCommon.addTransaction(library, transaction2, (err, res) => {
						expect(res).to.equal(transaction2.id);
						seriesCb();
					});
				},
				function(seriesCb) {
					localCommon.fillPool(library, seriesCb);
				},
			],
			err => {
				done(err);
			}
		);
	});

	it('using no params should be ok', done => {
		var filter = {
			offset: 0,
			limit: 10,
		};
		localCommon.getUnconfirmedTransactionFromModule(
			library,
			filter,
			(err, res) => {
				expect(err).to.be.null;
				expect(res)
					.to.have.property('transactions')
					.which.is.an('Array');
				expect(res.transactions.length).to.equal(2);
				expect(res.transactions[0].id).to.equal(transaction1.id);
				expect(res.transactions[1].id).to.equal(transaction2.id);
				expect(res.count).to.equal(2);
				done();
			}
		);
	});

	describe('id', () => {
		it('using valid but unknown id should be ok', done => {
			var filter = {
				id: '79fjdfd',
				offset: 0,
				limit: 10,
			};
			localCommon.getUnconfirmedTransactionFromModule(
				library,
				filter,
				(err, res) => {
					expect(err).to.be.null;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('Array');
					expect(res.transactions.length).to.equal(0);
					expect(res.count).to.equal(2);
					done();
				}
			);
		});

		it('using known id should be ok', done => {
			var filter = {
				id: transaction1.id,
				offset: 0,
				limit: 10,
			};
			localCommon.getUnconfirmedTransactionFromModule(
				library,
				filter,
				(err, res) => {
					expect(err).to.be.null;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('Array');
					expect(res.transactions.length).to.equal(1);
					expect(res.transactions[0].id).to.equal(transaction1.id);
					expect(res.count).to.equal(2);
					done();
				}
			);
		});
	});
});
