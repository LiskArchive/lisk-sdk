'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

var node = require('../../node');

var application = require('../../common/application');
var jobsQueue = require('../../../helpers/jobsQueue');
var TransactionPool = require('../../../logic/transactionPool');
var modulesLoader = require('../../common/modulesLoader');

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
			var account = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction(account.address, 100000000000, node.gAccount.password);

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
