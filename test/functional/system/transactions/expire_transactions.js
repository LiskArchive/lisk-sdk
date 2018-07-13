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

const liskElements = require('lisk-elements').default;
const randomUtil = require('../../../common/utils/random');
const accountsFixtures = require('../../../fixtures/accounts');
const Scenarios = require('../../common/scenarios');
const queriesHelper = require('../../common/sql/queriesHelper.js');
const localCommon = require('../common');
const Bignum = require('../../../../helpers/bignum.js');

const multiSig = new Scenarios.Multisig();

describe('expire transaction', () => {
	let library;
	let queries;
	let memAccountsSnapshotBeforeUndo;

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

	// override transaction expiryInterval and unconfirmedTransactionTimeOut
	// to test undo unConfirmed expired transactions
	before(done => {
		__testContext.config.transactions.expiryInterval = 5000;
		setunconfirmedTransactionTimeOut(0);
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
		const transaction = liskElements.transaction.transfer({
			recipientId: randomUtil.account().address,
			amount: randomUtil.number(100000000, 1000000000),
			passphrase: accountsFixtures.genesis.passphrase,
		});

		localCommon.addTransactionToUnconfirmedQueue(library, transaction, () => {
			// Wait for transaction to get expired and
			// undo the unconfirmed transaction, so that mem accounts
			// balance is updated
			setTimeout(done, 10000);
		});
	});

	it('should expire transaction from multi-signature transaction list', done => {
		const transaction = liskElements.transaction.registerMultisignature({
			passphrase: multiSig.account.passphrase,
			keysgroup: multiSig.keysgroup,
			lifetime: multiSig.lifetime,
			minimum: multiSig.minimum,
		});

		// Get sender address
		const address = getSenderAddress(transaction);

		// Get multi-signature account created as part of
		// transaction which is irreversible from mem account
		const multiSigAccount = accountsFixtures.dbAccount({
			address,
			balance: new Bignum(transaction.amount).toString(),
		});

		// Set public key if not present
		if (!multiSigAccount.publicKey) {
			multiSigAccount.publicKey = Buffer.from(
				transaction.senderPublicKey,
				'hex'
			);
		}

		// update mem account snapshot for comparision
		memAccountsSnapshotBeforeUndo.push(multiSigAccount);

		localCommon.addTransaction(library, transaction, () => {
			// Wait for transaction to get expired and
			// undo the unconfirmed transaction, so that mem accounts
			// balance is updated
			setTimeout(done, 1000);
		});
	});

	describe('unconfirmed transaction', () => {
		it('should be applied on mem accounts before transaction is expired', done => {
			// set unconfirmed transaction timeout to 10 seconds
			// to ensure the transaction is not expired for the
			// next 10 seconds
			setunconfirmedTransactionTimeOut(10000);

			const amount = randomUtil.number(100000000, 1000000000);
			const transaction = liskElements.transaction.transfer({
				recipientId: randomUtil.account().address,
				amount,
				passphrase: accountsFixtures.genesis.passphrase,
			});

			const address = getSenderAddress(transaction);

			localCommon.addTransactionToUnconfirmedQueue(library, transaction, () => {
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
								.equals(beforeAccountState.u_balance)
						);
						setunconfirmedTransactionTimeOut(0);
						// Wait for transaction to get expired and
						// undo the unconfirmed transaction, so that mem accounts
						// balance is updated back
						setTimeout(done, 10000);
					})
					.catch(err => {
						done(err);
					});
			});
		});
	});

	afterEach('validate mem accounts snapshot', () => {
		return queries.getAccounts().then(memAccountsSnapshotAfterUndo => {
			const beforeResult = _.sortBy(memAccountsSnapshotBeforeUndo, ['address']);
			const afterResult = _.sortBy(memAccountsSnapshotAfterUndo, ['address']);
			expect(beforeResult).to.deep.equal(afterResult);
		});
	});

	after('reset states', done => {
		__testContext.config.transactions.expiryInterval = expiryInterval;
		global.constants.unconfirmedTransactionTimeOut = unconfirmedTransactionTimeOut;
		done();
	});
});
