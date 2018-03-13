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
var Sequence = require('../../../helpers/sequence.js');

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
	var balancesSequence;
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

		// Init balance sequence
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
		done();
	});

	describe('initialize', () => {
		describe('lists', () => {
			it('unconfirmed should be initialized', () => {
				return expect(transactionPool.unconfirmed).to.deep.equal(
					freshListState
				);
			});

			it('bundled should be initialized', () => {
				return expect(transactionPool.bundled).to.deep.equal(freshListState);
			});

			it('queued should be initialized', () => {
				return expect(transactionPool.queued).to.deep.equal(freshListState);
			});

			it('multisignature should be initialized', () => {
				return expect(transactionPool.multisignature).to.deep.equal(
					freshListState
				);
			});
		});

		after(resetStates);
	});

	describe('__private', () => {
		describe('applyUnconfirmedList', () => {
			var lastError;

			before(done => {
				applyUnconfirmed = TransactionPool.__get__(
					'__private.applyUnconfirmedList'
				);
				done();
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
						return expect(lastError).to.not.exist;
					});

					it('should not log an error', () => {
						return expect(logger.error.called).to.be.false;
					});

					describe('__private.processVerifyTransaction', () => {
						it('should not be called', () => {
							return expect(dummyProcessVerifyTransaction.called).to.be.false;
						});
					});

					describe('modules.transactions.applyUnconfirmed', () => {
						it('should not be called', () => {
							return expect(dummyApplyUnconfirmed.called).to.be.false;
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
							return expect(lastError).to.not.exist;
						});

						it('should not log an error', () => {
							return expect(logger.error.called).to.be.false;
						});

						describe('__private.processVerifyTransaction', () => {
							it('should be called once', () => {
								return expect(dummyProcessVerifyTransaction.calledOnce).to.be
									.true;
							});

							it('should be called with transaction as parameter', () => {
								return expect(
									dummyProcessVerifyTransaction.args[0][0]
								).to.deep.equal(validTransaction);
							});
						});

						describe('modules.transactions.applyUnconfirmed', () => {
							it('should be called once', () => {
								return expect(dummyApplyUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', () => {
								return expect(dummyApplyUnconfirmed.args[0][0]).to.deep.equal(
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
									return expect(index).to.be.a('number');
								});

								it('transaction at index should match', () => {
									return expect(
										transactionPool.unconfirmed.transactions[index]
									).to.deep.equal(validTransaction);
								});
							});

							describe('queued', () => {
								it('index should be undefined', () => {
									index = transactionPool.queued.index[validTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', () => {
									index =
										transactionPool.multisignature.index[validTransaction.id];
									return expect(index).to.be.an('undefined');
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
							return expect(lastError).to.not.exist;
						});

						it('should log an proper error', () => {
							expect(logger.error.calledOnce).to.be.true;
							expect(logger.error.args[0][0]).to.equal(
								`Failed to process / verify unconfirmed transaction: ${
									badTransaction.id
								}`
							);
							return expect(logger.error.args[0][1]).to.equal(error);
						});

						describe('__private.processVerifyTransaction', () => {
							it('should be called onece', () => {
								return expect(dummyProcessVerifyTransaction.calledOnce).to.be
									.true;
							});

							it('should be called with transaction as parameter', () => {
								return expect(
									dummyProcessVerifyTransaction.args[0][0]
								).to.deep.equal(badTransaction);
							});
						});

						describe('modules.transactions.applyUnconfirmed', () => {
							it('should not be called', () => {
								return expect(dummyApplyUnconfirmed.called).to.be.false;
							});
						});

						describe('lists', () => {
							var index;

							describe('unconfirmed', () => {
								it('index should be undefined', () => {
									index = transactionPool.unconfirmed.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('queued', () => {
								it('index should be undefined', () => {
									index = transactionPool.queued.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', () => {
									index =
										transactionPool.multisignature.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
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
							return expect(lastError).to.not.exist;
						});

						it('should log an proper error', () => {
							expect(logger.error.calledOnce).to.be.true;
							expect(logger.error.args[0][0]).to.equal(
								`Failed to apply unconfirmed transaction: ${badTransaction.id}`
							);
							return expect(logger.error.args[0][1]).to.equal(error);
						});

						describe('__private.processVerifyTransaction', () => {
							it('should be called onece', () => {
								return expect(dummyProcessVerifyTransaction.calledOnce).to.be
									.true;
							});

							it('should be called with transaction as parameter', () => {
								return expect(
									dummyProcessVerifyTransaction.args[0][0]
								).to.deep.equal(badTransaction);
							});
						});

						describe('modules.transactions.applyUnconfirmed', () => {
							it('should be called once', () => {
								return expect(dummyApplyUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', () => {
								return expect(dummyApplyUnconfirmed.args[0][0]).to.deep.equal(
									badTransaction
								);
							});
						});

						describe('lists', () => {
							var index;

							describe('unconfirmed', () => {
								it('index should be undefined', () => {
									index = transactionPool.unconfirmed.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('queued', () => {
								it('index should be undefined', () => {
									index = transactionPool.queued.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', () => {
									index =
										transactionPool.multisignature.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
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

			before(done => {
				undoUnconfirmedList = transactionPool.undoUnconfirmedList;
				done();
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
						return expect(lastError).to.not.exist;
					});

					it('should not log an error', () => {
						return expect(logger.error.called).to.be.false;
					});

					it('should return empty ids array', () => {
						expect(lastIds).to.be.an('array');
						return expect(lastIds.length).to.equal(0);
					});

					describe('modules.transactions.undoUnconfirmed', () => {
						it('should not be called', () => {
							return expect(dummyUndoUnconfirmed.called).to.be.false;
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
							return expect(lastError).to.not.exist;
						});

						it('should not log an error', () => {
							return expect(logger.error.called).to.be.false;
						});

						it('should return valid ids array', () => {
							expect(lastIds).to.be.an('array');
							return expect(lastIds).to.deep.equal(
								_.map(transactions, tx => {
									return tx.id;
								})
							);
						});

						describe('modules.transactions.undoUnconfirmed', () => {
							it('should be called onece', () => {
								return expect(dummyUndoUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', () => {
								return expect(dummyUndoUnconfirmed.args[0][0]).to.deep.equal(
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
									return expect(index).to.be.an('undefined');
								});
							});

							describe('queued', () => {
								it('index should be set', () => {
									index = transactionPool.queued.index[validTransaction.id];
									return expect(index).to.be.a('number');
								});

								it('transaction at index should match', () => {
									return expect(
										transactionPool.queued.transactions[index]
									).to.deep.equal(validTransaction);
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', () => {
									index =
										transactionPool.multisignature.index[validTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});
						});

						after(resetStates);
					});

					describe('that results with error on modules.transactions.undoUnconfirmed', () => {
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
							return expect(lastError).to.not.exist;
						});

						it('should return valid ids array', () => {
							expect(lastIds).to.be.an('array');
							return expect(lastIds).to.deep.equal(
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
							return expect(logger.error.args[0][1]).to.equal(error);
						});

						describe('modules.transactions.undoUnconfirmed', () => {
							it('should be called onece', () => {
								return expect(dummyUndoUnconfirmed.calledOnce).to.be.true;
							});

							it('should be called with transaction as parameter', () => {
								return expect(dummyUndoUnconfirmed.args[0][0]).to.deep.equal(
									badTransaction
								);
							});
						});

						describe('lists', () => {
							var index;

							describe('unconfirmed', () => {
								it('index should be undefined', () => {
									index = transactionPool.unconfirmed.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('queued', () => {
								it('index should be undefined', () => {
									index = transactionPool.queued.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', () => {
									index =
										transactionPool.multisignature.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});
						});

						after(resetStates);
					});
				});
			});
		});
	});

	describe('transactionInPool', () => {
		afterEach(() => {
			return resetStates();
		});

		describe('when transaction is in pool', () => {
			var tx = '123';

			describe('unconfirmed list', () => {
				describe('with index 0', () => {
					it('should return true', () => {
						transactionPool.unconfirmed.index[tx] = 0;
						return expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});

				describe('with other index', () => {
					it('should return true', () => {
						transactionPool.unconfirmed.index[tx] = 1;
						return expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});
			});

			describe('bundled list', () => {
				describe('with index 0', () => {
					it('should return true', () => {
						transactionPool.bundled.index[tx] = 0;
						return expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});

				describe('with other index', () => {
					it('should return true', () => {
						transactionPool.bundled.index[tx] = 1;
						return expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});
			});

			describe('queued list', () => {
				describe('with index 0', () => {
					it('should return true', () => {
						transactionPool.queued.index[tx] = 0;
						return expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});

				describe('with other index', () => {
					it('should return true', () => {
						transactionPool.queued.index[tx] = 1;
						return expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});
			});

			describe('multisignature list', () => {
				describe('with index 0', () => {
					it('should return true', () => {
						transactionPool.multisignature.index[tx] = 0;
						return expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});

				describe('with other index', () => {
					it('should return true', () => {
						transactionPool.multisignature.index[tx] = 1;
						return expect(transactionPool.transactionInPool(tx)).to.equal(true);
					});
				});
			});
		});

		describe('when transaction is not in pool', () => {
			it('should return false', () => {
				return expect(transactionPool.transactionInPool('123')).to.equal(false);
			});
		});
	});
});
