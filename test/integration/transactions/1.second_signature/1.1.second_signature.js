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

var lisk = require('lisk-elements').default;
var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var localCommon = require('../../common');

const { NORMALIZER } = global.constants;

describe('system test (type 1) - double second signature registrations', () => {
	var library;

	var account = randomUtil.account();
	var transaction = lisk.transaction.transfer({
		amount: 1000 * NORMALIZER,
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account.address,
	});
	var transaction1;
	var transaction2;

	localCommon.beforeBlock('system_1_1_second_sign', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(library, [transaction], () => {
			done();
		});
	});

	it('adding to pool second signature registration should be ok', done => {
		transaction1 = lisk.transaction.registerSecondPassphrase({
			passphrase: account.passphrase,
			secondPassphrase: account.secondPassphrase,
			timeOffset: -10000,
		});
		localCommon.addTransaction(library, transaction1, (err, res) => {
			expect(res).to.equal(transaction1.id);
			done();
		});
	});

	it('adding to pool same second signature registration with different timestamp should be ok', done => {
		transaction2 = lisk.transaction.registerSecondPassphrase({
			passphrase: account.passphrase,
			secondPassphrase: account.secondPassphrase,
		});
		localCommon.addTransaction(library, transaction2, (err, res) => {
			expect(res).to.equal(transaction2.id);
			done();
		});
	});

	describe('after forging one block', () => {
		before(done => {
			localCommon.forge(library, () => {
				done();
			});
		});

		it('first transaction to arrive should not be included', done => {
			var filter = {
				id: transaction1.id,
			};
			localCommon.getTransactionFromModule(library, filter, (err, res) => {
				expect(err).to.be.null;
				expect(res)
					.to.have.property('transactions')
					.which.is.an('Array');
				expect(res.transactions.length).to.equal(0);
				done();
			});
		});

		it('last transaction to arrive should be included', done => {
			var filter = {
				id: transaction2.id,
			};
			localCommon.getTransactionFromModule(library, filter, (err, res) => {
				expect(err).to.be.null;
				expect(res)
					.to.have.property('transactions')
					.which.is.an('Array');
				expect(res.transactions.length).to.equal(1);
				expect(res.transactions[0].id).to.equal(transaction2.id);
				done();
			});
		});

		it('adding to pool second signature registration for same account should fail', done => {
			localCommon.addTransaction(library, transaction1, err => {
				expect(err).to.equal('Missing sender second signature');
				done();
			});
		});
	});
});
