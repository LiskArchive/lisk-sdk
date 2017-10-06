'use strict';

var async = require('async');
var expect = require('chai').expect;
var sinon = require('sinon');

var node = require('../../node');

var jobsQueue = require('../../../helpers/jobsQueue');
var TransactionPool = require('../../../logic/transactionPool');
var TransactionLogic = require('../../../logic/transaction');
var TransferLogic = require('../../../logic/transfer');
var modulesLoader = require('../../common/modulesLoader');
var transactionTypes = require('../../../helpers/transactionTypes');

describe('txPool', function () {

	var txPool;
	var jobsQueueRegisterStub;

	before(function (done) {
		// Init transaction logic
		modulesLoader.initLogic(TransactionLogic, modulesLoader.scope, function (err, __trsLogic) {
			expect(err).to.not.exist;
			txPool = new TransactionPool(
				modulesLoader.scope.config.broadcasts.broadcastInterval,
				modulesLoader.scope.config.broadcasts.releaseLimit,
				__trsLogic,
				modulesLoader.scope.bus,
				modulesLoader.scope.logger
			);

			modulesLoader.initModules([
				{accounts: require('../../../modules/accounts')},
			], [
				{'transaction': require('../../../logic/transaction')},
				{'account': require('../../../logic/account')}
			], {}, function (err, __modules) {
				expect(err).to.not.exist;

				txPool.bind(
					__modules.accounts,
					null,
					__modules.loader
				);
				__trsLogic.attachAssetType(transactionTypes.SEND, new TransferLogic(modulesLoader.scope.logger, modulesLoader.scope.schema));
				done();
			});
		});
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
			txPool.receiveTransactions([{}], false, function (err, data) {
				expect(err).to.be.equal('Invalid public key');
				done();
			});
		});

		it('should return error when using invalid tx', function (done) {
			txPool.receiveTransactions([{ id: '123' }], false, function (err, data) {
				expect(err).to.exist;
				done();
			});
		});

		it.skip('should process tx if valid and insert tx into queue', function (done) {
			var account = node.randomAccount();
			const tx = node.lisk.transaction.createTransaction(account.address, 100000000000, node.gAccount.password);

			txPool.receiveTransactions([tx], false, function (err, data) {
				expect(err).to.not.exist;
				expect(txPool.transactionInPool(tx.id)).to.be.true;
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
