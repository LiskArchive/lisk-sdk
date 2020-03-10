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
		const readyTransactions = [];
		let blockPayloadSize = BigInt(0);
		const stateStore = this.chainModule.newStateStore();

		const processableTransactions = this.transactionPoolModule.getProcessableTransactions();
		const transactionsBySender = {};

		// Convert sender transactions to min heap by nonce
		for (const senderId of Object.keys(processableTransactions)) {
			const nonceHeapPerSender = new MinHeap();
			processableTransactions[senderId].forEach(t =>
				nonceHeapPerSender.push(t.nonce, t),
			);
			transactionsBySender[senderId] = nonceHeapPerSender;
		}

		while (Object.keys(transactionsBySender).length !== 0) {
			// Prepare max heap for fee priority for lowest nonce
			const feePriorityHeap = new MaxHeap();

			for (const senderId of Object.keys(transactionsBySender)) {
				const lowestNonceTrx = transactionsBySender[senderId].peek().value;
				feePriorityHeap.push(lowestNonceTrx.fee, lowestNonceTrx);
			}

			const lowestNonceHighestFeeTrx = feePriorityHeap.pop().value;
			const result = await this.chainModule.processTransactionsWithStateStore(
				[lowestNonceHighestFeeTrx],
				stateStore,
			);

			if (result.transactionsResponses[0].status !== TransactionStatus.OK) {
				delete transactionsBySender[lowestNonceHighestFeeTrx.senderId];

				// eslint-disable-next-line no-continue
				continue;
			}

			const trsByteSize = BigInt(lowestNonceHighestFeeTrx.getBytes().length);

			if (blockPayloadSize + trsByteSize > this.constants.maxPayloadLength) {
				delete transactionsBySender[lowestNonceHighestFeeTrx.senderId];
				// eslint-disable-next-line no-continue
				continue;
			}

			readyTransactions.push(lowestNonceHighestFeeTrx);
			blockPayloadSize += trsByteSize;
			transactionsBySender[lowestNonceHighestFeeTrx.senderId].pop();

			if (transactionsBySender[lowestNonceHighestFeeTrx.senderId].count === 0) {
				delete transactionsBySender[lowestNonceHighestFeeTrx.senderId];
			}
		}

		return readyTransactions;
	}
}

module.exports = { HighFeeForgingStrategy };
