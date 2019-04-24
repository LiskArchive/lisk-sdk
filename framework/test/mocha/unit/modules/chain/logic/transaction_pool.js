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
// Load config file - global (one from test directory)
const Sequence = require('../../../../../../src/modules/chain/helpers/sequence');

// Instantiate test subject
const TransactionPool = rewire(
	'../../../../../../src/modules/chain/logic/transaction_pool'
);

// Create fresh instance of jobsQueue
const jobsQueue = rewire(
	'../../../../../../src/modules/chain/helpers/jobs_queue'
);
const { TRANSACTION_TYPES, UNCONFIRMED_TRANSACTION_TIMEOUT } = global.constants;
const config = __testContext.config;

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
	let balancesSequence;
	const _processVerifyTransaction = TransactionPool.__get__(
		'__private.processVerifyTransaction'
	);
	const freshListState = { transactions: [], index: {} };

	// Init fake logger
	const logger = {
		trace: sinonSandbox.spy(),
		debug: sinonSandbox.spy(),
		info: sinonSandbox.spy(),
		log: sinonSandbox.spy(),
		warn: sinonSandbox.spy(),
		error: sinonSandbox.spy(),
	};

	const accountsStub = {
		setAccountAndGet: sinonSandbox.stub(),
		getAccount: sinonSandbox.stub(),
	};

	const transactionsStub = {
		undoUnconfirmed: sinonSandbox.spy(),
		applyUnconfirmed: sinonSandbox.spy(),
	};

	const loaderStub = {
		syncing: sinonSandbox.stub().returns(false),
	};

	const transactionStub = {
		process: sinonSandbox.stub().callsArgWith(3, null),
		objectNormalize: sinonSandbox.stub(),
		verify: sinonSandbox.stub().callsArgWith(4, null),
	};

	const busSpy = {
		message: sinonSandbox.spy(),
	};

	const removeQueuedTransactionSpy = sinonSandbox.spy(
		TransactionPool.prototype,
		'removeQueuedTransaction'
	);

	const removeMultisignatureTransactionSpy = sinonSandbox.spy(
		TransactionPool.prototype,
		'removeMultisignatureTransaction'
	);

	const resetStates = function() {
		transactionPool.unconfirmed = _.cloneDeep(freshListState);
		transactionPool.bundled = _.cloneDeep(freshListState);
		transactionPool.queued = _.cloneDeep(freshListState);
		transactionPool.multisignature = _.cloneDeep(freshListState);
		logger.trace.resetHistory();
		logger.debug.resetHistory();
		logger.info.resetHistory();
		logger.log.resetHistory();
		logger.warn.resetHistory();
		logger.error.resetHistory();

		dummyProcessVerifyTransaction = sinonSandbox.spy(
			(transaction, broadcast, cb) => cb()
		);
		TransactionPool.__set__(
			'__private.processVerifyTransaction',
			dummyProcessVerifyTransaction
		);
		dummyApplyUnconfirmed = sinonSandbox.spy((transaction, sender, cb) => cb());
		TransactionPool.__set__(
			'modules.transactions.applyUnconfirmed',
			dummyApplyUnconfirmed
		);
		dummyUndoUnconfirmed = sinonSandbox.spy((transaction, cb) => cb());
		TransactionPool.__set__(
			'modules.transactions.undoUnconfirmed',
			dummyUndoUnconfirmed
		);

		removeQueuedTransactionSpy.resetHistory();
		removeMultisignatureTransactionSpy.resetHistory();
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
			transactionStub, // transaction
			busSpy, // bus
			logger, // logger
			balancesSequence,
			config
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
			it('unconfirmed should be initialized', async () =>
				expect(transactionPool.unconfirmed).to.deep.equal(freshListState));

			it('bundled should be initialized', async () =>
				expect(transactionPool.bundled).to.deep.equal(freshListState));

			it('queued should be initialized', async () =>
				expect(transactionPool.queued).to.deep.equal(freshListState));

			it('multisignature should be initialized', async () =>
				expect(transactionPool.multisignature).to.deep.equal(freshListState));
		});

		after(resetStates);
	});

	describe('bind', () => {
		describe('modules', () => {
			it('should assign accounts, transactions, loader', async () => {
				const modules = TransactionPool.__get__('modules');
				return expect(modules).to.eql({
					accounts: accountsStub,
					transactions: transactionsStub,
					loader: loaderStub,
				});
			});
		});

		describe('jobsQueue', () => {
			it('should register transactionPoolNextBundle with bundledInterval', async () => {
				expect(Object.keys(jobsQueue.jobs))
					.to.be.an('array')
					.and.lengthOf(2);
				expect(jobsQueue.jobs).to.have.any.key('transactionPoolNextBundle');
				return expect(
					jobsQueue.jobs.transactionPoolNextBundle._idleTimeout
				).to.equal(transactionPool.bundledInterval);
			});

			it('should register transactionPoolNextExpiry with expiryInterval', async () => {
				expect(Object.keys(jobsQueue.jobs))
					.to.be.an('array')
					.and.lengthOf(2);
				expect(jobsQueue.jobs).to.have.any.key('transactionPoolNextExpiry');
				return expect(
					jobsQueue.jobs.transactionPoolNextExpiry._idleTimeout
				).to.equal(transactionPool.expiryInterval);
			});
		});
	});

	describe('expireTransactions', () => {
		const receivedAt = new Date(new Date() - 1300 * 60000);
		const unconfirmedTx = { id: 'unconfirmedTx', receivedAt };
		const unconfirmedTx2 = { id: 'unconfirmedTx2', receivedAt: new Date() };
		const multiSigTx = { id: 'multiSigTx', receivedAt };
		const queuedTx = { id: 'queuedTx', receivedAt };

		before(done => {
			transactionPool.addUnconfirmedTransaction(unconfirmedTx);
			transactionPool.addUnconfirmedTransaction(unconfirmedTx2);
			transactionPool.addMultisignatureTransaction(multiSigTx);
			transactionPool.addQueuedTransaction(queuedTx);
			done();
		});

		it('should expire all the transaction', done => {
			expect(transactionPool.countUnconfirmed()).to.deep.equal(2);
			expect(transactionPool.countQueued()).to.deep.equal(1);
			expect(transactionPool.countMultisignature()).to.deep.equal(1);

			transactionPool.expireTransactions(() => {
				expect(transactionPool.countUnconfirmed()).to.deep.equal(1);
				expect(transactionPool.countQueued()).to.deep.equal(0);
				expect(transactionPool.countMultisignature()).to.deep.equal(0);
				done();
			});
		});
	});

	describe('transactionInPool', () => {
		afterEach(() => resetStates());

		describe('when transaction is in pool', () => {
			const validTransaction = '123';

			describe('unconfirmed list', () => {
				describe('with index 0', () => {
					it('should return true', async () => {
						transactionPool.unconfirmed.index[validTransaction] = 0;
						return expect(
							transactionPool.transactionInPool(validTransaction)
						).to.equal(true);
					});
				});

				describe('with other index', () => {
					it('should return true', async () => {
						transactionPool.unconfirmed.index[validTransaction] = 1;
						return expect(
							transactionPool.transactionInPool(validTransaction)
						).to.equal(true);
					});
				});
			});

			describe('bundled list', () => {
				describe('with index 0', () => {
					it('should return true', async () => {
						transactionPool.bundled.index[validTransaction] = 0;
						return expect(
							transactionPool.transactionInPool(validTransaction)
						).to.equal(true);
					});
				});

				describe('with other index', () => {
					it('should return true', async () => {
						transactionPool.bundled.index[validTransaction] = 1;
						return expect(
							transactionPool.transactionInPool(validTransaction)
						).to.equal(true);
					});
				});
			});

			describe('queued list', () => {
				describe('with index 0', () => {
					it('should return true', async () => {
						transactionPool.queued.index[validTransaction] = 0;
						return expect(
							transactionPool.transactionInPool(validTransaction)
						).to.equal(true);
					});
				});

				describe('with other index', () => {
					it('should return true', async () => {
						transactionPool.queued.index[validTransaction] = 1;
						return expect(
							transactionPool.transactionInPool(validTransaction)
						).to.equal(true);
					});
				});
			});

			describe('multisignature list', () => {
				describe('with index 0', () => {
					it('should return true', async () => {
						transactionPool.multisignature.index[validTransaction] = 0;
						return expect(
							transactionPool.transactionInPool(validTransaction)
						).to.equal(true);
					});
				});

				describe('with other index', () => {
					it('should return true', async () => {
						transactionPool.multisignature.index[validTransaction] = 1;
						return expect(
							transactionPool.transactionInPool(validTransaction)
						).to.equal(true);
					});
				});
			});
		});

		describe('when transaction is not in pool', () => {
			it('should return false', async () =>
				expect(transactionPool.transactionInPool('123')).to.equal(false));
		});
	});

	describe('getUnconfirmedTransaction', () => {
		const validTransaction = { id: '123' };
		beforeEach(done => {
			transactionPool.addUnconfirmedTransaction(validTransaction);
			done();
		});

		it('should return undefined for invalid transaction id', async () =>
			expect(transactionPool.getUnconfirmedTransaction('^&&^')).to.eql(
				undefined
			));

		it('should return transactions for valid transaction id', async () =>
			expect(transactionPool.getUnconfirmedTransaction('123')).to.eql(
				validTransaction
			));
	});

	describe('getBundledTransaction', () => {
		const validTransaction = { id: '123' };
		beforeEach(() => transactionPool.addBundledTransaction(validTransaction));

		it('should return undefined for invalid transaction id', async () =>
			expect(transactionPool.getBundledTransaction('^&&^')).to.eql(undefined));

		it('should return transactions for valid transaction id', async () =>
			expect(transactionPool.getBundledTransaction('123')).to.eql(
				validTransaction
			));
	});

	describe('getQueuedTransaction', () => {
		const validTransaction = { id: '123' };
		beforeEach(() => transactionPool.addQueuedTransaction(validTransaction));

		it('should return undefined if transaction does not exists', async () =>
			expect(transactionPool.getQueuedTransaction('12')).to.eql(undefined));

		it('should return queued transactions', async () =>
			expect(transactionPool.getQueuedTransaction('123')).to.eql(
				validTransaction
			));
	});

	describe('getMultisignatureTransaction', () => {
		const validTransaction = { id: '123' };
		beforeEach(() =>
			transactionPool.addMultisignatureTransaction(validTransaction)
		);

		it('should return undefined if transaction does not exists', async () =>
			expect(transactionPool.getMultisignatureTransaction('12')).to.eql(
				undefined
			));

		it('should return queued transactions', async () =>
			expect(transactionPool.getMultisignatureTransaction('123')).to.eql(
				validTransaction
			));
	});

	describe('getUnconfirmedTransactionList', () => {
		const validTransaction = { id: '123' };
		beforeEach(() =>
			transactionPool.addMultisignatureTransaction(validTransaction)
		);

		it('should return undefined if transaction does not exists', async () =>
			expect(transactionPool.getMultisignatureTransaction('12')).to.eql(
				undefined
			));

		it('should return queued transactions', async () =>
			expect(transactionPool.getMultisignatureTransaction('123')).to.eql(
				validTransaction
			));
	});

	describe('getBundledTransactionList', () => {
		it('should get list of transactions', async () => {
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
		it('should get queued transactions', async () => {
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
		it('should get multisignature transactions', async () => {
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
		it('should get merged transactions', async () => {
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
		const unconfirmedTransaction = { id: '1123' };
		const unconfirmedTransaction2 = {
			id: '104568989234234L',
			type: TRANSACTION_TYPES.MULTI,
		};
		before(done => {
			transactionPool.addUnconfirmedTransaction(unconfirmedTransaction);
			transactionPool.addUnconfirmedTransaction(unconfirmedTransaction2);
			done();
		});
		it('should add unconfirmed transaction if not exists', async () =>
			expect(transactionPool.unconfirmed.transactions).that.does.include(
				unconfirmedTransaction
			));

		it('should remove multi transaction type and add unconfirmed transaction if not exists', async () =>
			expect(transactionPool.unconfirmed.transactions).that.does.include(
				unconfirmedTransaction
			));
	});

	describe('removeUnconfirmedTransaction', () => {
		const unconfirmedTransaction = {
			id: '104568989234234L',
			type: TRANSACTION_TYPES.MULTI,
		};
		beforeEach(done => {
			transactionPool.addUnconfirmedTransaction(unconfirmedTransaction);
			done();
		});

		it('should remove unconfirmed transactions', async () => {
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
		it('should return count of unconfirmed transaction exists in pool', async () =>
			expect(transactionPool.countUnconfirmed()).to.deep.equal(2));

		it('should return the count of unconfirmed transaction exists in pool after removal', async () => {
			transactionPool.removeUnconfirmedTransaction('123');
			expect(transactionPool.countUnconfirmed()).to.deep.equal(1);
			transactionPool.removeUnconfirmedTransaction('1123');
			return expect(transactionPool.countUnconfirmed()).to.deep.equal(0);
		});
	});

	describe('addBundledTransaction', () => {
		it('should add bundled transaction if not exists', async () => {
			const bundledTransaction = { id: '3423423423L' };
			transactionPool.addBundledTransaction(bundledTransaction);
			return expect(transactionPool.bundled.transactions).that.does.include(
				bundledTransaction
			);
		});
	});

	describe('removeBundledTransaction', () => {
		it('should remove bundled transaction if exists', async () => {
			const bundledTransaction = { id: '3423423423L' };
			transactionPool.removeBundledTransaction(bundledTransaction.id);
			return expect(transactionPool.bundled.transactions).that.does.not.include(
				bundledTransaction
			);
		});
	});

	describe('countBundled', () => {
		it('should return count of bundled transaction exists in pool', async () =>
			expect(transactionPool.countBundled()).to.not.be.an.instanceof(Number));
	});

	describe('addQueuedTransaction', () => {
		it('should add transaction to queue', async () => {
			const transaction = { id: '103111423423423' };
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
		it('should remove transaction to queue', async () => {
			const transaction = { id: '103111423423423' };

			transactionPool.addQueuedTransaction(transaction);
			transactionPool.removeQueuedTransaction(transaction.id);

			return expect(transactionPool.queued.transactions)
				.to.be.an('array')
				.that.does.not.include(transaction);
		});
	});

	describe('countQueued', () => {
		it('should return count of queued transaction exists in pool', async () =>
			expect(transactionPool.countQueued()).to.not.be.an.instanceof(Number));
	});

	describe('addMultisignatureTransaction', () => {
		it('should add multi transaction', async () => {
			const transaction = {
				id: '103111423423423',
				type: TRANSACTION_TYPES.MULTI,
			};
			expect(transactionPool.multisignature.transactions)
				.to.be.an('array')
				.that.does.not.include(transaction);

			transactionPool.addMultisignatureTransaction(transaction);

			return expect(transactionPool.multisignature.transactions)
				.to.be.an('array')
				.that.does.include(transaction);
		});

		it('should not add existing multi transaction', async () => {
			const transaction = {
				id: '1043111423423423L',
				type: TRANSACTION_TYPES.MULTI,
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
		it('should remove multi transaction', async () => {
			const transaction = {
				id: '10431411423423423L',
				type: TRANSACTION_TYPES.MULTI,
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
		it('should return count of multi signature transaction exists', async () =>
			expect(transactionPool.countMultisignature()).to.not.be.an.instanceof(
				Number
			));
	});

	describe('queueTransaction', () => {
		afterEach(done => {
			transactionPool.countBundled = sinonSandbox.stub().returns(0);
			done();
		});

		it('should thow error when called without any params', async () =>
			expect(() => {
				transactionPool.queueTransaction();
			}).to.throw());

		it('should return transaction pool is full when bundled is greater than maxTransactionsPerQueue', done => {
			const transaction = {
				id: '131123423423L',
				bundled: true,
			};
			transactionPool.countBundled = sinonSandbox.stub().returns(10000);
			transactionPool.queueTransaction(transaction, null, res => {
				expect(res).to.deep.equal('Transaction pool is full');
				expect(transactionPool.getBundledTransaction(transaction.id)).to.be
					.undefined;
				done();
			});
		});

		describe('when transaction type is MULTI', () => {
			afterEach(done => {
				transactionPool.countMultisignature = sinonSandbox.stub().returns(0);
				transactionPool.countQueued = sinonSandbox.stub().returns(0);
				done();
			});

			it('should return error multisignature transactionPool is greater than maxTransactionsPerQueue', done => {
				const transaction = {
					id: '131992423L',
					bundled: false,
					type: TRANSACTION_TYPES.MULTI,
				};
				transactionPool.countMultisignature = sinonSandbox.stub().returns(1001);
				transactionPool.queueTransaction(transaction, null, res => {
					expect(res).to.deep.equal('Transaction pool is full');
					expect(transactionPool.getMultisignatureTransaction(transaction.id))
						.to.be.undefined;
					done();
				});
			});

			it('should add transaction to multisignature queue', done => {
				const transaction = {
					id: '131992423L',
					bundled: false,
					type: TRANSACTION_TYPES.MULTI,
				};
				transactionPool.countMultisignature = sinonSandbox.stub().returns(100);
				transactionPool.queueTransaction(transaction, null, res => {
					expect(res).to.be.undefined;
					expect(transactionPool.getMultisignatureTransaction(transaction.id))
						.to.be.an('object')
						.to.have.keys(['id', 'receivedAt', 'bundled', 'type'])
						.that.does.include(transaction);
					done();
				});
			});
		});

		it('should add transaction to bundle', done => {
			const transaction = {
				id: '13118423423423L',
				bundled: true,
			};
			transactionPool.queueTransaction(transaction, null, async () => {
				expect(transactionPool.getBundledTransaction(transaction.id))
					.to.be.an('object')
					.to.have.keys(['id', 'receivedAt', 'bundled'])
					.that.does.include(transaction);
				done();
			});
		});

		it('should add transaction to queue', done => {
			const transaction = {
				id: '1311188423423423L',
			};
			transactionPool.queueTransaction(transaction, null, async () => {
				expect(transactionPool.getQueuedTransaction(transaction.id))
					.to.be.an('object')
					.to.have.keys(['id', 'receivedAt'])
					.that.does.include(transaction);
				done();
			});
		});
	});

	describe('processUnconfirmedTransaction', () => {
		let auxProcessVerifyTransaction;
		beforeEach(done => {
			resetStates();
			auxProcessVerifyTransaction = TransactionPool.__get__(
				'__private.processVerifyTransaction'
			);
			transactionPool.transactionInPool = sinonSandbox.stub();
			done();
		});

		afterEach(done => {
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				auxProcessVerifyTransaction
			);
			transactionPool.transactionInPool.returns(false);
			done();
		});

		it('should return error when transaction is already processed', done => {
			const transaction = {
				id: '1311188423423423L',
				type: TRANSACTION_TYPES.MULTI,
			};
			transactionPool.transactionInPool.returns(true);
			transactionPool.processUnconfirmedTransaction(transaction, true, res => {
				expect(res).to.deep.equal(
					'Transaction is already processed: 1311188423423423L'
				);
				done();
			});
		});

		it('should fail to add transaction to queue when bundled is enabled', done => {
			const transaction = {
				id: '1234L',
				type: TRANSACTION_TYPES.MULTI,
				bundled: true,
			};
			sinonSandbox
				.stub(transactionPool, 'queueTransaction')
				.callsArgWith(2, 'Failed to queue bundled transaction');
			transactionPool.processUnconfirmedTransaction(transaction, true, res => {
				expect(res).to.deep.equal('Failed to queue bundled transaction');
				done();
			});
		});

		it('should add transaction to queue when bundled is enabled', done => {
			const transaction = {
				id: '1234L',
				type: TRANSACTION_TYPES.MULTI,
				bundled: true,
			};
			transactionPool.queueTransaction.callsArgWith(2, transaction);
			transactionPool.processUnconfirmedTransaction(transaction, true, res => {
				expect(res).to.deep.equal(transaction);
				done();
			});
		});

		it('should fail to process and verify transaction', done => {
			const transaction = {
				id: '1234L',
				type: TRANSACTION_TYPES.MULTI,
				bundled: false,
			};

			const processVerifyTransactionStub = sinonSandbox
				.stub()
				.callsArgWith(2, 'Failed to process unconfirmed transaction');
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				processVerifyTransactionStub
			);

			transactionPool.processUnconfirmedTransaction(transaction, true, res => {
				expect(res).to.deep.equal('Failed to process unconfirmed transaction');
				done();
			});
		});

		it('should process and verify transaction', done => {
			const transaction = {
				id: '1235674L',
				type: TRANSACTION_TYPES.MULTI,
				bundled: false,
			};

			const processVerifyTransactionStub = sinonSandbox
				.stub()
				.callsArgWith(2, transaction);
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				processVerifyTransactionStub
			);
			transactionPool.processUnconfirmedTransaction(transaction, true, res => {
				expect(res.id).to.deep.equal(transaction.id);
				done();
			});
		});
	});

	describe('receiveTransactions', () => {
		it('should throw error when transaction in invalid', async () => {
			const invalidTransaction = {
				id: '10431411423423423L',
				type: TRANSACTION_TYPES.MULTI,
			};
			return expect(() => {
				transactionPool.receiveTransactions(invalidTransaction, {});
			}).to.throw();
		});

		it('should receive transaction already processed error when the transaction is processed before', done => {
			const transaction = [
				{ id: '10431411423423423L', type: TRANSACTION_TYPES.MULTI },
			];
			transactionPool.processUnconfirmedTransaction = sinonSandbox
				.stub()
				.callsArgWith(
					2,
					'Transaction is already processed: 10431411423423423L',
					null
				);

			transactionPool.receiveTransactions(transaction, {}, (err, res) => {
				expect(err).to.eql(
					'Transaction is already processed: 10431411423423423L'
				);
				expect(res).to.deep.equal(transaction);
				done();
			});
		});

		it('should add transaction to queue when bundle is enabled', done => {
			const transaction = [
				{
					id: '109249333874723L',
					type: TRANSACTION_TYPES.MULTI,
					bundled: true,
				},
			];
			transactionPool.processUnconfirmedTransaction = sinonSandbox
				.stub()
				.callsArgWith(2, null, transaction);
			transactionPool.receiveTransactions(transaction, {}, (err, res) => {
				expect(err).to.be.null;
				expect(res).to.deep.equal(transaction);
				done();
			});
		});
	});

	describe('reindexQueues', () => {
		before(done => {
			transactionPool.addBundledTransaction({ id: '12345L', bundled: true });
			transactionPool.addQueuedTransaction({ id: '126785L' });
			transactionPool.addMultisignatureTransaction({
				id: '123445L',
				type: TRANSACTION_TYPES.MULTI,
			});
			transactionPool.addUnconfirmedTransaction({ id: '129887L' });
			done();
		});

		it('should reindex previously removed/falsified transactions', async () => {
			transactionPool.removeBundledTransaction('12345L');
			transactionPool.removeQueuedTransaction('126785L');
			transactionPool.removeMultisignatureTransaction('123445L');
			transactionPool.removeUnconfirmedTransaction('129887L');
			expect(transactionPool.bundled.transactions).that.does.include(false);
			expect(transactionPool.queued.transactions).that.does.include(false);
			expect(transactionPool.multisignature.transactions).that.does.include(
				false
			);
			expect(transactionPool.unconfirmed.transactions).that.does.include(false);
			transactionPool.reindexQueues();
			expect(transactionPool.queued.transactions).that.does.not.include(false);
			expect(transactionPool.multisignature.transactions).that.does.not.include(
				false
			);
			expect(transactionPool.unconfirmed.transactions).that.does.not.include(
				false
			);
			return expect(transactionPool.bundled.transactions).that.does.not.include(
				false
			);
		});
	});

	describe('processBundled', () => {
		let auxProcessVerifyTransaction;
		beforeEach(done => {
			resetStates();
			transactionPool.addBundledTransaction({ id: '123', bundled: true });
			auxProcessVerifyTransaction = TransactionPool.__get__(
				'__private.processVerifyTransaction'
			);
			done();
		});

		afterEach(done => {
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				auxProcessVerifyTransaction
			);
			done();
		});

		it('should fail to process the bundle transaction', done => {
			const processVerifyTransactionStub = sinonSandbox
				.stub()
				.callsArgWith(2, 'Failed to process bundle transaction');
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				processVerifyTransactionStub
			);
			transactionPool.processBundled(() => {
				expect(logger.debug.args[0][0]).to.deep.equal(
					'Failed to process / verify bundled transaction: 123'
				);
				expect(logger.debug.args[0][1]).to.deep.equal(
					'Failed to process bundle transaction'
				);
				done();
			});
		});

		it('should fail to queue bundled transaction', done => {
			const processVerifyTransactionStub = sinonSandbox
				.stub()
				.callsArgWith(2, null);
			TransactionPool.__set__(
				'__private.processVerifyTransaction',
				processVerifyTransactionStub
			);
			transactionPool.queueTransaction.callsArgWith(
				2,
				'Failed to queue bundled transaction'
			);
			transactionPool.processBundled(() => {
				expect(logger.debug.args[0][0]).to.deep.equal(
					'Failed to queue bundled transaction: 123'
				);
				expect(logger.debug.args[0][1]).to.deep.equal(
					'Failed to queue bundled transaction'
				);
				done();
			});
		});

		describe('when node is syncing', () => {
			it('should not process bundled transactions', done => {
				const getBundledTransactionListStub = sinonSandbox.stub();
				const processVerifyTransactionStub = sinonSandbox.stub();
				const queueTransactionStub = sinonSandbox.stub();
				TransactionPool.__set__(
					'TransactionPool.prototype.getBundledTransactionList',
					getBundledTransactionListStub
				);
				TransactionPool.__set__(
					'__private.processVerifyTransaction',
					processVerifyTransactionStub
				);
				TransactionPool.__set__(
					'__private.queueTransaction',
					queueTransactionStub
				);
				loaderStub.syncing.returns(true);
				transactionPool.processBundled(() => {
					expect(getBundledTransactionListStub.called).to.be.false;
					expect(processVerifyTransactionStub.called).to.be.false;
					expect(queueTransactionStub.called).to.be.false;
					done();
				});
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

				it('should not return an error', async () =>
					expect(lastError).to.not.exist);

				it('should not log an error', async () =>
					expect(logger.error.called).to.be.false);

				it('should return empty ids array', async () => {
					expect(lastIds).to.be.an('array');
					return expect(lastIds.length).to.equal(0);
				});

				describe('modules.transactions.undoUnconfirmed', () => {
					it('should not be called', async () =>
						expect(dummyUndoUnconfirmed.called).to.be.false);
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

					it('should not return an error', async () =>
						expect(lastError).to.not.exist);

					it('should not log an error', async () =>
						expect(logger.error.called).to.be.false);

					it('should return valid ids array', async () => {
						expect(lastIds).to.be.an('array');
						return expect(lastIds).to.deep.equal(
							_.map(transactions, tx => tx.id)
						);
					});

					describe('modules.transactions.undoUnconfirmed', () => {
						it('should be called onece', async () =>
							expect(dummyUndoUnconfirmed.calledOnce).to.be.true);

						it('should be called with transaction as parameter', async () =>
							expect(dummyUndoUnconfirmed.args[0][0]).to.deep.equal(
								validTransaction
							));
					});

					describe('lists', () => {
						let index;

						describe('unconfirmed', () => {
							it('index should be undefined', async () => {
								index = transactionPool.unconfirmed.index[validTransaction.id];
								return expect(index).to.be.an('undefined');
							});
						});

						describe('queued', () => {
							it('index should be set', async () => {
								transactionPool.addQueuedTransaction(validTransaction);
								index = transactionPool.queued.index[validTransaction.id];
								return expect(index).to.be.a('number');
							});

							it('transaction at index should match', async () =>
								expect(
									transactionPool.queued.transactions[index]
								).to.deep.equal(validTransaction));
						});

						describe('multisignature', () => {
							it('index should be undefined', async () => {
								index =
									transactionPool.multisignature.index[validTransaction.id];
								return expect(index).to.be.an('undefined');
							});
						});
					});

					after(resetStates);
				});

				describe('that results with error on modules.transactions.undoUnconfirmed', () => {
					const badTransaction = { id: 'badTx' };
					const transactions = [badTransaction];
					const error = 'undo error';

					before(done => {
						dummyUndoUnconfirmed = sinonSandbox.spy((transaction, cb) =>
							cb(error)
						);
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

					it('should not return an error', async () =>
						expect(lastError).to.not.exist);

					it('should return valid ids array', async () => {
						expect(lastIds).to.be.an('array');
						return expect(lastIds).to.deep.equal(
							_.map(transactions, tx => tx.id)
						);
					});

					it('should log an proper error', async () => {
						expect(logger.error.calledOnce).to.be.true;
						expect(logger.error.args[0][0]).to.equal(
							`Failed to undo unconfirmed transaction: ${badTransaction.id}`
						);
						return expect(logger.error.args[0][1]).to.equal(error);
					});

					describe('modules.transactions.undoUnconfirmed', () => {
						it('should be called onece', async () =>
							expect(dummyUndoUnconfirmed.calledOnce).to.be.true);

						it('should be called with transaction as parameter', async () =>
							expect(dummyUndoUnconfirmed.args[0][0]).to.deep.equal(
								badTransaction
							));
					});

					describe('lists', () => {
						let index;

						describe('unconfirmed', () => {
							it('index should be undefined', async () => {
								index = transactionPool.unconfirmed.index[badTransaction.id];
								return expect(index).to.be.an('undefined');
							});
						});

						describe('queued', () => {
							it('index should be undefined', async () => {
								index = transactionPool.queued.index[badTransaction.id];
								return expect(index).to.be.an('undefined');
							});
						});

						describe('multisignature', () => {
							it('index should be undefined', async () => {
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

	describe('fillPool', () => {
		beforeEach(() => resetStates());

		it('should return countUnconfirmed is greater than maxTransactionsPerBlock', done => {
			const unconfirmedCount = 1001;
			loaderStub.syncing.returns(false);
			transactionPool.countUnconfirmed = sinonSandbox
				.stub()
				.returns(unconfirmedCount);
			transactionPool.fillPool(res => {
				expect(res).to.be.undefined;
				expect(logger.debug.args[0][0]).to.deep.equal(
					`Transaction pool size: ${unconfirmedCount}`
				);
				done();
			});
		});

		it('should call applyUnconfirmed', done => {
			const transaction = {
				id: '103111423423423',
				type: TRANSACTION_TYPES.MULTI,
			};
			transactionPool.getMultisignatureTransactionList = sinonSandbox
				.stub()
				.returns([transaction]);
			const unconfirmedCount = 0;
			transactionPool.countUnconfirmed = sinonSandbox
				.stub()
				.returns(unconfirmedCount);
			let applyUnconfirmedListStub = TransactionPool.__get__(
				'__private.applyUnconfirmedList'
			);
			applyUnconfirmedListStub = sinonSandbox.stub().callsArgWith(1, null);
			TransactionPool.__set__(
				'__private.applyUnconfirmedList',
				applyUnconfirmedListStub
			);
			transactionPool.fillPool(res => {
				expect(applyUnconfirmedListStub.called).to.be.true;
				expect(applyUnconfirmedListStub.args[0][0]).to.deep.equal([
					transaction,
				]);
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
				applyUnconfirmed([null], async () => {
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

					it('should not return an error', async () =>
						expect(lastError).to.not.exist);

					it('should not log an error', async () =>
						expect(logger.error.called).to.be.false);

					describe('__private.processVerifyTransaction', () => {
						it('should not be called', async () =>
							expect(dummyProcessVerifyTransaction.called).to.be.false);
					});

					describe('modules.transactions.applyUnconfirmed', () => {
						it('should not be called', async () =>
							expect(dummyApplyUnconfirmed.called).to.be.false);
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

						it('should not return an error', async () =>
							expect(lastError).to.not.exist);

						it('should not log an error', async () =>
							expect(logger.error.called).to.be.false);

						describe('__private.processVerifyTransaction', () => {
							it('should be called once', async () =>
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true);

							it('should be called with transaction as parameter', async () =>
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(
									validTransaction
								));
						});

						describe('modules.transactions.applyUnconfirmed', () => {
							it('should be called once', async () =>
								expect(dummyApplyUnconfirmed.calledOnce).to.be.true);

							it('should be called with transaction as parameter', async () =>
								expect(dummyApplyUnconfirmed.args[0][0]).to.deep.equal(
									validTransaction
								));
						});

						describe('lists', () => {
							let index;

							describe('unconfirmed', () => {
								it('index should be set', async () => {
									index =
										transactionPool.unconfirmed.index[validTransaction.id];
									return expect(index).to.be.a('number');
								});

								it('transaction at index should match', async () =>
									expect(
										transactionPool.unconfirmed.transactions[index]
									).to.deep.equal(validTransaction));
							});

							describe('queued', () => {
								it('index should be undefined', async () => {
									index = transactionPool.queued.index[validTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', async () => {
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
							dummyProcessVerifyTransaction = sinonSandbox.spy(
								(transaction, broadcast, cb) => cb(error)
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

						it('should not return an error', async () =>
							expect(lastError).to.not.exist);

						it('should log an proper error', async () => {
							expect(logger.error.calledOnce).to.be.true;
							expect(logger.error.args[0][0]).to.equal(
								`Failed to process / verify unconfirmed transaction: ${
									badTransaction.id
								}`
							);
							return expect(logger.error.args[0][1]).to.equal(error);
						});

						describe('__private.processVerifyTransaction', () => {
							it('should be called onece', async () =>
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true);

							it('should be called with transaction as parameter', async () =>
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(
									badTransaction
								));
						});

						describe('modules.transactions.applyUnconfirmed', () => {
							it('should not be called', async () =>
								expect(dummyApplyUnconfirmed.called).to.be.false);
						});

						describe('lists', () => {
							let index;

							describe('unconfirmed', () => {
								it('index should be undefined', async () => {
									index = transactionPool.unconfirmed.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('queued', () => {
								it('index should be undefined', async () => {
									index = transactionPool.queued.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', async () => {
									index =
										transactionPool.multisignature.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});
						});

						it('should call removeQueuedTransaction when failed to process', async () =>
							expect(removeQueuedTransactionSpy.callCount).to.eql(1));

						it('should call removeQueuedTransaction with the correct transactionId', async () =>
							expect(
								removeQueuedTransactionSpy.calledWith(badTransaction.id)
							).to.eql(true));

						it('should call removeMultisignatureTransaction when failed to process', async () =>
							expect(removeMultisignatureTransactionSpy.callCount).to.eql(1));

						it('should call removeMultisignatureTransaction with the correct transactionId', async () =>
							expect(
								removeMultisignatureTransactionSpy.calledWith(badTransaction.id)
							).to.eql(true));

						after(resetStates);
					});

					describe('that results with error on applyUnconfirmed', () => {
						const badTransaction = { id: 'badTx' };
						const error = 'apply error';

						before(done => {
							dummyApplyUnconfirmed = sinonSandbox.spy(
								(transaction, sender, cb) => cb(error)
							);
							TransactionPool.__set__(
								'modules.transactions.applyUnconfirmed',
								dummyApplyUnconfirmed
							);

							applyUnconfirmed([badTransaction], err => {
								lastError = err;
								done();
							});
						});

						it('should not return an error', async () =>
							expect(lastError).to.not.exist);

						it('should log an proper error', async () => {
							expect(logger.error.calledOnce).to.be.true;
							expect(logger.error.args[0][0]).to.equal(
								`Failed to apply unconfirmed transaction: ${badTransaction.id}`
							);
							return expect(logger.error.args[0][1]).to.equal(error);
						});

						describe('__private.processVerifyTransaction', () => {
							it('should be called onece', async () =>
								expect(dummyProcessVerifyTransaction.calledOnce).to.be.true);

							it('should be called with transaction as parameter', async () =>
								expect(dummyProcessVerifyTransaction.args[0][0]).to.deep.equal(
									badTransaction
								));
						});

						describe('modules.transactions.applyUnconfirmed', () => {
							it('should be called once', async () =>
								expect(dummyApplyUnconfirmed.calledOnce).to.be.true);

							it('should be called with transaction as parameter', async () =>
								expect(dummyApplyUnconfirmed.args[0][0]).to.deep.equal(
									badTransaction
								));
						});

						describe('lists', () => {
							let index;

							describe('unconfirmed', () => {
								it('index should be undefined', async () => {
									index = transactionPool.unconfirmed.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('queued', () => {
								it('index should be undefined', async () => {
									index = transactionPool.queued.index[badTransaction.id];
									return expect(index).to.be.an('undefined');
								});
							});

							describe('multisignature', () => {
								it('index should be undefined', async () => {
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
			it('should return timeout for MULTI transaction type', async () => {
				const transaction = {
					id: '103111423423423',
					type: TRANSACTION_TYPES.MULTI,
					asset: {
						multisignature: {
							lifetime: 10,
						},
					},
				};
				return expect(transactionTimeOut(transaction)).to.deep.equal(10 * 3600);
			});

			it('should return timeout for transaction with signatures and type not equal to MULTI', async () => {
				const transaction = {
					id: '103111423423423',
					signatures: [],
				};
				return expect(transactionTimeOut(transaction)).to.deep.equal(
					UNCONFIRMED_TRANSACTION_TIMEOUT * 8
				);
			});

			it('should return default timeout for transaction without signatures and type not equal to MULTI', async () => {
				const transaction = {
					id: '103111423423423',
				};
				return expect(transactionTimeOut(transaction)).to.deep.equal(
					UNCONFIRMED_TRANSACTION_TIMEOUT
				);
			});
		});

		describe('expireTransactions', () => {
			beforeEach(() => {
				transactionTimeOut = sinonSandbox.stub().returns(0);
				return resetStates();
			});

			it('should return immediately when transactions are invalid', done => {
				expireTransactions([undefined], async () => {
					expect(transactionTimeOut.called).to.be.false;
					done();
				});
			});

			it('should expire transaction and remove transactions from queue', done => {
				const transactions = [
					{
						id: '10313',
						type: TRANSACTION_TYPES.MULTI,
						receivedAt: new Date(new Date() - 180 * 60000),
					},
				];
				transactionTimeOut.returns(0);
				expireTransactions(transactions, async () => {
					expect(logger.info.called).to.be.true;
					expect(logger.info.args[0][0]).to.deep.equal(
						`Expired transaction: ${
							transactions[0].id
						} received at: ${transactions[0].receivedAt.toUTCString()}`
					);
					done();
				});
			});
		});

		describe('processVerifyTransaction', () => {
			let transaction;
			beforeEach(done => {
				transaction = {
					id: 'Tx',
					receivedAt: new Date(),
					requesterPublicKey: 123,
				};
				accountsStub.setAccountAndGet.callsArgWith(1, null, [transaction]);
				accountsStub.getAccount.callsArgWith(1, null, [transaction]);
				done();
			});

			afterEach(() =>
				transactionPool.removeUnconfirmedTransaction(transaction.id)
			);

			it('should return error when transaction is empty', done => {
				_processVerifyTransaction(null, true, err => {
					expect(err).to.deep.equal('Missing transaction');
					done();
				});
			});

			it('should return error when transaction is in unconfirmed queue', done => {
				transactionPool.addUnconfirmedTransaction(transaction);
				_processVerifyTransaction(transaction, true, err => {
					expect(err).to.deep.equal(
						'Transaction is already in unconfirmed state'
					);
					done();
				});
			});

			it('should return error when requester not found', done => {
				const sender = _.cloneDeep(transaction);
				sender.membersPublicKeys = [{ id: '23423' }];
				sender.signatures = [{ id: '11999' }];
				accountsStub.setAccountAndGet.callsArgWith(1, null, sender);
				accountsStub.getAccount.callsArgWith(1, 'Requester not found', null);
				_processVerifyTransaction(transaction, true, err => {
					expect(err).to.deep.equal('Requester not found');
					done();
				});
			});

			it('should process when requester is available', done => {
				const sender = _.cloneDeep(transaction);
				sender.membersPublicKeys = [{ id: '23423' }];
				sender.signatures = [{ id: '11999' }];
				accountsStub.setAccountAndGet.callsArgWith(1, null, sender);
				accountsStub.getAccount.callsArgWith(1, null, sender);
				_processVerifyTransaction(transaction, true, err => {
					expect(err).to.eql(null);
					done();
				});
			});

			it('should process transaction in queue', done => {
				transactionPool.addQueuedTransaction(transaction);
				_processVerifyTransaction(transaction, true, (err, sender) => {
					expect(err).to.be.null;
					expect(sender).to.deep.equal([transaction]);
					done();
				});
			});

			describe('library.logic.transaction', () => {
				it('should error when process called', done => {
					transactionStub.process = sinonSandbox
						.stub()
						.callsArgWith(3, 'error while processing');
					transactionPool.addQueuedTransaction(transaction);
					_processVerifyTransaction(transaction, true, (err, sender) => {
						expect(err).to.deep.equal('error while processing');
						expect(sender).to.deep.equal(sender);
						done();
					});
				});

				it('should error when objectNormalize called', async () => {
					transactionStub.objectNormalize.throws();
					transactionPool.addQueuedTransaction(transaction);
					return expect(() => {
						_processVerifyTransaction(transaction, true, async () => {});
					}).to.throw;
				});

				it('should error when verify called', done => {
					transactionStub.objectNormalize.returns(true);
					transactionStub.process = sinonSandbox.stub().callsArgWith(3, null);
					transactionStub.verify = sinonSandbox
						.stub()
						.callsArgWith(4, 'error while verifying');
					transactionPool.addQueuedTransaction(transaction);
					_processVerifyTransaction(transaction, true, (err, sender) => {
						expect(err).to.deep.equal('error while verifying');
						expect(sender).to.deep.equal(undefined);
						done();
					});
				});
			});
		});
	});
});
