/*
 * Copyright © 2020 Lisk Foundation
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

const { MinHeap, MaxHeap } = require('@liskhq/lisk-transaction-pool');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');

class HighFeeForgingStrategy {
	constructor({
		// components
		logger,
		// Modules
		chainModule,
		transactionPoolModule,
		// constants
		maxPayloadLength,
	}) {
		this.chainModule = chainModule;
		this.transactionPoolModule = transactionPoolModule;
		this.logger = logger;

		this.constants = { maxPayloadLength: BigInt(maxPayloadLength) };
	}

	async getTransactionsForBlock() {
		// Initialize array to select transactions
		const readyTransactions = [];

		// Initialize block size with 0
		let blockPayloadSize = BigInt(0);

		// Initialize state store which will be discarded after selection
		const stateStore = this.chainModule.newStateStore();

		// Get processable transactions from transaction pool
		const processableTransactions = this.transactionPoolModule.getProcessableTransactions();

		// Convert sender transactions to min heap by nonce
		const transactionsBySender = Object.keys(processableTransactions).reduce(
			(obj, senderId) => {
				const minHeapByNonce = new MinHeap();
				processableTransactions[senderId].forEach(t =>
					minHeapByNonce.push(t.nonce, t),
				);
				obj[senderId] = minHeapByNonce;

				return obj;
			},
			{},
		);

		// Loop till we have last account exhausted to pick transactions
		while (Object.keys(transactionsBySender).length !== 0) {
			const feePriorityHeap = new MaxHeap();

			// Prepare max heap for high fee priority for lowest nonce of all available accounts
			for (const senderId of Object.keys(transactionsBySender)) {
				const lowestNonceTrx = transactionsBySender[senderId].peek().value;
				feePriorityHeap.push(lowestNonceTrx.fee, lowestNonceTrx);
			}

			// Get the transaction with highest fee and lowest nonce
			const lowestNonceHighestFeeTrx = feePriorityHeap.pop().value;

			// Try to process transaction
			const result = await this.chainModule.processTransactionsWithStateStore(
				[lowestNonceHighestFeeTrx],
				stateStore,
			);

			// If transaction can't be processed then discard all transactions
			// from that account as other transactions will be higher nonce
			if (result.transactionsResponses[0].status !== TransactionStatus.OK) {
				delete transactionsBySender[lowestNonceHighestFeeTrx.senderId];

				// eslint-disable-next-line no-continue
				continue;
			}

			// If transaction byte size can't fit in max payload length
			// then discard all transactions from that account as
			// other transactions will be higher nonce
			const trsByteSize = BigInt(lowestNonceHighestFeeTrx.getBytes().length);
			if (blockPayloadSize + trsByteSize > this.constants.maxPayloadLength) {
				delete transactionsBySender[lowestNonceHighestFeeTrx.senderId];
				// eslint-disable-next-line no-continue
				continue;
			}

			// Select transaction, increase block size and remove that transaction from heap
			readyTransactions.push(lowestNonceHighestFeeTrx);
			blockPayloadSize += trsByteSize;
			transactionsBySender[lowestNonceHighestFeeTrx.senderId].pop();

			// If there is no transaction left in heap for that account
			// then remove that account from map
			if (transactionsBySender[lowestNonceHighestFeeTrx.senderId].count === 0) {
				delete transactionsBySender[lowestNonceHighestFeeTrx.senderId];
			}
		}

		return readyTransactions;
	}
}

module.exports = { HighFeeForgingStrategy };
