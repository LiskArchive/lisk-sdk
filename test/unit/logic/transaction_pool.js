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

var _ = require('lodash');
var rewire = require('rewire');
var expect = require('chai').expect;
var sinon = require('sinon');

// Load config file - global (one from test directory)
var config = require('../../../config.json');

// Instantiate test subject
var TransactionPool = rewire('../../../logic/transaction_pool.js');

// Create fresh instance of jobsQueue
var jobsQueue = rewire('../../../helpers/jobs_queue.js');

describe('transactionPool', () => {
	var transactionPool;
	var applyUnconfirmed;
	var dummyProcessVerifyTransaction;
	var dummyApplyUnconfirmed;
	var dummyUndoUnconfirmed;
	var freshListState = { transactions: [], index: {} };

	// Init fake logger
	var logger = {
		trace: sinon.spy(),
		debug: sinon.spy(),
		info: sinon.spy(),
		log: sinon.spy(),
		warn: sinon.spy(),
		error: sinon.spy(),
	};

	var resetStates = function() {
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

		dummyProcessVerifyTransaction = sinon.spy((transaction, broadcast, cb) => {
			return cb();
		});
		TransactionPool.__set__(
			'__private.processVerifyTransaction',
			dummyProcessVerifyTransaction
		);
		dummyApplyUnconfirmed = sinon.spy((transaction, sender, cb) => {
			return cb();
		});
		TransactionPool.__set__(
			'modules.transactions.applyUnconfirmed',
			dummyApplyUnconfirmed
		);
		dummyUndoUnconfirmed = sinon.spy((transaction, cb) => {
			return cb();
		});
		TransactionPool.__set__(
			'modules.transactions.undoUnconfirmed',
			dummyUndoUnconfirmed
		);
	};

	before(done => {
		// Use fresh instance of jobsQueue inside transaction pool
		TransactionPool.__set__('jobsQueue', jobsQueue);

		// Init test subject
		transactionPool = new TransactionPool(
			config.broadcasts.broadcastInterval,
			config.broadcasts.releaseLimit,
			sinon.spy(), // transaction
			sinon.spy(), // bus
			logger // logger
		);

		// Bind fake modules
		transactionPool.bind(
			sinon.spy(), // accounts
			sinon.spy(), // transactions
			sinon.spy() // loader
		);
		done();
	});

	describe('initialize', () => {
		describe('lists', () => {
			it('unconfirmed should be initialized', () => {
				expect(transactionPool.unconfirmed).to.deep.equal(freshListState);
			});

			it('bundled should be initialized', () => {
				expect(transactionPool.bundled).to.deep.equal(freshListState);
			});

			it('queued should be initialized', () => {
				expect(transactionPool.queued).to.deep.equal(freshListState);
			});

			it('multisignature should be initialized', () => {
				expect(transactionPool.multisignature).to.deep.equal(freshListState);
			});
		});

		after(resetStates);
	});

	describe('__private', () => {
		describe('applyUnconfirmedList', () => {
			var lastError;

			before(() => {
				applyUnconfirmed = TransactionPool.__get__(
					'__private.applyUnconfirmedList'
				);
			});

			describe('called with array', () => {
				describe('that is empty', () => {
					before(done => {
						applyUnconfirmed([], err => {
							lastError = err;
							done();
						});
					});

					it('should not return an error', () => {
						expect(lastError).to.not.exist;
					});

					it('should not log an error', () => {
						expect(logger.error.called).to.be.false;
					});

					describe('__private.processVerifyTransaction', () => {
						it('should not be called', () => {
							expect(dummyProcessVerifyTransaction.called).to.be.false;
						});
					});

					describe('modules.transactions.applyUnconfirmed', () => {
						it('should not be called', () => {
							expect(dummyApplyUnconfirmed.called).to.be.false;
						});
					});

					after(resetStates);
				});

				describe('that contains 1 transaction', () => {
					describe('that is valid', () => {
						var validTransaction = { id: 'validTx' };

						before(done => {
							applyUnconfirmed([validTransaction], err => {
								lastError = err;
								done();
							});
						});

						it('should not return an error', () => {
							expect(lastError).to.not.exist;
						});

						it('should not log an error', () => {
							expect(logger.error.called).to.be.false;
						});

						describe('__private.processVerifyTransaction', () => {
							it('should be called once', () => {
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', () => {
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(
									validTransaction
								);
							});
						});

						describe('modules.transactions.applyUnconfirmed', () => {
							it('should be called once', () => {
								expect(dummyApplyUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', () => {
								expect(dummyApplyUnconfirmed.args[0][0]).to.deep.equal(
									validTransaction
								);
							});
						});

						describe('lists', () => {
							var index;

							describe('unconfirmed', () => {
								it('index should be set', () => {
									index =
										transactionPool.unconfirmed.index[validTransaction.id];
									expect(index).to.be.a('number');
								});

								it('transaction at index should match', () => {
									expect(
										transactionPool.unconfirmed.transactions[index]
									).to.deep.equal(validTransaction);
								});
							});

							describe('queued', () => {
								it('index should be undefined', () => {
									index = transactionPool.queued.index[validTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', () => {
									index =
										transactionPool.multisignature.index[validTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});
						});

						after(resetStates);
					});

					describe('that results with error on processVerifyTransaction', () => {
						var badTransaction = { id: 'badTx' };
						var error = 'verify error';

						before(done => {
							dummyProcessVerifyTransaction = sinon.spy(
								(transaction, broadcast, cb) => {
									return cb(error);
								}
							);
							TransactionPool.__set__(
								'__private.processVerifyTransaction',
								dummyProcessVerifyTransaction
							);

							applyUnconfirmed([badTransaction], err => {
								lastError = err;
								done();
							});
						});

						it('should not return an error', () => {
							expect(lastError).to.not.exist;
						});

						it('should log an proper error', () => {
							expect(logger.error.calledOnce).to.be.true;
							expect(logger.error.args[0][0]).to.equal(
								`Failed to process / verify unconfirmed transaction: ${
									badTransaction.id
								}`
							);
							expect(logger.error.args[0][1]).to.equal(error);
						});

						describe('__private.processVerifyTransaction', () => {
							it('should be called onece', () => {
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', () => {
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(
									badTransaction
								);
							});
						});

						describe('modules.transactions.applyUnconfirmed', () => {
							it('should not be called', () => {
								expect(dummyApplyUnconfirmed.called).to.be.false;
							});
						});

						describe('lists', () => {
							var index;

							describe('unconfirmed', () => {
								it('index should be undefined', () => {
									index = transactionPool.unconfirmed.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('queued', () => {
								it('index should be undefined', () => {
									index = transactionPool.queued.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', () => {
									index =
										transactionPool.multisignature.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});
						});

						after(resetStates);
					});

					describe('that results with error on applyUnconfirmed', () => {
						var badTransaction = { id: 'badTx' };
						var error = 'apply error';

						before(done => {
							dummyApplyUnconfirmed = sinon.spy((transaction, sender, cb) => {
								return cb(error);
							});
							TransactionPool.__set__(
								'modules.transactions.applyUnconfirmed',
								dummyApplyUnconfirmed
							);

							applyUnconfirmed([badTransaction], err => {
								lastError = err;
								done();
							});
						});

						it('should not return an error', () => {
							expect(lastError).to.not.exist;
						});

						it('should log an proper error', () => {
							expect(logger.error.calledOnce).to.be.true;
							expect(logger.error.args[0][0]).to.equal(
								`Failed to apply unconfirmed transaction: ${badTransaction.id}`
							);
							expect(logger.error.args[0][1]).to.equal(error);
						});

						describe('__private.processVerifyTransaction', () => {
							it('should be called onece', () => {
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', () => {
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(
									badTransaction
								);
							});
						});

						describe('modules.transactions.applyUnconfirmed', () => {
							it('should be called once', () => {
								expect(dummyApplyUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', () => {
								expect(dummyApplyUnconfirmed.args[0][0]).to.deep.equal(
									badTransaction
								);
							});
						});

						describe('lists', () => {
							var index;

							describe('unconfirmed', () => {
								it('index should be undefined', () => {
									index = transactionPool.unconfirmed.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('queued', () => {
								it('index should be undefined', () => {
									index = transactionPool.queued.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', () => {
									index =
										transactionPool.multisignature.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});
						});

						after(resetStates);
					});
				});
			});
		});

		describe('undoUnconfirmedList', () => {
			var undoUnconfirmedList;
			var lastError;
			var lastIds;

			before(() => {
				undoUnconfirmedList = transactionPool.undoUnconfirmedList;
			});

			describe('when unconfirmed lists', () => {
				describe('is empty', () => {
					var transactions = [];

					before(done => {
						transactionPool.getUnconfirmedTransactionList = function() {
							return transactions;
						};

						undoUnconfirmedList((err, ids) => {
							lastError = err;
							lastIds = ids;
							done();
						});
					});

					it('should not return an error', () => {
						expect(lastError).to.not.exist;
					});

					it('should not log an error', () => {
						expect(logger.error.called).to.be.false;
					});

					it('should return empty ids array', () => {
						expect(lastIds).to.be.an('array');
						expect(lastIds.length).to.equal(0);
					});

					describe('modules.transactions.undoUnconfirmed', () => {
						it('should not be called', () => {
							expect(dummyUndoUnconfirmed.called).to.be.false;
						});
					});

					after(resetStates);
				});

				describe('contains 1 transaction', () => {
					describe('that is valid', () => {
						var validTransaction = { id: 'validTx' };
						var transactions = [validTransaction];

						before(done => {
							transactionPool.addUnconfirmedTransaction(validTransaction);
							transactionPool.getUnconfirmedTransactionList = function() {
								return transactions;
							};

							undoUnconfirmedList((err, ids) => {
								lastError = err;
								lastIds = ids;
								done();
							});
						});

						it('should not return an error', () => {
							expect(lastError).to.not.exist;
						});

						it('should not log an error', () => {
							expect(logger.error.called).to.be.false;
						});

						it('should return valid ids array', () => {
							expect(lastIds).to.be.an('array');
							expect(lastIds).to.deep.equal(
								_.map(transactions, tx => {
									return tx.id;
								})
							);
						});

						describe('modules.transactions.undoUnconfirmed', () => {
							it('should be called onece', () => {
								expect(dummyUndoUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', () => {
								expect(dummyUndoUnconfirmed.args[0][0]).to.deep.equal(
									validTransaction
								);
							});
						});

						describe('lists', () => {
							var index;

							describe('unconfirmed', () => {
								it('index should be undefined', () => {
									index =
										transactionPool.unconfirmed.index[validTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('queued', () => {
								it('index should be set', () => {
									index = transactionPool.queued.index[validTransaction.id];
									expect(index).to.be.a('number');
								});

								it('transaction at index should match', () => {
									expect(
										transactionPool.queued.transactions[index]
									).to.deep.equal(validTransaction);
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', () => {
									index =
										transactionPool.multisignature.index[validTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});
						});

						after(resetStates);
					});

					describe('that results with error on modules.transactions.undoUnconfirme', () => {
						var badTransaction = { id: 'badTx' };
						var transactions = [badTransaction];
						var error = 'undo error';

						before(done => {
							dummyUndoUnconfirmed = sinon.spy((transaction, cb) => {
								return cb(error);
							});
							TransactionPool.__set__(
								'modules.transactions.undoUnconfirmed',
								dummyUndoUnconfirmed
							);

							transactionPool.addUnconfirmedTransaction(badTransaction);
							transactionPool.getUnconfirmedTransactionList = function() {
								return transactions;
							};

							undoUnconfirmedList((err, ids) => {
								lastError = err;
								lastIds = ids;
								done();
							});
						});

						it('should not return an error', () => {
							expect(lastError).to.not.exist;
						});

						it('should return valid ids array', () => {
							expect(lastIds).to.be.an('array');
							expect(lastIds).to.deep.equal(
								_.map(transactions, tx => {
									return tx.id;
								})
							);
						});

						it('should log an proper error', () => {
							expect(logger.error.calledOnce).to.be.true;
							expect(logger.error.args[0][0]).to.equal(
								`Failed to undo unconfirmed transaction: ${badTransaction.id}`
							);
							expect(logger.error.args[0][1]).to.equal(error);
						});

						describe('modules.transactions.undoUnconfirmed', () => {
							it('should be called onece', () => {
								expect(dummyUndoUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', () => {
								expect(dummyUndoUnconfirmed.args[0][0]).to.deep.equal(
									badTransaction
								);
							});
						});

						describe('lists', () => {
							var index;

							describe('unconfirmed', () => {
								it('index should be undefined', () => {
									index = transactionPool.unconfirmed.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('queued', () => {
								it('index should be undefined', () => {
									index = transactionPool.queued.index[badTransaction.id];
									expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', () => {
									index =
										transactionPool.multisignature.index[badTransaction.id];
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
