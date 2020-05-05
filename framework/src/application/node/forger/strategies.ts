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

import { MaxHeap, TransactionPool } from '@liskhq/lisk-transaction-pool';
import {
	Status as TransactionStatus,
	BaseTransaction,
} from '@liskhq/lisk-transactions';
import { Chain } from '@liskhq/lisk-chain';

export class HighFeeForgingStrategy {
	private readonly chainModule: Chain;
	private readonly transactionPoolModule: TransactionPool;
	private readonly constants: {
		readonly maxPayloadLength: number;
	};

	public constructor({
		// Modules
		chainModule,
		transactionPoolModule,
		// constants
		maxPayloadLength,
	}: {
		readonly chainModule: Chain;
		readonly transactionPoolModule: TransactionPool;
		readonly maxPayloadLength: number;
	}) {
		this.chainModule = chainModule;
		this.transactionPoolModule = transactionPoolModule;
		this.constants = { maxPayloadLength };
	}

	public async getTransactionsForBlock(): Promise<BaseTransaction[]> {
		// Initialize array to select transactions
		const readyTransactions = [];

		// Initialize state store which will be discarded after selection
		const stateStore = await this.chainModule.newStateStore();

		// Get processable transactions from transaction pool
		// transactions are sorted by lowest nonce per account
		const transactionsBySender = this.transactionPoolModule.getProcessableTransactions();

		// Initialize block size with 0
		let blockPayloadSize = 0;
		const feePriorityHeap = new MaxHeap();
		for (const senderId of Object.keys(transactionsBySender)) {
			const lowestNonceTrx = transactionsBySender[senderId][0];
			feePriorityHeap.push(
				lowestNonceTrx.feePriority as bigint,
				lowestNonceTrx,
			);
		}

		// Loop till we have last account exhausted to pick transactions
		while (Object.keys(transactionsBySender).length !== 0) {
			// Get the transaction with highest fee and lowest nonce
			const lowestNonceHighestFeeTrx = feePriorityHeap.pop()
				?.value as BaseTransaction;
			// Try to process transaction
			const result = await this.chainModule.applyTransactionsWithStateStore(
				[lowestNonceHighestFeeTrx],
				stateStore,
			);

			// If transaction can't be processed then discard all transactions
			// from that account as other transactions will be higher nonce
			if (result[0].status !== TransactionStatus.OK) {
				delete transactionsBySender[lowestNonceHighestFeeTrx.senderId];

				// eslint-disable-next-line no-continue
				continue;
			}

			// If transaction byte size can't fit in max payload length
			// then discard all transactions from that account as
			// other transactions will be higher nonce
			const trsByteSize = lowestNonceHighestFeeTrx.getBytes().length;
			if (blockPayloadSize + trsByteSize > this.constants.maxPayloadLength) {
				// End up filling the block
				break;
			}

			// Select transaction as ready for forging
			readyTransactions.push(lowestNonceHighestFeeTrx);

			// Increase block size with updated transaction size
			blockPayloadSize += trsByteSize;

			// Remove the selected transaction from the list
			// as original array is readonly in future when we convert it to
			// typescript the `splice` will not work so why used destruction
			const [, ...choppedArray] = transactionsBySender[
				lowestNonceHighestFeeTrx.senderId
			];
			transactionsBySender[lowestNonceHighestFeeTrx.senderId] = choppedArray;

			// If there is no transaction left in heap for that account
			// then remove that account from map
			if (
				transactionsBySender[lowestNonceHighestFeeTrx.senderId].length === 0
			) {
				delete transactionsBySender[lowestNonceHighestFeeTrx.senderId];

				// eslint-disable-next-line no-continue
				continue;
			}

			// Pick next lowest transaction from same account and push to fee queue
			const nextLowestNonceTransaction =
				transactionsBySender[lowestNonceHighestFeeTrx.senderId][0];
			feePriorityHeap.push(
				nextLowestNonceTransaction.feePriority as bigint,
				nextLowestNonceTransaction,
			);
		}

		return readyTransactions;
	}
}
