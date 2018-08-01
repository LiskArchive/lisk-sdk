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
const randomUtil = require('../../../common/utils/random');
const accountsFixtures = require('../../../fixtures/accounts');
const queriesHelper = require('../../common/sql/queriesHelper.js');
const localCommon = require('../common');
const Bignum = require('../../../../helpers/bignum.js');

describe('expire transaction', () => {
	let library;
	let queries;
	let memAccountsSnapshotBeforeUndo;

	const multisigAccount = randomUtil.account();
	const { expiryInterval } = __testContext.config.transactions;
	const unconfirmedTransactionTimeOut =
		global.constants.unconfirmedTransactionTimeOut;

	const getSenderAddress = transaction =>
		transaction.senderId ||
		library.modules.accounts.generateAddressByPublicKey(
			transaction.senderPublicKey
		);
	const setunconfirmedTransactionTimeOut = timeout => {
		global.constants.unconfirmedTransactionTimeOut = timeout;
	};

	const validateMemAccountSnapshot = () => {
		return queries.getAccounts().then(memAccountsSnapshotAfterUndo => {
			const beforeResult = _.sortBy(memAccountsSnapshotBeforeUndo, ['address']);
			const afterResult = _.sortBy(memAccountsSnapshotAfterUndo, ['address']);
			expect(beforeResult).to.deep.equal(afterResult);
		});
	};

	const createMultiSigTransaction = (creditTransaction, cb) => {
		let multisigTransaction;
		const signer1 = randomUtil.account();
		const signer2 = randomUtil.account();
		localCommon.addTransactionsAndForge(library, [creditTransaction], () => {
			const keysgroup = [signer1.publicKey, signer2.publicKey];

			multisigTransaction = lisk.transaction.registerMultisignature({
				passphrase: multisigAccount.passphrase,
				keysgroup,
				lifetime: 4,
				minimum: 2,
			});

			cb(null, multisigTransaction);
		});
	};

	// override transaction expiryInterval and unconfirmedTransactionTimeOut
	// to test undo unConfirmed expired transactions
	before(done => {
		__testContext.config.transactions.expiryInterval = 5000;
		setunconfirmedTransactionTimeOut(0);
		done();
	});

	after('reset states', done => {
		__testContext.config.transactions.expiryInterval = expiryInterval;
		global.constants.unconfirmedTransactionTimeOut = unconfirmedTransactionTimeOut;
		done();
	});

	localCommon.beforeBlock('lisk_functional_expire_transactions', lib => {
		library = lib;
		queries = new queriesHelper(lib, lib.db);
	});

	beforeEach('take mem accounts snapshot', () => {
		return queries.getAccounts().then(accounts => {
			memAccountsSnapshotBeforeUndo = _.cloneDeep(accounts);
		});
	});

	it('should expire transaction from unconfirmed transaction list', done => {
		const transaction = lisk.transaction.transfer({
			recipientId: randomUtil.account().address,
			amount: randomUtil.number(100000000, 1000000000),
			passphrase: accountsFixtures.genesis.passphrase,
		});

		localCommon.addTransactionToUnconfirmedQueue(library, transaction, () => {
			// Wait for transaction to get expired and
			// undo the unconfirmed transaction, so that mem accounts
			// balance is updated
			setTimeout(() => {
				validateMemAccountSnapshot()
					.then(() => {
						done();
					})
					.catch(done);
			}, 3000);
		});
	});

	it('should expire transaction from multi-signature transaction list', done => {
		const amount = 1000 * global.constants.normalizer;

		const creditTransaction = lisk.transaction.transfer({
			amount,
			passphrase: accountsFixtures.genesis.passphrase,
			recipientId: multisigAccount.address,
		});

		createMultiSigTransaction(creditTransaction, (err, multisigTransaction) => {
			// Get sender address
			const address = getSenderAddress(multisigTransaction);

			// Get multi-signature account created as part of
			// transaction which is irreversible from mem account
			const multiSigAccount = accountsFixtures.dbAccount({
				address,
				balance: new Bignum(multisigTransaction.amount).toString(),
			});

			// Set public key if not present
			if (!multiSigAccount.publicKey) {
				multiSigAccount.publicKey = Buffer.from(
					multisigTransaction.senderPublicKey,
					'hex'
				);
			}

			// update mem account snapshot for comparision
			memAccountsSnapshotBeforeUndo.push(multiSigAccount);

			localCommon.addTransaction(library, multisigTransaction, (err, res) => {
				// Wait for transaction to get expired and
				// undo the unconfirmed transaction, so that mem accounts
				// balance is updated
				expect(err).to.be.null;
				expect(res).to.equal(multisigTransaction.id);
				setTimeout(() => {
					queries
						.getAccounts()
						.then(memAccountsSnapshotAfterUndo => {
							const beforeAccountState = memAccountsSnapshotBeforeUndo.find(
								account => account.address === address
							);
							const afterAccountState = memAccountsSnapshotAfterUndo.find(
								account => account.address === address
							);

							expect(
								new Bignum(beforeAccountState.u_balance)
									.plus(amount)
									.equals(afterAccountState.u_balance)
							).to.be.true;

							const genesisAccountBefore = memAccountsSnapshotBeforeUndo.find(
								account => account.address === accountsFixtures.genesis.address
							);
							const genesisAccountAfter = memAccountsSnapshotAfterUndo.find(
								account => account.address === accountsFixtures.genesis.address
							);

							expect(
								new Bignum(genesisAccountBefore.u_balance)
									.minus(amount)
									.minus(creditTransaction.fee)
									.equals(genesisAccountAfter.u_balance)
							).to.be.true;
							done();
						})
						.catch(done);
				}, 2000);
			});
		});
	});

	describe('unconfirmed transaction', () => {
		it('should be applied on mem accounts before transaction is expired', done => {
			// set unconfirmed transaction timeout to 10 seconds
			// to ensure the transaction is not expired for the
			// next 10 seconds
			setunconfirmedTransactionTimeOut(1000);

			const amount = randomUtil.number(100000000, 1000000000);
			const transaction = lisk.transaction.transfer({
				recipientId: randomUtil.account().address,
				amount,
				passphrase: accountsFixtures.genesis.passphrase,
			});

			const address = getSenderAddress(transaction);

			localCommon.addTransactionToUnconfirmedQueue(library, transaction, () => {
				setunconfirmedTransactionTimeOut(0);
				queries
					.getAccounts()
					.then(memAccountsSnapshotAfterUndo => {
						const beforeAccountState = memAccountsSnapshotBeforeUndo.find(
							account => account.address === address
						);
						const afterAccountState = memAccountsSnapshotAfterUndo.find(
							account => account.address === address
						);
						expect(
							new Bignum(afterAccountState.u_balance)
								.plus(amount)
								.plus(transaction.fee)
								.equals(beforeAccountState.u_balance)
						).to.be.true;
						// Wait for transaction to get expired and
						// undo the unconfirmed transaction, so that mem accounts
						// balance is updated back
						setTimeout(() => {
							validateMemAccountSnapshot()
								.then(() => {
									done();
								})
								.catch(done);
						}, 5000);
					})
					.catch(err => {
						done(err);
					});
			});
		});
	});
});
