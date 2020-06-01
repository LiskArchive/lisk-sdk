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

import {
	MaxHeap,
	TransactionPool,
	PooledTransaction,
} from '@liskhq/lisk-transaction-pool';
import {
	Status as TransactionStatus,
	BaseTransaction,
} from '@liskhq/lisk-transactions';
import { Chain } from '@liskhq/lisk-chain';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

export class HighFeeForgingStrategy {
	private readonly _chainModule: Chain;
	private readonly _transactionPoolModule: TransactionPool;
	private readonly _constants: {
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
		this._chainModule = chainModule;
		this._transactionPoolModule = transactionPoolModule;
		this._constants = { maxPayloadLength };
	}

	public async getTransactionsForBlock(): Promise<BaseTransaction[]> {
		// Initialize array to select transactions
		const readyTransactions = [];

		// Initialize state store which will be discarded after selection
		const stateStore = await this._chainModule.newStateStore();

		// Get processable transactions from transaction pool
		// transactions are sorted by lowest nonce per account
		const transactionsBySender = this._transactionPoolModule.getProcessableTransactions();

		// Initialize block size with 0
		let blockPayloadSize = 0;
		const feePriorityHeap = new MaxHeap();
		for (const transactions of transactionsBySender.values()) {
			const lowestNonceTrx = transactions[0];
			feePriorityHeap.push(
				lowestNonceTrx.feePriority as bigint,
				lowestNonceTrx,
			);
		}

		// Loop till we have last account exhausted to pick transactions
		while (transactionsBySender.size > 0) {
			// Get the transaction with highest fee and lowest nonce
			const lowestNonceHighestFeeTrx = feePriorityHeap.pop()
				?.value as BaseTransaction;
			const senderId = getAddressFromPublicKey(
				lowestNonceHighestFeeTrx.senderPublicKey,
			);
			// Try to process transaction
			const result = await this._chainModule.applyTransactionsWithStateStore(
				[lowestNonceHighestFeeTrx],
				stateStore,
			);

			// If transaction can't be processed then discard all transactions
			// from that account as other transactions will be higher nonce
			if (result[0].status !== TransactionStatus.OK) {
				transactionsBySender.delete(senderId);

				// eslint-disable-next-line no-continue
				continue;
			}

			// If transaction byte size can't fit in max payload length
			// then discard all transactions from that account as
			// other transactions will be higher nonce
			const trsByteSize = lowestNonceHighestFeeTrx.getBytes().length;
			if (blockPayloadSize + trsByteSize > this._constants.maxPayloadLength) {
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
			const [, ...choppedArray] = transactionsBySender.get(
				senderId,
			) as PooledTransaction[];
			transactionsBySender.set(senderId, choppedArray);

			// If there is no transaction left in heap for that account
			// then remove that account from map
			const reaminingTransactions = transactionsBySender.get(senderId);
			if (!reaminingTransactions || reaminingTransactions.length === 0) {
				transactionsBySender.delete(senderId);
				// eslint-disable-next-line no-continue
				continue;
			}

			// Pick next lowest transaction from same account and push to fee queue
			const nextLowestNonceTransactions = transactionsBySender.get(
				senderId,
			) as PooledTransaction[];
			feePriorityHeap.push(
				nextLowestNonceTransactions[0].feePriority as bigint,
				nextLowestNonceTransactions[0],
			);
		}

		return readyTransactions;
	}
}
