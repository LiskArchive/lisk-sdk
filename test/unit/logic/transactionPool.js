'use strict';

// Init tests dependencies
var _ = require('lodash');
var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');

// Load config file - global (one from test directory)
var config = require('../../../config.json');

// Instantiate test subject
var TransactionPool = rewire('../../../logic/transactionPool.js');

describe('transactionPool', function () {
	var transactionPool;
	var freshListState = {transactions: [], index: {}};
	var dummyProcessVerifyTransaction;
	var dummyApplyUnconfirmed;

	// Init fake logger
	var logger = {
		trace: sinon.spy(),
		debug: sinon.spy(),
		info:  sinon.spy(),
		log:   sinon.spy(),
		warn:  sinon.spy(),
		error: sinon.spy()
	};

	var resetStates = function () {
		transactionPool.unconfirmed = _.cloneDeep(freshListState);
		transactionPool.bundled = _.cloneDeep(freshListState);
		transactionPool.queued = _.cloneDeep(freshListState);
		transactionPool.multisignature = _.cloneDeep(freshListState);
		logger.trace.reset();
		logger.debug.reset();
		logger.info.reset();
		logger.log.reset();
		logger.warn.reset();
		logger.error.reset();

		dummyProcessVerifyTransaction = sinon.spy(function (transaction, broadcast, cb) { return cb(); });
		TransactionPool.__set__('__private.processVerifyTransaction', dummyProcessVerifyTransaction);
		dummyApplyUnconfirmed = sinon.spy(function (transaction, sender, cb) { return cb(); });
		TransactionPool.__set__('modules.transactions.applyUnconfirmed', dummyApplyUnconfirmed);
	}

	before(function () {
		// Init test subject
		transactionPool = new TransactionPool(
			config.broadcasts.broadcastInterval,
			config.broadcasts.releaseLimit,
			sinon.spy(), // transaction
			sinon.spy(), // bus
			logger  // logger
		);

		// Bind fake modules
		transactionPool.bind(
			sinon.spy(), // accounts
			sinon.spy(), // transactions
			sinon.spy()  // loader
		);
	});

	describe('initialize', function () {

		describe('lists', function () {

			it('unconfirmed should be initialized', function () {
				expect(transactionPool.unconfirmed).to.deep.equal(freshListState);
			});

			it('bundled should be initialized', function () {
				expect(transactionPool.bundled).to.deep.equal(freshListState);
			});

			it('queued should be initialized', function () {
				expect(transactionPool.queued).to.deep.equal(freshListState);
			});

			it('multisignature should be initialized', function () {
				expect(transactionPool.multisignature).to.deep.equal(freshListState);
			});
		});

		after(resetStates);
	});

	describe('__private', function () {

		describe('applyUnconfirmedList', function () {
			var applyUnconfirmed;
			var lastError;

			before(function () {
				applyUnconfirmed = TransactionPool.__get__('__private.applyUnconfirmedList');
			});

			describe('called with array', function () {

				describe('that is empty', function () {

					before(function (done) {
						applyUnconfirmed([], function (err) {
							lastError = err;
							done();
						});
					});

					it('should not return an error', function () {
						expect(lastError).to.not.exist;
					});

					it('should not log an error', function () {
						expect(logger.error.called).to.be.false;
					});

					describe('__private.processVerifyTransaction', function() {

						it('should not be called', function () {
							expect(dummyProcessVerifyTransaction.called).to.be.false;
						});
					});

					describe('modules.transactions.applyUnconfirmed', function() {

						it('should not be called', function () {
							expect(dummyApplyUnconfirmed.called).to.be.false;
						});
					});

					after(resetStates);
				});

				describe('that contains 1 transaction', function () {

					describe('that is valid', function () {
						var validTransaction = {id: 'validTx'};

						before(function (done) {
							applyUnconfirmed([validTransaction], function (err) {
								lastError = err;
								done();
							});
						});

						it('should not return an error', function () {
							expect(lastError).to.not.exist;
						});

						it('should not log an error', function () {
							expect(logger.error.called).to.be.false;
						});

						describe('__private.processVerifyTransaction', function() {

							it('should be called once', function () {
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', function () {
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(validTransaction);
							});
						});

						describe('modules.transactions.applyUnconfirmed', function() {

							it('should be called once', function () {
								expect(dummyApplyUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', function () {
								expect(dummyApplyUnconfirmed.args[0][0]).to.deep.equal(validTransaction);
							});
						});

						describe('lists', function () {
							var index;

							describe('unconfirmed', function () {

								it('index should be set', function () {
									index = transactionPool.unconfirmed.index[validTransaction.id];
									expect(index).to.be.an('number');
								});

								it('transaction at index should match', function () {
									expect(transactionPool.unconfirmed.transactions[index]).to.deep.equal(validTransaction);
								});
							});

							describe('queued', function () {

								it('index should be undefined', function () {
									index = transactionPool.queued.index[validTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', function () {

								it('index should be undefined', function () {
									index = transactionPool.multisignature.index[validTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});
						})

						after(resetStates);
					});

					describe('that results with error on processVerifyTransaction', function () {
						var badTransaction = {id: 'badTx'};
						var error = 'verify error';

						before(function (done) {
							dummyProcessVerifyTransaction = sinon.spy(function (transaction, broadcast, cb) { return cb(error); });
							TransactionPool.__set__('__private.processVerifyTransaction', dummyProcessVerifyTransaction);

							applyUnconfirmed([badTransaction], function (err) {
								lastError = err;
								done();
							});
						});

						it('should not return an error', function () {
							expect(lastError).to.not.exist;
						});

						it('should log an proper error', function () {
							expect(logger.error.calledOnce).to.be.true;
							expect(logger.error.args[0][0]).to.equal('Failed to process / verify unconfirmed transaction: ' + badTransaction.id);
							expect(logger.error.args[0][1]).to.equal(error);
						});

						describe('__private.processVerifyTransaction', function() {

							it('should be called onece', function () {
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', function () {
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(badTransaction);
							});
						});

						describe('modules.transactions.applyUnconfirmed', function() {

							it('should not be called', function () {
								expect(dummyApplyUnconfirmed.called).to.be.false;
							});
						});

						describe('lists', function () {
							var index;

							describe('unconfirmed', function () {

								it('index should be undefined', function () {
									index = transactionPool.unconfirmed.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('queued', function () {

								it('index should be undefined', function () {
									index = transactionPool.queued.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', function () {

								it('index should be undefined', function () {
									index = transactionPool.multisignature.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});
						});

						after(resetStates);
					});

					describe('that results with error on applyUnconfirmed', function () {
						var badTransaction = {id: 'badTx'};
						var error = 'apply error';

						before(function (done) {
							dummyApplyUnconfirmed = sinon.spy(function (transaction, sender, cb) { return cb(error); });
							TransactionPool.__set__('modules.transactions.applyUnconfirmed', dummyApplyUnconfirmed);

							applyUnconfirmed([badTransaction], function (err) {
								lastError = err;
								done();
							});
						});

						it('should not return an error', function () {
							expect(lastError).to.not.exist;
						});

						it('should log an proper error', function () {
							expect(logger.error.calledOnce).to.be.true;
							expect(logger.error.args[0][0]).to.equal('Failed to apply unconfirmed transaction: ' + badTransaction.id);
							expect(logger.error.args[0][1]).to.equal(error);
						});

						describe('__private.processVerifyTransaction', function() {

							it('should be called onece', function () {
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', function () {
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(badTransaction);
							});
						});

						describe('modules.transactions.applyUnconfirmed', function() {

							it('should be called once', function () {
								expect(dummyApplyUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', function () {
								expect(dummyApplyUnconfirmed.args[0][0]).to.deep.equal(badTransaction);
							});
						});

						describe('lists', function () {
							var index;

							describe('unconfirmed', function () {

								it('index should be undefined', function () {
									index = transactionPool.unconfirmed.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('queued', function () {

								it('index should be undefined', function () {
									index = transactionPool.queued.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', function () {

								it('index should be undefined', function () {
									index = transactionPool.multisignature.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});
						});

						after(resetStates);
					});
				});
			});
		});
	});
});
