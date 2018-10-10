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

const lisk = require('lisk-elements').default;
const Promise = require('bluebird');
const randomUtil = require('../../common/utils/random');
const accountsFixtures = require('../../fixtures/accounts');
const queriesHelper = require('../../common/integration/sql/queriesHelper.js');
const localCommon = require('../common');
const Bignum = require('../../../helpers/bignum.js');

const addTransactionsAndForgePromise = Promise.promisify(
	localCommon.addTransactionsAndForge
);
const addTransactionToUnconfirmedQueuePromise = Promise.promisify(
	localCommon.addTransactionToUnconfirmedQueue
);

describe('expire transactions', () => {
	let library;
	let queries;

	const {
		EXPIRY_INTERVAL,
		UNCONFIRMED_TRANSACTION_TIME_OUT,
		NORMALIZER,
	} = global.constants;

	// Override transaction expire interval to every 1 second
	global.constants.EXPIRY_INTERVAL = 1000;
	global.constants.UNCONFIRMED_TRANSACTION_TIMEOUT = 0;

	const getSenderAddress = transaction =>
		transaction.senderId ||
		library.modules.accounts.generateAddressByPublicKey(
			transaction.senderPublicKey
		);

	const createTransaction = (amount, recipientId) => {
		return lisk.transaction.transfer({
			recipientId,
			amount,
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

	localCommon.beforeBlock('lisk_functional_expire_transactions', lib => {
		library = lib;
		const transactionPool = library.rewiredModules.transactions.__get__(
			'__private.transactionPool'
		);

		// Set hourInSeconds to zero to test multi-signature transaction expiry
		transactionPool.hourInSeconds = 0;
		queries = new queriesHelper(lib, lib.db);
	});

	after('reset states', done => {
		global.constants.EXPIRY_INTERVAL = EXPIRY_INTERVAL;
		global.constants.UNCONFIRMED_TRANSACTION_TIMEOUT = UNCONFIRMED_TRANSACTION_TIME_OUT;
		done();
	});

	describe('from unconfirmed queue', () => {
		let transaction;
		let address;
		let memAccountBefore;

		const amount = randomUtil.number(100000000, 1000000000);
		const recipientId = randomUtil.account().address;

		before(() => {
			// override unconfirmedTransactionTimeOut
			// to test undo unConfirmed expired transactions
			// setUnconfirmedTransactionTimeOut(0);

			transaction = createTransaction(amount, recipientId);
			address = getSenderAddress(transaction);

			return queries.getAccount(address).then(account => {
				memAccountBefore = account;
			});
		});

		it('should be able to add transaction to unconfirmed queue', done => {
			localCommon.addTransactionToUnconfirmedQueue(library, transaction, () => {
				checkUnconfirmedQueue(transaction, res => {
					expect(res.transactions.length).to.equal(1);
					expect(res.transactions[0].id).to.equal(transaction.id);
					expect(res.count).to.equal(1);
					done();
				});
			});
		});

		it('validate mem account balance and u_balance before transaction expiry', () => {
			return queries.getAccount(address).then(memAccountAfter => {
				expect(
					new Bignum(memAccountAfter[0].u_balance)
						.plus(amount)
						.plus(transaction.fee)
						.isEqualTo(memAccountBefore[0].u_balance)
				).to.be.true;

				// Balance will not be confirmed unless the block is forged
				expect(
					new Bignum(memAccountBefore[0].balance).isEqualTo(
						memAccountAfter[0].balance
					)
				).to.be.true;
			});
		});

		it('once transaction is expired the mem account u_balance should be restored @sequential', done => {
			// Expiry interval is set to 1 second
			// and unconfirmed transaction timeout is set to 0
			// so waiting 5 seconds to ensure the transaction is expired and
			// apply undo unconfirmed so the balance will be reflected
			setTimeout(() => {
				checkUnconfirmedQueue(transaction, res => {
					expect(res.transactions.length).to.equal(0);
					expect(res.count).to.equal(0);
					queries.getAccount(address).then(memAccountAfter => {
						expect(
							new Bignum(memAccountBefore[0].u_balance).isEqualTo(
								memAccountAfter[0].u_balance
							)
						).to.be.true;

						expect(
							new Bignum(memAccountBefore[0].balance).isEqualTo(
								memAccountAfter[0].balance
							)
						).to.be.true;
						done();
					});
				});
			}, 5000);
		});
	});

	describe('multi-signature', () => {
		let transaction;
		let address;
		let memAccountBefore;
		let multiSigTransaction;

		const amount = 1000 * NORMALIZER;
		const account = randomUtil.account();
		const signer1 = randomUtil.account();
		const signer2 = randomUtil.account();
		const recipientId = account.address;
		const lifetime = 1; // minimum lifetime should be >= 1

		before(() => {
			transaction = createTransaction(amount, recipientId);
			address = getSenderAddress(transaction);

			return queries.getAccount(address).then(account => {
				memAccountBefore = account;
				// Transfer balance to multi-signature account
				// so that multi-signature account can be registered
				return addTransactionsAndForgePromise(library, [transaction], 0);
			});
		});

		it('account should be transfer and updated with balance and u_balance @sequential', done => {
			queries
				.getAccount(address)
				.then(memAccountAfter => {
					expect(
						new Bignum(memAccountAfter[0].u_balance)
							.plus(amount)
							.plus(transaction.fee)
							.isEqualTo(memAccountBefore[0].u_balance)
					).to.be.true;

					expect(
						new Bignum(memAccountAfter[0].balance)
							.plus(amount)
							.plus(transaction.fee)
							.isEqualTo(memAccountBefore[0].balance)
					).to.be.true;
					done();
				})
				.catch(done);
		});

		it('should be able to add multi-signature transaction to unconfirmed queue', done => {
			const keysgroup = [signer1.publicKey, signer2.publicKey];

			multiSigTransaction = lisk.transaction.registerMultisignature({
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
			const address = getSenderAddress(multiSigTransaction);

			queries
				.getAccount(address)
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
