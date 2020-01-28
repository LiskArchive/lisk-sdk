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

const util = require('util');
const Promise = require('bluebird');
const {
	transfer,
	utils: { convertLSKToBeddows, convertBeddowsToLSK },
} = require('@liskhq/lisk-transactions');
const random = require('../random');
const localCommon = require('../../mocha/integration/common');
const accountFixtures = require('../../fixtures/accounts');
const {
	sortTransactions,
} = require('../../../src/application/node/forger/sort');
const { getNetworkIdentifier } = require('../network_identifier');

const networkIdentifier = getNetworkIdentifier(
	global.__testContext.config.genesisBlock,
);

const addTransaction = util.promisify(localCommon.addTransaction);
const promisifyGetNextForger = util.promisify(localCommon.getNextForger);
const forge = util.promisify(localCommon.forge);
const isTransactionInPool = localCommon.transactionInPool;

const addTransactionsAndForge = util.promisify(
	localCommon.addTransactionsAndForge,
);

function createDebitTransaction(account, amount) {
	return transfer({
		networkIdentifier,
		amount: convertLSKToBeddows(amount.toString()),
		recipientId: random.account().address,
		passphrase: account.passphrase,
	});
}

function createCreditTransaction(account, amount) {
	return transfer({
		networkIdentifier,
		amount: convertLSKToBeddows(amount.toString()),
		recipientId: account.address,
		passphrase: accountFixtures.genesis.passphrase,
	});
}

const TYPE = {
	RECEIVED: createCreditTransaction, // CREDIT
	SPEND: createDebitTransaction, // DEBIT
};

const EXPECT = {
	OK: true,
	FAIL: false,
};

const formatTransaction = t => ({
	id: t.id,
	amount: BigInt(t.asset.amount).toString(),
	senderId: t.senderId,
	recipientId: t.recipientId,
});

/**
 * Blocks and Transactions Helper
 */
class BlocksTransactionsHelper {
	constructor(library) {
		this._library = library;
		this._transactions = [];

		this.txPool = this._library.modules.transactionPool;
	}

	async initAccountAndCredit({ amount, account }) {
		this._account = account || random.account();
		const transaction = createCreditTransaction(this._account, amount);
		await addTransactionsAndForge(this._library, [transaction], 0);
	}

	getAccount() {
		return this._account;
	}

	add(amount, type, expected, sender) {
		const transaction = {
			type,
			amount,
			expect: expected,
			data: type(sender || this._account, amount),
		};
		this._transactions.push(transaction);
	}

	getAllTransactions() {
		return this._transactions.map(t => t.data);
	}

	cleanTransactions() {
		this._transactions = [];
	}

	getTransactionsInLastBlock() {
		const { lastBlock } = this._library.modules.blocks;

		// We return only transaction ID, amount (in string format), sender and recipient
		return lastBlock.transactions.map(formatTransaction);
	}

	getValidSortedTransactions() {
		const validTransactions = this._transactions
			// Get only transactions marked as valid
			.filter(t => t.expect === EXPECT.OK)
			// Amounts have to be instances of BigInt for sorting
			.map(t => this._library.modules.blocks.deserializeTransaction(t.data));

		// Sort transactions the same way as they are sorted in a block
		const sortedTransactions = sortTransactions(validTransactions);

		// We return only transaction ID, amount (in string format), sender and recipient
		return sortedTransactions.map(formatTransaction);
	}

	isValidTransactionInPool() {
		return (
			this._transactions
				.filter(t => t.expect === EXPECT.OK)
				.filter(t => isTransactionInPool(this._library, t.data.id)).length > 0
		);
	}

	getTransactionsInPool() {
		// Get only transactions that exists in transaction pool
		const transactionsInPool = this._transactions
			.filter(t => isTransactionInPool(this._library, t.data.id))
			.map(t => t.data);

		// We return only transaction ID, amount (in string format), sender and recipient
		return transactionsInPool.map(formatTransaction);
	}

	async enqueueTransactions() {
		return Promise.mapSeries(this._transactions, t =>
			addTransaction(this._library, t.data),
		);
	}

	async enqueueAllTransactionsAndForge() {
		try {
			await this.enqueueTransactions();
			return await forge(this._library);
		} catch (err) {
			return err;
		}
	}

	async forge() {
		return forge(this._library);
	}

	recreateTransactions() {
		this._transactions = this._transactions.map(t => {
			t.data = t.type(this._account, t.amount);
			return t;
		});
	}

	recreateOnlyValidTransactions() {
		this._transactions = this._transactions
			.filter(t => t.expect)
			.map(t => {
				t.data = t.type(this._account, t.amount);
				return t;
			});
	}

	async createBlock() {
		const keypairs = this._library.modules.forger.getForgersKeyPairs();
		const delegate = await promisifyGetNextForger(this._library, null);

		const { lastBlock } = this._library.modules.blocks;
		const lastBlockSlot = this._library.slots.getSlotNumber(
			lastBlock.timestamp,
		);
		const keypair = keypairs[delegate];
		const timestamp = this._library.slots.getSlotTime(lastBlockSlot + 1);

		const transactions = this._transactions.map(t =>
			this._library.modules.blocks.deserializeTransaction(t.data),
		);

		const sortedTransactions = sortTransactions(transactions);

		const blockProcessorV1 = this._library.modules.processor.processors[1];
		this._block = await blockProcessorV1.create.run({
			keypair,
			timestamp,
			previousBlock: lastBlock,
			transactions: sortedTransactions,
			maxHeightPreviouslyForged: 0,
			maxHeightPrevoted: 0,
		});
	}

	async createAndProcessBlock() {
		try {
			await this.createBlock();
			await this._library.modules.processor.process(this._block);
			return undefined;
		} catch (err) {
			return err;
		}
	}

	getTotalSpending() {
		const totalSpending = this._transactions
			.filter(t => t.type === TYPE.SPEND)
			.reduce(
				(total, t) => total + BigInt(t.data.asset.amount) + BigInt(t.data.fee),
				BigInt(0),
			);
		return totalSpending.toString();
	}

	async getAccountBalance() {
		const account = await this._library.components.storage.entities.Account.getOne(
			{
				address: this._account.address,
			},
		);

		return convertBeddowsToLSK(account.balance);
	}
}

module.exports = {
	BlocksTransactionsHelper,
	TYPE,
	EXPECT,
	createCreditTransaction,
	createDebitTransaction,
};
