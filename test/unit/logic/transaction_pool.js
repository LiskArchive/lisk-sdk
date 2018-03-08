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
const constants = require('../../../helpers/constants.js');
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
	let countBundled;
	let applyUnconfirmedList;
	let processVerifyTransaction;
	let transactionTimeOut;
	let expireTransactions;
	let transactionInPool;
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
	const loaderStub = {
		syncing: sinon.stub().returns(false),
	};

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

	beforeEach(done => {
		countBundled = TransactionPool.__get__(
			'TransactionPool.prototype.countBundled'
		);
		applyUnconfirmedList = TransactionPool.__get__(
			'__private.applyUnconfirmedList'
		);
		processVerifyTransaction = TransactionPool.__get__(
			'__private.processVerifyTransaction'
		);
		transactionTimeOut = TransactionPool.__get__(
			'__private.transactionTimeOut'
		);
		expireTransactions = TransactionPool.__get__(
			'__private.expireTransactions'
		);
		transactionInPool = TransactionPool.__get__(
			'TransactionPool.prototype.transactionInPool'
		);
		done();
	});

	afterEach(done => {
		TransactionPool.__set__(
			'TransactionPool.prototype.countBundled',
			countBundled
		);
		TransactionPool.__set__(
			'__private.applyUnconfirmedList',
			applyUnconfirmedList
		);
		TransactionPool.__set__(
			'__private.processVerifyTransaction',
			processVerifyTransaction
		);
		TransactionPool.__set__('__private.transactionTimeOut', transactionTimeOut);
		TransactionPool.__set__('__private.expireTransactions', expireTransactions);
		TransactionPool.__set__(
			'TransactionPool.prototype.transactionInPool',
			transactionInPool
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

	describe('getBundledTransactionList', () => {
		it('should be able to get list of transactions', () => {
			const transaction1 = { id: '1233123L' };
			const transaction2 = { id: '14443123L' };
			transactionPool.addBundledTransaction(transaction1);
			transactionPool.addBundledTransaction(transaction2);
			expect(transactionPool.getBundledTransactionList())
				.to.be.an('Array')
				.that.does.include(transaction1, transaction2);
			transactionPool.removeBundledTransaction(transaction1.id);
			return transactionPool.removeBundledTransaction(transaction2.id);
		});
	});

	describe('getQueuedTransactionList', () => {
		it('should be able to get queued transactions', () => {
			const transaction1 = { id: '1233123L' };
			const transaction2 = { id: '14443123L' };
			transactionPool.addQueuedTransaction(transaction1);
			transactionPool.addQueuedTransaction(transaction2);
			expect(transactionPool.getQueuedTransactionList())
				.to.be.an('Array')
				.that.does.include(transaction1, transaction2);
			transactionPool.removeQueuedTransaction(transaction1.id);
			return transactionPool.removeQueuedTransaction(transaction2.id);
		});
	});

	describe('getMultisignatureTransactionList', () => {
		it('should be able to get multisignature transactions', () => {
			const transaction1 = { id: '1233123L' };
			const transaction2 = { id: '14443123L' };
			transactionPool.addMultisignatureTransaction(transaction1);
			transactionPool.addMultisignatureTransaction(transaction2);
			expect(transactionPool.getMultisignatureTransactionList())
				.to.be.an('Array')
				.that.does.include(transaction1, transaction2);
			transactionPool.removeMultisignatureTransaction(transaction1.id);
			return transactionPool.removeMultisignatureTransaction(transaction2.id);
		});
	});

	describe('getMergedTransactionList', () => {
		it('should be able to get merged transactions', () => {
			const transaction1 = { id: '1233123L' };
			const transaction2 = { id: '14443123L' };
			const transaction3 = { id: '19921123L' };
			transactionPool.addQueuedTransaction(transaction1);
			transactionPool.addMultisignatureTransaction(transaction2);
			transactionPool.addBundledTransaction(transaction3);
			return expect(transactionPool.getMergedTransactionList())
				.to.be.an('Array')
				.that.does.include(transaction1, transaction2)
				.that.does.not.include(transaction3);
		});
	});

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
			return expect(transactionPool.countBundled()).to.not.be.an.instanceof(
				Number
			);
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
			return expect(transactionPool.countQueued()).to.not.be.an.instanceof(
				Number
			);
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
			const beforeCount = transactionPool.countMultisignature();
			transactionPool.addMultisignatureTransaction(transaction);
			expect(transactionPool.countMultisignature()).to.eql(beforeCount);
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
			return expect(
				transactionPool.countMultisignature()
			).to.not.be.an.instanceof(Number);
		});
	});

	describe('queueTransaction', () => {
		afterEach(done => {
			transactionPool.countBundled = sinon.stub().returns(0);
			done();
		});

		it('should thow error when called without any params', () => {
			return expect(() => {
				transactionPool.queueTransaction();
			}).to.throw();
		});

		it('should return transaction pool is full when bundled is greater than maxTxsPerQueue', done => {
			const transaction = {
				id: '131123423423L',
				bundled: true,
			};
			transactionPool.countBundled = sinon.stub().returns(10000);
			transactionPool.queueTransaction(transaction, res => {
				expect(res).to.deep.eql('Transaction pool is full');
				expect(transactionPool.getBundledTransaction(transaction.id)).to.be
					.undefined;
				done();
			});
		});

		describe('when transaction type is MULTI', () => {
			afterEach(done => {
				transactionPool.countMultisignature = sinon.stub().returns(0);
				transactionPool.countQueued = sinon.stub().returns(0);
				done();
			});

			it('should return error multisignature transactionPool is greater than maxTxsPerQueue', done => {
				const transaction = {
					id: '131992423L',
					bundled: false,
					type: transactionTypes.MULTI,
				};
				transactionPool.countMultisignature = sinon.stub().returns(1001);
				transactionPool.queueTransaction(transaction, res => {
					expect(res).to.deep.eql('Transaction pool is full');
					expect(transactionPool.getMultisignatureTransaction(transaction.id))
						.to.be.undefined;
					done();
				});
			});

			it('should add transaction to multisignature queue', done => {
				const transaction = {
					id: '131992423L',
					bundled: false,
					type: transactionTypes.MULTI,
				};
				transactionPool.countMultisignature = sinon.stub().returns(100);
				transactionPool.queueTransaction(transaction, res => {
					expect(res).to.be.undefined;
					expect(transactionPool.getMultisignatureTransaction(transaction.id))
						.to.be.an('object')
						.to.have.keys(['id', 'receivedAt', 'bundled', 'type'])
						.that.does.include(transaction);
					done();
				});
			});
		});

		it('should be able to add transaction to bundle', done => {
			const transaction = {
				id: '13118423423423L',
				bundled: true,
			};
			transactionPool.queueTransaction(transaction, () => {
				expect(transactionPool.getBundledTransaction(transaction.id))
					.to.be.an('object')
					.to.have.keys(['id', 'receivedAt', 'bundled'])
					.that.does.include(transaction);
				done();
			});
		});

		it('should be able to add transaction to queue', done => {
			const transaction = {
				id: '1311188423423423L',
			};
			transactionPool.queueTransaction(transaction, () => {
				expect(transactionPool.getQueuedTransaction(transaction.id))
					.to.be.an('object')
					.to.have.keys(['id', 'receivedAt'])
					.that.does.include(transaction);
				done();
			});
		});
	});

	describe('processUnconfirmedTransaction', () => {
		let processVerifyTransaction;
		beforeEach(done => {
			resetStates();
			processVerifyTransaction = TransactionPool.__get__(
				'__private.processVerifyTransaction'
			);
			transactionPool.transactionInPool = sinon.stub();
			done();
		});

		afterEach(done => {
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				processVerifyTransaction
			);
			transactionPool.transactionInPool.returns(false);
			done();
		});

		it('should return error when transaciton is already processed', done => {
			const transaction = {
				id: '1311188423423423L',
				type: transactionTypes.MULTI,
			};
			transactionPool.transactionInPool.returns(true);
			transactionPool.processUnconfirmedTransaction(transaction, true, res => {
				expect(res).to.deep.eql(
					'Transaction is already processed: 1311188423423423L'
				);
				done();
			});
		});

		it('should fail to add transaction to queue when bundled is enabled', done => {
			const transaction = {
				id: '1234L',
				type: transactionTypes.MULTI,
				bundled: true,
			};
			sinon
				.stub(transactionPool, 'queueTransaction')
				.callsArgWith(1, 'Failed to queue bundled transaction');
			transactionPool.processUnconfirmedTransaction(transaction, true, res => {
				expect(res).to.deep.eql('Failed to queue bundled transaction');
				done();
			});
		});

		it('should add transaction to queue when bundled is enabled', done => {
			const transaction = {
				id: '1234L',
				type: transactionTypes.MULTI,
				bundled: true,
			};
			transactionPool.queueTransaction.callsArgWith(1, transaction);
			transactionPool.processUnconfirmedTransaction(transaction, true, res => {
				expect(res).to.deep.eql(transaction);
				done();
			});
		});

		it('should fail to process and verify transaction', done => {
			const transaction = {
				id: '1234L',
				type: transactionTypes.MULTI,
				bundled: false,
			};

			const processVerifyTransactionStub = sinon
				.stub()
				.callsArgWith(2, 'Failed to process unconfirmed transaction');
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				processVerifyTransactionStub
			);

			transactionPool.processUnconfirmedTransaction(transaction, true, res => {
				expect(res).to.deep.eql('Failed to process unconfirmed transaction');
				done();
			});
		});

		it('should process and verify transaction', done => {
			const transaction = {
				id: '1235674L',
				type: transactionTypes.MULTI,
				bundled: false,
			};

			const processVerifyTransactionStub = sinon
				.stub()
				.callsArgWith(2, transaction);
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				processVerifyTransactionStub
			);
			transactionPool.processUnconfirmedTransaction(transaction, true, res => {
				expect(res.id).to.deep.eql(transaction.id);
				done();
			});
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
			transactionPool.processUnconfirmedTransaction = sinon
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
			transactionPool.processUnconfirmedTransaction = sinon
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
			transactionPool.queueTransaction.callsArgWith(
				1,
				'Failed to queue bundled transaction'
			);
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
			const validTransactions = [
				{ id: '123', receivedAt: new Date('2018-03-06') },
			];
			expireTransactions(validTransactions, [], (err, res) => {
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

	describe('fillPool', () => {
		beforeEach(() => {
			return resetStates();
		});

		it('should return countUnconfirmed is greater than maxTxsPerBlock', done => {
			const unconfirmedCount = 1001;
			loaderStub.syncing.returns(false);
			transactionPool.countUnconfirmed = sinon.stub().returns(unconfirmedCount);
			transactionPool.fillPool(res => {
				expect(res).to.be.undefined;
				expect(logger.debug.args[0][0]).to.deep.eql(
					`Transaction pool size: ${unconfirmedCount}`
				);
				done();
			});
		});

		it('should call applyUnconfirmed', done => {
			const transaction = {
				id: '103111423423423L',
				type: transactionTypes.MULTI,
			};
			transactionPool.getMultisignatureTransactionList = sinon
				.stub()
				.returns([transaction]);
			const unconfirmedCount = 0;
			transactionPool.countUnconfirmed = sinon.stub().returns(unconfirmedCount);
			let applyUnconfirmedListStub = TransactionPool.__get__(
				'__private.applyUnconfirmedList'
			);
			applyUnconfirmedListStub = sinon.stub().callsArgWith(1, null);
			TransactionPool.__set__(
				'__private.applyUnconfirmedList',
				applyUnconfirmedListStub
			);
			transactionPool.fillPool(res => {
				expect(applyUnconfirmedListStub.called).to.be.true;
				expect(applyUnconfirmedListStub.args[0][0]).to.deep.eql([transaction]);
				expect(applyUnconfirmedListStub.args[0][1]).to.be.an('function');
				expect(res).to.be.null;
				done();
			});
		});
	});

	describe('__private', () => {
		describe('applyUnconfirmedList', () => {
			let lastError;

			before(done => {
				applyUnconfirmed = TransactionPool.__get__(
					'__private.applyUnconfirmedList'
				);
				done();
			});

			it('should return immediately when transaction is null', done => {
				applyUnconfirmed([null], () => {
					expect(dummyProcessVerifyTransaction.called).to.be.false;
					done();
				});
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

		describe('transactionTimeOut', () => {
			it('should return timeout for MULTI transaction type', () => {
				const transaction = {
					id: '103111423423423L',
					type: transactionTypes.MULTI,
					asset: {
						multisignature: {
							lifetime: 10,
						},
					},
				};
				return expect(transactionTimeOut(transaction)).to.deep.eql(10 * 3600);
			});

			it('should return timeout for transaction with signatures and type not equal to MULTI', () => {
				const transaction = {
					id: '103111423423423L',
					signatures: [],
				};
				return expect(transactionTimeOut(transaction)).to.deep.eql(
					constants.unconfirmedTransactionTimeOut * 8
				);
			});

			it('should return default timeout for transaction without signatures and type not equal to MULTI', () => {
				const transaction = {
					id: '103111423423423L',
				};
				return expect(transactionTimeOut(transaction)).to.deep.eql(
					constants.unconfirmedTransactionTimeOut
				);
			});
		});

		describe('expireTransactions', () => {
			beforeEach(() => {
				transactionTimeOut = sinon.stub().returns(0);
				transactionPool.removeUnconfirmedTransaction = sinon.spy();
				return resetStates();
			});

			it('should return immediately when transactions are invalid', done => {
				expireTransactions([undefined], [], () => {
					expect(transactionTimeOut.called).to.be.false;
					done();
				});
			});

			it('should be able to add parentIds with the transaction ids', done => {
				const transactions = [
					{
						id: '10313L',
						type: transactionTypes.MULTI,
						receivedAt: new Date(new Date() - 180 * 60000),
					},
				];
				transactionTimeOut.returns(0);
				expireTransactions(transactions, ['10314L'], (err, res) => {
					expect(err).to.be.null;
					expect(res).to.be.eql(['10313L', '10314L']);
					expect(logger.info.called).to.be.true;
					expect(logger.info.args[0][0]).to.deep.eql(
						`Expired transaction: ${
							transactions[0].id
						} received at: ${transactions[0].receivedAt.toUTCString()}`
					);
					done();
				});
			});

			it('should return only parentIds', done => {
				const transactions = [
					{
						id: '10313L',
						type: transactionTypes.MULTI,
						receivedAt: new Date(),
					},
				];
				expireTransactions(transactions, ['10314L'], (err, res) => {
					expect(err).to.be.null;
					expect(res).to.be.eql(['10314L']);
					done();
				});
			});
		});
	});
});
