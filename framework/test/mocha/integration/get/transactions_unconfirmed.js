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

const async = require('async');
const { transfer } = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../fixtures/accounts');
const randomUtil = require('../../common/utils/random');
const localCommon = require('./../common');

const { NORMALIZER } = global.constants;

describe('integration test - get unconfirmed transactions', () => {
	const account1 = randomUtil.account();
	const account2 = randomUtil.account();
	const transaction1 = transfer({
		amount: (1100 * NORMALIZER).toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account1.address,
	});
	const transaction2 = transfer({
		amount: (1100 * NORMALIZER).toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account2.address,
	});

	let library;
	localCommon.beforeBlock('get_transactions_unconfirmed', lib => {
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
		const filter = {
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
			const filter = {
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
			const filter = {
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
