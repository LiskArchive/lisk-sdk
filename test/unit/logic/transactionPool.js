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

// Create fresh instance of jobsQueue
var jobsQueue = rewire('../../../helpers/jobsQueue.js');

var Sequence = require('../../../helpers/sequence.js');

describe('transactionPool', function () {

	var transactionPool;
	var freshListState = {transactions: [], index: {}};
	var dummyProcessVerifyTransaction;
	var dummyApplyUnconfirmed;
	var dummyUndoUnconfirmed;
	var balancesSequence;

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
		dummyUndoUnconfirmed = sinon.spy(function (transaction, cb) { return cb(); });
		TransactionPool.__set__('modules.transactions.undoUnconfirmed', dummyUndoUnconfirmed);
	};

	before(function () {
		// Use fresh instance of jobsQueue inside transaction pool
		TransactionPool.__set__('jobsQueue', jobsQueue);

		balancesSequence = new Sequence();

		// Init test subject
		transactionPool = new TransactionPool(
			config.broadcasts.broadcastInterval,
			config.broadcasts.releaseLimit,
			sinon.spy(), // transaction
			sinon.spy(), // bus
			logger, // logger
			balancesSequence
		);

		// Bind fake modules
		transactionPool.bind(
			sinon.spy(), // accounts
			sinon.spy(), // transactions
			sinon.spy() // loader
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

					describe('__private.processVerifyTransaction', function () {

						it('should not be called', function () {
							expect(dummyProcessVerifyTransaction.called).to.be.false;
						});
					});

					describe('modules.transactions.applyUnconfirmed', function () {

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

						describe('__private.processVerifyTransaction', function () {

							it('should be called once', function () {
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', function () {
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(validTransaction);
							});
						});

						describe('modules.transactions.applyUnconfirmed', function () {

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
									expect(index).to.be.a('number');
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
						});

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

						describe('__private.processVerifyTransaction', function () {

							it('should be called onece', function () {
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', function () {
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(badTransaction);
							});
						});

						describe('modules.transactions.applyUnconfirmed', function () {

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

						describe('__private.processVerifyTransaction', function () {

							it('should be called onece', function () {
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', function () {
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(badTransaction);
							});
						});

						describe('modules.transactions.applyUnconfirmed', function () {

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

		describe('undoUnconfirmedList', function () {

			var undoUnconfirmedList;
			var lastError;
			var lastIds;

			before(function () {
				undoUnconfirmedList = transactionPool.undoUnconfirmedList;
			});

			describe('when unconfirmed lists', function () {

				describe('is empty', function () {

					var transactions = [];

					before(function (done) {
						transactionPool.getUnconfirmedTransactionList = function () {
							return transactions;
						};

						undoUnconfirmedList(function (err, ids) {
							lastError = err;
							lastIds = ids;
							done();
						});
					});

					it('should not return an error', function () {
						expect(lastError).to.not.exist;
					});

					it('should not log an error', function () {
						expect(logger.error.called).to.be.false;
					});

					it('should return empty ids array', function () {
						expect(lastIds).to.be.an('array');
						expect(lastIds.length).to.equal(0);
					});

					describe('modules.transactions.undoUnconfirmed', function () {

						it('should not be called', function () {
							expect(dummyUndoUnconfirmed.called).to.be.false;
						});
					});

					after(resetStates);
				});

				describe('contains 1 transaction', function () {

					describe('that is valid', function () {

						var validTransaction = {id: 'validTx'};
						var transactions = [ validTransaction ];

						before(function (done) {
							transactionPool.addUnconfirmedTransaction(validTransaction);
							transactionPool.getUnconfirmedTransactionList = function () {
								return transactions;
							};

							undoUnconfirmedList(function (err, ids) {
								lastError = err;
								lastIds = ids;
								done();
							});
						});

						it('should not return an error', function () {
							expect(lastError).to.not.exist;
						});

						it('should not log an error', function () {
							expect(logger.error.called).to.be.false;
						});

						it('should return valid ids array', function () {
							expect(lastIds).to.be.an('array');
							expect(lastIds).to.deep.equal(_.map(transactions, function (tx) { return tx.id; }));
						});

						describe('modules.transactions.undoUnconfirmed', function () {

							it('should be called onece', function () {
								expect(dummyUndoUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', function () {
								expect(dummyUndoUnconfirmed.args[0][0]).to.deep.equal(validTransaction);
							});
						});

						describe('lists', function () {

							var index;

							describe('unconfirmed', function () {

								it('index should be undefined', function () {
									index = transactionPool.unconfirmed.index[validTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('queued', function () {

								it('index should be set', function () {
									index = transactionPool.queued.index[validTransaction.id];
									expect(index).to.be.a('number');
								});

								it('transaction at index should match', function () {
									expect(transactionPool.queued.transactions[index]).to.deep.equal(validTransaction);
								});
							});

							describe('multisignature', function () {

								it('index should be undefined', function () {
									index = transactionPool.multisignature.index[validTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});
						});

						after(resetStates);
					});

					describe('that results with error on modules.transactions.undoUnconfirmed', function () {

						var badTransaction = {id: 'badTx'};
						var transactions = [ badTransaction ];
						var error = 'undo error';

						before(function (done) {
							dummyUndoUnconfirmed = sinon.spy(function (transaction, cb) { return cb(error); });
							TransactionPool.__set__('modules.transactions.undoUnconfirmed', dummyUndoUnconfirmed);

							transactionPool.addUnconfirmedTransaction(badTransaction);
							transactionPool.getUnconfirmedTransactionList = function () {
								return transactions;
							};

							undoUnconfirmedList(function (err, ids) {
								lastError = err;
								lastIds = ids;
								done();
							});
						});

						it('should not return an error', function () {
							expect(lastError).to.not.exist;
						});

						it('should return valid ids array', function () {
							expect(lastIds).to.be.an('array');
							expect(lastIds).to.deep.equal(_.map(transactions, function (tx) { return tx.id; }));
						});

						it('should log an proper error', function () {
							expect(logger.error.calledOnce).to.be.true;
							expect(logger.error.args[0][0]).to.equal('Failed to undo unconfirmed transaction: ' + badTransaction.id);
							expect(logger.error.args[0][1]).to.equal(error);
						});

						describe('modules.transactions.undoUnconfirmed', function () {

							it('should be called onece', function () {
								expect(dummyUndoUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', function () {
								expect(dummyUndoUnconfirmed.args[0][0]).to.deep.equal(badTransaction);
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

	describe('transactionInPool', function () {

		afterEach(function () {
			resetStates();
		});

		describe('when transaction is in pool', function () {

			var tx = '123';

			describe('unconfirmed list', function () {

				describe('with index 0', function () {

					it('should return true', function () {
						transactionPool.unconfirmed.index[tx] = 0;
						expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});

				describe('with other index', function () {

					it('should return true', function () {
						transactionPool.unconfirmed.index[tx] = 1;
						expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});
			});

			describe('bundled list', function () {

				describe('with index 0', function () {

					it('should return true', function () {
						transactionPool.bundled.index[tx] = 0;
						expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});

				describe('with other index', function () {

					it('should return true', function () {
						transactionPool.bundled.index[tx] = 1;
						expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});
			});

			describe('queued list', function () {

				describe('with index 0', function () {

					it('should return true', function () {
						transactionPool.queued.index[tx] = 0;
						expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});

				describe('with other index', function () {

					it('should return true', function () {
						transactionPool.queued.index[tx] = 1;
						expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});
			});

			describe('multisignature list', function () {

				describe('with index 0', function () {

					it('should return true', function () {
						transactionPool.multisignature.index[tx] = 0;
						expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});

				describe('with other index', function () {

					it('should return true', function () {
						transactionPool.multisignature.index[tx] = 1;
						expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});
			});
		});

		describe('when transaction is not in pool', function () {

			it('should return false', function () {
				expect(transactionPool.transactionInPool('123')).to.equal(false);
			});
		});
	});
});
