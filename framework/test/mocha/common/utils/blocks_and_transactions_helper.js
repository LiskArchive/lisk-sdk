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
const { transfer } = require('@liskhq/lisk-transactions');
const Bignum = require('../../../../src/modules/chain/helpers/bignum');
const random = require('../../common/utils/random');
const localCommon = require('../../integration/common');
const BlockLogic = require('../../../../src/modules/chain/logic/block');
const accountFixtures = require('../../fixtures/accounts');
const slots = require('../../../../src/modules/chain/helpers/slots');
const {
	registeredTransactions,
} = require('../../common/registered_transactions');
const InitTransaction = require('../../../../src/modules/chain/logic/init_transaction');

const initTransaction = new InitTransaction({ registeredTransactions });
const { NORMALIZER } = global.__testContext.config;
const addTransaction = util.promisify(localCommon.addTransaction);
const fillPool = util.promisify(localCommon.fillPool);
const forge = util.promisify(localCommon.forge);
const isTransactionInPool = localCommon.transactionInPool;

const addTransactionsAndForge = util.promisify(
	localCommon.addTransactionsAndForge
);

const TYPE = {
	RECEIVED: createCreditTransaction, // CREDIT
	SPEND: createDebitTransaction, // DEBIT
};

const EXPECT = {
	OK: true,
	FAIL: false,
};

function createDebitTransaction(account, amount) {
	return transfer({
		amount: new Bignum(NORMALIZER).multipliedBy(amount).toString(),
		recipientId: random.account().address,
		passphrase: account.passphrase,
	});
}

function createCreditTransaction(account, amount) {
	return transfer({
		amount: new Bignum(NORMALIZER).multipliedBy(amount).toString(),
		recipientId: account.address,
		passphrase: accountFixtures.genesis.passphrase,
	});
}

const formatTransaction = t => ({
	id: t.id,
	amount: t.amount.toFixed(),
	senderId: t.senderId,
	recipientId: t.recipientId,
});

/**
 * Blocks and Transactions Helper
 */
class BAT {
	constructor(library) {
		this._library = library;
		this._transactions = [];

		this.promisifyProcessBlock = util.promisify(
			this._library.modules.blocks.verify.processBlock
		);
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

	getTransactionsInLastBlock() {
		const lastBlock = this._library.modules.blocks.lastBlock.get();

		// We return only transaction ID, amount (in string format), sender and recipient
		return lastBlock.transactions.map(formatTransaction);
	}

	getValidSortedTransactions() {
		const validTransactions = this._transactions
			// Get only transactions marked as valid
			.filter(t => t.expect === EXPECT.OK)
			// Amounts have to be instances of Bignum for sorting
			.map(t => initTransaction.fromJson(t.data));

		// Sort transactions the same way as they are sorted in a block
		const sortedTransactions = BlockLogic.sortTransactions(validTransactions);

		// We return only transaction ID, amount (in string format), sender and recipient
		return sortedTransactions.map(formatTransaction);
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
			addTransaction(this._library, t.data)
		);
	}

	async enqueueAllTransactionsAndForge(fillPoolCalls = 1) {
		try {
			await this.enqueueTransactions();
			await Promise.mapSeries(new Array(fillPoolCalls).fill(0), () =>
				fillPool(this._library)
			);
			return await forge(this._library);
		} catch (err) {
			return err;
		}
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
		const promisifyGetNextForger = util.promisify(localCommon.getNextForger);
		const keypairs = this._library.modules.delegates.getForgersKeyPairs();
		const delegate = await promisifyGetNextForger(this._library, null);

		const lastBlock = this._library.modules.blocks.lastBlock.get();
		const lastBlockSlot = slots.getSlotNumber(lastBlock.timestamp);
		const keypair = keypairs[delegate];
		const timestamp = slots.getSlotTime(lastBlockSlot + 1);

		const transactions = this._transactions.map(t =>
			initTransaction.fromJson(t.data)
		);

		this._block = this._library.logic.block.create({
			keypair,
			timestamp,
			previousBlock: lastBlock,
			transactions,
		});
	}

	async createAndProcessBlock() {
		try {
			await this.createBlock();
			return await this.promisifyProcessBlock(this._block, true, true);
		} catch (err) {
			return err;
		}
	}

	getTotalSpending() {
		const totalSpending = this._transactions
			.filter(t => t.type === TYPE.SPEND)
			.reduce((total, t) => {
				return total.plus(t.data.amount).plus(t.data.fee);
			}, new Bignum(0));
		return totalSpending.toFixed();
	}

	async getAccountBalance() {
		const account = await this._library.components.storage.entities.Account.getOne(
			{
				address: this._account.address,
			}
		);

		return new Bignum(account.balance).dividedBy(NORMALIZER).toString();
	}
}

module.exports = {
	BAT,
	TYPE,
	EXPECT,
	createCreditTransaction,
	createDebitTransaction,
};
