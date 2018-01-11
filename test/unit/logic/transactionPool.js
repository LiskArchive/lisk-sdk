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

var accountFixtures = require('../../fixtures/accounts');

var application = require('../../common/application');
var randomUtil = require('../../common/utils/random');
var modulesLoader = require('../../common/modulesLoader');

var jobsQueue = require('../../../helpers/jobsQueue');
var TransactionPool = require('../../../logic/transactionPool');

describe('txPool', function () {

	var txPool;
	var jobsQueueRegisterStub;

	before(function (done) {
		application.init({sandbox: {name: 'lisk_test_logic_transactionPool'}}, function (err, scope) {
			// Init transaction logic
			txPool = scope.rewiredModules.transactions.__get__('__private.transactionPool');
			done();
		});
	});

	after(function (done) {
		application.cleanup(done);
	});

	beforeEach(function () {
		jobsQueueRegisterStub = sinon.stub(jobsQueue, 'register');
	});

	afterEach(function () {
		jobsQueueRegisterStub.restore();
	});

	describe('receiveTransactions', function () {

		it('should return empty array when using empty array', function (done) {
			txPool.receiveTransactions([], false, function (err, data) {
				expect(err).to.not.exist;
				expect(data).to.be.an('array').that.is.empty;
				done();
			});
		});

		it('should return error when using empty object', function (done) {
			txPool.receiveTransactions([{}], false, function (err) {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it('should return error when using invalid transaction', function (done) {
			txPool.receiveTransactions([{ id: '123' }], false, function (err) {
				expect(err).to.exist;
				done();
			});
		});

		it('should process transaction if valid and insert transaction into queue', function (done) {
			var account = randomUtil.account();
			var transaction = lisk.transaction.createTransaction(account.address, 100000000000, accountFixtures.genesis.password);

			txPool.receiveTransactions([transaction], false, function (err) {
				expect(err).to.not.exist;
				expect(txPool.transactionInPool(transaction.id)).to.be.true;
				done();
			});
		});
	});

	describe('transactionInPool', function () {

		it('should return false for an unknown id', function () {
			expect(txPool.transactionInPool('11111')).to.be.false;
		});
	});
});
