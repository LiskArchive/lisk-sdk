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
	constants: transactionConstants,
} = require('@liskhq/lisk-transactions');
const randomUtil = require('../../../utils/random');
const accountsFixtures = require('../../../fixtures/accounts');
const localCommon = require('../common');
const { getNetworkIdentifier } = require('../../../utils/network_identifier');

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

describe('expire transactions', () => {
	let library;
	let transactionPool;

	const {
		EXPIRY_INTERVAL,
		UNCONFIRMED_TRANSACTION_TIME_OUT,
	} = global.constants;

	// Override transaction expire interval to every 1 second
	global.constants.EXPIRY_INTERVAL = 1000;
	global.constants.UNCONFIRMED_TRANSACTION_TIMEOUT = 0;

	transactionConstants.UNCONFIRMED_MULTISIG_TRANSACTION_TIMEOUT = 2;
	transactionConstants.UNCONFIRMED_TRANSACTION_TIMEOUT = 2;

	const createTransaction = (amount, recipientId) => {
		return transfer({
			networkIdentifier,
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
			},
		);
	};

	localCommon.beforeBlock('expire_transactions', lib => {
		library = lib;
		transactionPool = library.modules.transactionPool;

		// Set hourInSeconds to zero to test multi-signature transaction expiry
		transactionPool.pool._expireTransactionsInterval = 1;
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
				},
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
			}, 30000);
		});
	});
});
