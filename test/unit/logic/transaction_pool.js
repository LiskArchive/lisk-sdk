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

const _ = require('lodash');
const rewire = require('rewire');
const expect = require('chai').expect;
const sinon = require('sinon');
const transactionTypes = require('../../../helpers/transaction_types.js');
// Load config file - global (one from test directory)
const config = require('../../../config.json');

// Instantiate test subject
const TransactionPool = rewire('../../../logic/transaction_pool.js');

// Create fresh instance of jobsQueue
const jobsQueue = rewire('../../../helpers/jobs_queue.js');

describe('transactionPool', () => {
	let transactionPool;
	let applyUnconfirmed;
	let dummyProcessVerifyTransaction;
	let dummyApplyUnconfirmed;
	let dummyUndoUnconfirmed;
	const freshListState = { transactions: [], index: {} };

	// Init fake logger
	const logger = {
		trace: sinon.spy(),
		debug: sinon.spy(),
		info: sinon.spy(),
		log: sinon.spy(),
		warn: sinon.spy(),
		error: sinon.spy(),
	};

	const accountsStub = {
		setAccountAndGet: sinon.stub(),
	};
	const transactionsStub = sinon.stub();
	const loaderStub = sinon.stub();

	const resetStates = function() {
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
			accountsStub, // accounts
			transactionsStub, // transactions
			loaderStub // loader
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

	describe('bind', () => {
		describe('modules', () => {
			it('should assign accounts, transactions, loader', () => {
				const modules = TransactionPool.__get__('modules');
				return expect(modules).to.eql({
					accounts: accountsStub,
					transactions: transactionsStub,
					loader: loaderStub,
				});
			});
		});
	});

	describe('getUnconfirmedTransaction', () => {
		const validTransaction = { id: '123' };
		beforeEach(() => {
			return transactionPool.addUnconfirmedTransaction(validTransaction);
		});

		it('should return undefined for invalid transaction id', () => {
			return expect(transactionPool.getUnconfirmedTransaction('^&&^')).to.eql(
				undefined
			);
		});

		it('should return transactions for valid transaction id', () => {
			return expect(transactionPool.getUnconfirmedTransaction('123')).to.eql(
				validTransaction
			);
		});
	});

	describe('getBundledTransaction', () => {
		const validTransaction = { id: '123' };
		beforeEach(() => {
			return transactionPool.addBundledTransaction(validTransaction);
		});

		it('should return undefined for invalid transaction id', () => {
			return expect(transactionPool.getBundledTransaction('^&&^')).to.eql(
				undefined
			);
		});

		it('should return transactions for valid transaction id', () => {
			return expect(transactionPool.getBundledTransaction('123')).to.eql(
				validTransaction
			);
		});
	});

	describe('getQueuedTransaction', () => {
		const validTransaction = { id: '123' };
		beforeEach(() => {
			return transactionPool.addQueuedTransaction(validTransaction);
		});

		it('should return undefined if transaction does not exists', () => {
			return expect(transactionPool.getQueuedTransaction('12')).to.eql(
				undefined
			);
		});

		it('should return queued transactions', () => {
			return expect(transactionPool.getQueuedTransaction('123')).to.eql(
				validTransaction
			);
		});
	});

	describe('getMultisignatureTransaction', () => {
		const validTransaction = { id: '123' };
		beforeEach(() => {
			return transactionPool.addMultisignatureTransaction(validTransaction);
		});

		it('should return undefined if transaction does not exists', () => {
			return expect(transactionPool.getMultisignatureTransaction('12')).to.eql(
				undefined
			);
		});

		it('should return queued transactions', () => {
			return expect(transactionPool.getMultisignatureTransaction('123')).to.eql(
				validTransaction
			);
		});
	});

	describe('getUnconfirmedTransactionList', () => {
		const validTransaction = { id: '123' };
		beforeEach(() => {
			return transactionPool.addMultisignatureTransaction(validTransaction);
		});

		it('should return undefined if transaction does not exists', () => {
			return expect(transactionPool.getMultisignatureTransaction('12')).to.eql(
				undefined
			);
		});

		it('should return queued transactions', () => {
			return expect(transactionPool.getMultisignatureTransaction('123')).to.eql(
				validTransaction
			);
		});
	});

	describe('getBundledTransactionList', () => {});

	describe('getQueuedTransactionList', () => {});

	describe('getMultisignatureTransactionList', () => {});

	describe('getMergedTransactionList', () => {});

	describe('addUnconfirmedTransaction', () => {
		it('should be able to add unconfirmed transaction if not exists', () => {
			const unconfirmedTransaction = { id: '1123' };
			transactionPool.addUnconfirmedTransaction(unconfirmedTransaction);
			return expect(transactionPool.unconfirmed.transactions).that.does.include(
				unconfirmedTransaction
			);
		});

		it('should be able to remove multi transaction type and add unconfirmed transaction if not exists', () => {
			const unconfirmedTransaction = {
				id: '104568989234234L',
				type: transactionTypes.MULTI,
			};
			transactionPool.addUnconfirmedTransaction(unconfirmedTransaction);
			return expect(transactionPool.unconfirmed.transactions).that.does.include(
				unconfirmedTransaction
			);
		});
	});

	describe('removeUnconfirmedTransaction', () => {
		const unconfirmedTransaction = {
			id: '104568989234234L',
			type: transactionTypes.MULTI,
		};
		beforeEach(() => {
			return transactionPool.addUnconfirmedTransaction(unconfirmedTransaction);
		});

		it('should be able to remove unconfirmed transactions', () => {
			expect(transactionPool.unconfirmed.transactions)
				.to.be.an('array')
				.to.deep.include(unconfirmedTransaction);

			transactionPool.removeUnconfirmedTransaction(unconfirmedTransaction.id);

			return expect(transactionPool.unconfirmed.transactions)
				.to.be.an('array')
				.to.not.include(unconfirmedTransaction);
		});
	});

	describe('countUnconfirmed', () => {
		it('should return count of unconfirmed transaction exists in pool', () => {
			return expect(transactionPool.countUnconfirmed()).to.deep.eql(2);
		});

		it('should return the count of unconfirmed transaction exists in pool after removal', () => {
			transactionPool.removeUnconfirmedTransaction('123');
			expect(transactionPool.countUnconfirmed()).to.deep.eql(1);
			transactionPool.removeUnconfirmedTransaction('1123');
			return expect(transactionPool.countUnconfirmed()).to.deep.eql(0);
		});
	});

	describe('addBundledTransaction', () => {
		it('should be able to add bundled transaction if not exists', () => {
			const bundledTransaction = { id: '3423423423L' };
			transactionPool.addBundledTransaction(bundledTransaction);
			return expect(transactionPool.bundled.transactions).that.does.include(
				bundledTransaction
			);
		});
	});

	describe('removeBundledTransaction', () => {
		it('should be able to remove bundled transaction if exists', () => {
			const bundledTransaction = { id: '3423423423L' };
			transactionPool.removeBundledTransaction(bundledTransaction.id);
			return expect(transactionPool.bundled.transactions).that.does.not.include(
				bundledTransaction
			);
		});
	});

	describe('countBundled', () => {
		it('should return count of bundled transaction exists in pool', () => {
			return expect(transactionPool.countBundled()).to.deep.eql(1);
		});

		it('should return the count of bundled transaction exists in pool after removal', () => {
			transactionPool.removeBundledTransaction('123');
			return expect(transactionPool.countBundled()).to.deep.eql(0);
		});
	});

	describe('addQueuedTransaction', () => {
		it('should be able to add transaction to queue', () => {
			const transaction = { id: '103111423423423L' };
			expect(transactionPool.queued.transactions)
				.to.be.an('array')
				.that.does.not.include(transaction);

			transactionPool.addQueuedTransaction(transaction);

			return expect(transactionPool.queued.transactions)
				.to.be.an('array')
				.that.does.include(transaction);
		});
	});

	describe('removeQueuedTransaction', () => {
		it('should be able to remove transaction to queue', () => {
			const transaction = { id: '103111423423423L' };

			transactionPool.addQueuedTransaction(transaction);
			transactionPool.removeQueuedTransaction(transaction.id);

			return expect(transactionPool.queued.transactions)
				.to.be.an('array')
				.that.does.not.include(transaction);
		});
	});

	describe('countQueued', () => {
		it('should return count of queued transaction exists in pool', () => {
			expect(transactionPool.countQueued()).to.deep.eql(0);
			const transaction = { id: '103111423423423L' };
			transactionPool.addQueuedTransaction(transaction);
			return expect(transactionPool.countQueued()).to.deep.eql(1);
		});

		it('should return the count of queued transaction exists in pool after removal', () => {
			transactionPool.removeQueuedTransaction('103111423423423L');
			return expect(transactionPool.countQueued()).to.deep.eql(0);
		});
	});

	describe('addMultisignatureTransaction', () => {
		it('should be able to add multi transaction', () => {
			const transaction = {
				id: '103111423423423L',
				type: transactionTypes.MULTI,
			};
			expect(transactionPool.multisignature.transactions)
				.to.be.an('array')
				.that.does.not.include(transaction);

			transactionPool.addMultisignatureTransaction(transaction);

			return expect(transactionPool.multisignature.transactions)
				.to.be.an('array')
				.that.does.include(transaction);
		});

		it('should not add existing multi transaction', () => {
			const transaction = {
				id: '1043111423423423L',
				type: transactionTypes.MULTI,
			};
			transactionPool.addMultisignatureTransaction(transaction);
			expect(transactionPool.multisignature.transactions)
				.to.be.an('array')
				.that.does.include(transaction);
			expect(transactionPool.multisignature.transactions.length).to.eql(3);
			transactionPool.addMultisignatureTransaction(transaction);
			expect(transactionPool.multisignature.transactions.length).to.eql(3);
			return expect(transactionPool.multisignature.transactions)
				.to.be.an('array')
				.that.does.include(transaction);
		});
	});

	describe('removeMultisignatureTransaction', () => {
		it('should be able to remove multi transaction', () => {
			const transaction = {
				id: '10431411423423423L',
				type: transactionTypes.MULTI,
			};
			transactionPool.addMultisignatureTransaction(transaction);
			expect(transactionPool.multisignature.transactions)
				.to.be.an('array')
				.that.does.include(transaction);
			transactionPool.removeMultisignatureTransaction(transaction.id);
			return expect(transactionPool.multisignature.transactions)
				.to.be.an('array')
				.that.does.not.include(transaction);
		});
	});

	describe('countMultisignature', () => {
		it('should return count of multi signature transaction exists', () => {
			expect(transactionPool.countMultisignature()).to.deep.eql(2);
			const transaction = {
				id: '10431411423423423L',
				type: transactionTypes.MULTI,
			};
			transactionPool.addMultisignatureTransaction(transaction);
			return expect(transactionPool.countMultisignature()).to.deep.eql(3);
		});
	});

	describe('receiveTransactions', () => {
		it('should throw error when transaction in invalid', () => {
			const invalidTransaction = {
				id: '10431411423423423L',
				type: transactionTypes.MULTI,
			};
			return expect(() => {
				transactionPool.receiveTransactions(invalidTransaction, {});
			}).to.throw();
		});

		it('should receive transaction already processed error when the transaction is processed before', done => {
			const transaction = [
				{ id: '10431411423423423L', type: transactionTypes.MULTI },
			];
			transactionPool.processUnconfirmedTransaction = sinonSandbox
				.stub()
				.callsArgWith(
					2,
					'Transaction is already processed: 10431411423423423L',
					null
				);

			expect(
				transactionPool.receiveTransactions(transaction, {}, (err, res) => {
					expect(err).to.eql(
						'Transaction is already processed: 10431411423423423L'
					);
					expect(res).to.deep.eql(transaction);
					done();
				})
			);
		});

		it('should add transaction to queue when bundle is enabled', done => {
			const transaction = [
				{ id: '109249333874723L', type: transactionTypes.MULTI, bundled: true },
			];
			transactionPool.processUnconfirmedTransaction = sinonSandbox
				.stub()
				.callsArgWith(2, null, transaction);
			expect(
				transactionPool.receiveTransactions(transaction, {}, (err, res) => {
					expect(err).to.be.null;
					expect(res).to.deep.eql(transaction);
					done();
				})
			);
		});
	});

	describe('reindexQueues', () => {
		before(() => {
			transactionPool.addBundledTransaction({ id: '123', bundled: true });
			transactionPool.addQueuedTransaction({ id: '456' });
			transactionPool.addUnconfirmedTransaction({ id: '789' });
			return transactionPool.addMultisignatureTransaction({ id: '012' });
		});

		it('should be able to reindex bundled, queued, multisignature, unconfirmed transactions', () => {
			expect(transactionPool.countQueued()).to.deep.eql(1);
			expect(transactionPool.countBundled()).to.deep.eql(1);
			expect(transactionPool.countMultisignature()).to.deep.eql(4);
			expect(transactionPool.countUnconfirmed()).to.deep.eql(1);
			return expect(transactionPool.reindexQueues());
		});
	});

	describe('processBundled', () => {
		let processVerifyTransaction;
		beforeEach(done => {
			resetStates();
			transactionPool.addBundledTransaction({ id: '123', bundled: true });
			processVerifyTransaction = TransactionPool.__get__(
				'__private.processVerifyTransaction'
			);
			done();
		});

		afterEach(done => {
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				processVerifyTransaction
			);
			done();
		});

		it('should fail to process the bundle transaction', done => {
			const processVerifyTransactionStub = sinon
				.stub()
				.callsArgWith(2, 'Failed to process bundle transaction');
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				processVerifyTransactionStub
			);
			transactionPool.processBundled(() => {
				expect(logger.debug.args[0][0]).to.deep.eql(
					'Failed to process / verify bundled transaction: 123'
				);
				expect(logger.debug.args[0][1]).to.deep.eql(
					'Failed to process bundle transaction'
				);
				done();
			});
		});

		it('should fail to queue bundled transaction', done => {
			const processVerifyTransactionStub = sinon.stub().callsArgWith(2, null);
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				processVerifyTransactionStub
			);
			sinon
				.stub(transactionPool, 'queueTransaction')
				.callsArgWith(1, 'Failed to queue bundled transaction');
			transactionPool.processBundled(() => {
				expect(logger.debug.args[0][0]).to.deep.eql(
					'Failed to queue bundled transaction: 123'
				);
				expect(logger.debug.args[0][1]).to.deep.eql(
					'Failed to queue bundled transaction'
				);
				done();
			});
		});
	});

	describe('processUnconfirmedTransaction', () => {});

	describe('queueTransaction', () => {});

	describe('undoUnconfirmedList', () => {
		let undoUnconfirmedList;
		let lastError;
		let lastIds;

		before(done => {
			undoUnconfirmedList = transactionPool.undoUnconfirmedList;
			done();
		});

		describe('when unconfirmed lists', () => {
			describe('is empty', () => {
				const transactions = [];

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
					const validTransaction = { id: 'validTx' };
					const transactions = [validTransaction];

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
						let index;

						describe('unconfirmed', () => {
							it('index should be undefined', () => {
								index = transactionPool.unconfirmed.index[validTransaction.id];
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

				describe('that results with error on modules.transactions.undoUnconfirme', () => {
					const badTransaction = { id: 'badTx' };
					const transactions = [badTransaction];
					const error = 'undo error';

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
						let index;

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
								index = transactionPool.multisignature.index[badTransaction.id];
								return expect(index).to.be.an('undefined');
							});
						});
					});

					after(resetStates);
				});
			});
		});
	});

	describe('expireTransactions', () => {
		let expireTransactions;
		beforeEach(done => {
			expireTransactions = TransactionPool.__get__(
				'__private.expireTransactions'
			);
			done();
		});

		it('should throw error for invalid transaction', () => {
			const invalidTransactions = [{ id: '123' }];
			return expect(() => {
				expireTransactions(invalidTransactions, []);
			}).to.throw();
		});

		it('should throw error for transaction with invalid time', () => {
			const invalidTransactions = [{ id: '123', receivedAt: '2018-03-06' }];
			return expect(() => {
				expireTransactions(invalidTransactions, []);
			}).to.throw();
		});

		it('should return empty ids if there are no transactions', done => {
			const invalidTransactions = [null];
			expireTransactions(invalidTransactions, [], (err, res) => {
				expect(err).to.be.null;
				expect(res).to.be.eql([]);
				done();
			});
		});

		it('should remove unconfirmed trasactions', done => {
			const invalidTransactions = [
				{ id: '123', receivedAt: new Date('2018-03-06') },
			];
			expireTransactions(invalidTransactions, [], (err, res) => {
				expect(err).to.be.null;
				expect(res).to.be.eql(['123']);
				done();
			});
		});

		it('should get all trasactions for receivedAt time greater than current time', done => {
			const receivedAt = new Date(new Date() + 30 * 60000);
			const invalidTransactions = [{ id: '123', receivedAt }];
			expireTransactions(invalidTransactions, [], (err, res) => {
				expect(err).to.be.null;
				expect(res).to.be.eql([]);
				done();
			});
		});
	});

	describe('fillPool', () => {});

	describe('__private', () => {
		describe('getTransactionList', () => {});

		describe('processVerifyTransaction', () => {});

		describe('applyUnconfirmedList', () => {
			let lastError;

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
						const validTransaction = { id: 'validTx' };

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
							let index;

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
						const badTransaction = { id: 'badTx' };
						const error = 'verify error';

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
							let index;

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
						const badTransaction = { id: 'badTx' };
						const error = 'apply error';

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
							let index;

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

		describe('transactionTimeOut', () => {});

		describe('expireTransactions', () => {});
	});
});
