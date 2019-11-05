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

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const transactionsModule = require('../transactions');

const verifyBlockNotExists = async (storage, block) => {
	const isPersisted = await storage.entities.Block.isPersisted({
		id: block.id,
	});
	if (isPersisted) {
		throw new Error(`Block ${block.id} already exists`);
	}
};

const verifyPreviousBlockId = (block, lastBlock, genesisBlock) => {
	const isGenesisBlock =
		block.id === genesisBlock.id &&
		!block.previousBlockId &&
		block.height === 1;

	const isConsecutiveBlock =
		lastBlock.height + 1 === block.height &&
		block.previousBlockId === lastBlock.id;

	if (!isGenesisBlock && !isConsecutiveBlock) {
		throw new Error('Invalid previous block');
	}
};

class BlocksVerify {
	constructor({ storage, exceptions, slots, genesisBlock }) {
		this.storage = storage;
		this.slots = slots;
		this.exceptions = exceptions;
		this.genesisBlock = genesisBlock;
	}

	async checkExists(block) {
		const isPersisted = await this.storage.entities.Block.isPersisted({
			id: block.id,
		});
		if (isPersisted) {
			throw new Error(`Block ${block.id} already exists`);
		}
		if (!block.transactions.length) {
			return;
		}
		const persistedTransactions = await this.storage.entities.Transaction.get({
			id_in: block.transactions.map(transaction => transaction.id),
		});

		if (persistedTransactions.length > 0) {
			throw new Error(
				`Transaction is already confirmed: ${persistedTransactions[0].id}`,
			);
		}
	}

	async checkTransactions(blockInstance, stateStore) {
		const { version, height, timestamp, transactions } = blockInstance;
		if (transactions.length === 0) {
			return;
		}
		const context = {
			blockVersion: version,
			blockHeight: height,
			blockTimestamp: timestamp,
		};

		const nonInertTransactions = transactions.filter(
			transaction =>
				!transactionsModule.checkIfTransactionIsInert(
					transaction,
					this.exceptions,
				),
		);

		const nonAllowedTxResponses = transactionsModule
			.checkAllowedTransactions(context)(nonInertTransactions)
			.transactionsResponses.find(
				transactionResponse =>
					transactionResponse.status !== TransactionStatus.OK,
			);

		if (nonAllowedTxResponses) {
			throw nonAllowedTxResponses.errors;
		}

		const {
			transactionsResponses,
		} = await transactionsModule.verifyTransactions(
			this.slots,
			this.exceptions,
		)(nonInertTransactions, stateStore);

		const unverifiableTransactionsResponse = transactionsResponses.filter(
			transactionResponse =>
				transactionResponse.status !== TransactionStatus.OK,
		);

		if (unverifiableTransactionsResponse.length > 0) {
			throw unverifiableTransactionsResponse[0].errors;
		}
	}

	matchGenesisBlock(block) {
		return (
			block.id === this.genesisBlock.id &&
			block.payloadHash.toString('hex') === this.genesisBlock.payloadHash &&
			block.blockSignature.toString('hex') === this.genesisBlock.blockSignature
		);
	}
}

module.exports = {
	BlocksVerify,
	verifyPreviousBlockId,
	verifyBlockNotExists,
};
