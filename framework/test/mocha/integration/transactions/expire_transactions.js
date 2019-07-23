/*
 * Copyright © 2019 Lisk Foundation
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

const {
	transfer,
	registerMultisignature,
	constants: transactionConstants,
} = require('@liskhq/lisk-transactions');
const Promise = require('bluebird');
const randomUtil = require('../../common/utils/random');
const accountsFixtures = require('../../fixtures/accounts');
const QueriesHelper = require('../../common/integration/sql/queries_helper');
const localCommon = require('../common');
const Bignum = require('../../../../src/modules/chain/helpers/bignum');

const addTransactionsAndForgePromise = Promise.promisify(
	localCommon.addTransactionsAndForge
);
const addTransactionToUnconfirmedQueuePromise = Promise.promisify(
	localCommon.addTransactionToUnconfirmedQueue
);

describe('expire transactions', () => {
	let library;
	let queries;
	let transactionPool;

	const {
		EXPIRY_INTERVAL,
		UNCONFIRMED_TRANSACTION_TIME_OUT,
	} = global.constants;

	const { NORMALIZER } = global.__testContext.config;

	// Override transaction expire interval to every 1 second
	global.constants.EXPIRY_INTERVAL = 1000;
	global.constants.UNCONFIRMED_TRANSACTION_TIMEOUT = 0;

	transactionConstants.UNCONFIRMED_MULTISIG_TRANSACTION_TIMEOUT = 2;
	transactionConstants.UNCONFIRMED_TRANSACTION_TIMEOUT = 2;

	const getSenderAddress = transaction =>
		transaction.senderId ||
		library.modules.accounts.generateAddressByPublicKey(
			transaction.senderPublicKey
		);

	const createTransaction = (amount, recipientId) => {
		return transfer({
			recipientId,
			amount: amount.toString(),
			passphrase: accountsFixtures.genesis.passphrase,
		});
	};

	const transactionFilter = transaction => ({
		id: transaction.id,
		offset: 0,
		limit: 10,
	});

	const checkUnconfirmedQueue = (transaction, cb) => {
		localCommon.getUnconfirmedTransactionFromModule(
			library,
			transactionFilter(transaction),
			(err, res) => {
				expect(err).to.be.null;
				expect(res)
					.to.have.property('transactions')
					.which.is.an('Array');
				cb(res);
			}
		);
	};

	const checkMultisignatureQueue = (transaction, cb) => {
		localCommon.getMultisignatureTransactions(
			library,
			transactionFilter(transaction),
			(err, res) => {
				expect(err).to.be.null;
				expect(res)
					.to.have.property('transactions')
					.which.is.an('Array');
				cb(res);
			}
		);
	};

	localCommon.beforeBlock('expire_transactions', lib => {
		library = lib;
		transactionPool = library.rewiredModules.transactions.__get__(
			'__private.transactionPool'
		);

		// Set hourInSeconds to zero to test multi-signature transaction expiry
		transactionPool.hourInSeconds = 1;
		queries = new QueriesHelper(lib, lib.components.storage);
	});

	after('reset states', done => {
		global.constants.EXPIRY_INTERVAL = EXPIRY_INTERVAL;
		global.constants.UNCONFIRMED_TRANSACTION_TIMEOUT = UNCONFIRMED_TRANSACTION_TIME_OUT;
		done();
	});

	describe('from unconfirmed queue', () => {
		let transaction;

		const amount = randomUtil.number(100000000, 1000000000);
		const recipientId = randomUtil.account().address;

		before(async () => {
			// override unconfirmedTransactionTimeOut
			// to test undo unConfirmed expired transactions
			// setUnconfirmedTransactionTimeOut(0);

			transaction = createTransaction(amount, recipientId);
		});

		it('should be able to add transaction to unconfirmed queue', done => {
			localCommon.addTransactionToUnconfirmedQueue(
				library,
				transaction,
				async () => {
					checkUnconfirmedQueue(transaction, res => {
						expect(res.transactions.length).to.equal(1);
						expect(res.transactions[0].id).to.equal(transaction.id);
						expect(res.count).to.equal(1);
						done();
					});
				}
			);
		});

		it('once expire transaction interval has passed, the transaction should be removed from the queue', done => {
			// Expiry interval is set to 1 second
			// and unconfirmed transaction timeout is set to 0
			// so waiting 5 seconds to ensure the transaction is expired and
			// apply undo unconfirmed so the balance will be reflected
			setTimeout(() => {
				checkUnconfirmedQueue(transaction, res => {
					expect(res.transactions.length).to.equal(0);
					expect(res.count).to.equal(0);
					done();
				});
			}, 5000);
		});
	});

	describe('multi-signature', () => {
		let transaction;
		let multiSigTransaction;

		const amount = 1000 * NORMALIZER;
		const account = randomUtil.account();
		const signer1 = randomUtil.account();
		const signer2 = randomUtil.account();
		const recipientId = account.address;
		const lifetime = 1; // minimum lifetime should be >= 1

		before(() => {
			transaction = createTransaction(amount, recipientId);
			// Transfer balance to multi-signature account
			// so that multi-signature account can be registered
			return addTransactionsAndForgePromise(library, [transaction], 0);
		});

		it('should be able to add multi-signature transaction to unconfirmed queue', done => {
			const keysgroup = [signer1.publicKey, signer2.publicKey];

			multiSigTransaction = registerMultisignature({
				passphrase: account.passphrase,
				keysgroup,
				lifetime,
				minimum: 2,
			});

			addTransactionToUnconfirmedQueuePromise(library, multiSigTransaction)
				.then(() => {
					// Verify if the multi-signature transaction was added to queue
					checkMultisignatureQueue(multiSigTransaction, res => {
						expect(res.transactions.length).to.equal(1);
						expect(res.transactions[0].id).to.equal(multiSigTransaction.id);
						done();
					});
				})
				.catch(done);
		});

		it('once multi-signature transaction is expired it should be removed from queue', done => {
			// Multi-signature transaction is created with lifetime 1
			// and the timeout multiplier is set to 1
			// so the time to expiry will be 1 second
			// and extract 5 second to ensure transaction is expired and removed from queue
			const timeout = lifetime * 1 * 1000 + 5000;

			setTimeout(() => {
				// verify if the multi-signature transaction was removed from queue
				checkMultisignatureQueue(multiSigTransaction, res => {
					expect(res.transactions.length).to.equal(0);
					done();
				});
			}, timeout);
		});

		it('multi-signature account balance should exists with the balance', done => {
			const senderAddress = getSenderAddress(multiSigTransaction);

			queries
				.getAccount(senderAddress)
				.then(multiSigAccount => {
					// Multi-signature transaction was expired, however
					// the account still exists with the balance
					expect(new Bignum(multiSigAccount[0].balance).isEqualTo(amount)).to.be
						.true;
					done();
				})
				.catch(done);
		});
	});
});
