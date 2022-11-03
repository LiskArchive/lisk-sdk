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
import { TransactionPool, PooledTransaction } from '@liskhq/lisk-transaction-pool';
import { dataStructures } from '@liskhq/lisk-utils';
import { Transaction, BlockHeader, BlockAssets, Event } from '@liskhq/lisk-chain';
import { address } from '@liskhq/lisk-cryptography';
import { ABI, TransactionExecutionResult, TransactionVerifyResult } from '../../abi';

export class HighFeeGenerationStrategy {
	private readonly _abi: ABI;
	private readonly _pool: TransactionPool;
	private readonly _constants: {
		readonly maxTransactionsSize: number;
	};

	public constructor({
		// Modules
		abi,
		pool,
		// constants
		maxTransactionsSize,
	}: {
		readonly abi: ABI;
		readonly pool: TransactionPool;
		readonly maxTransactionsSize: number;
	}) {
		this._abi = abi;
		this._pool = pool;
		this._constants = { maxTransactionsSize };
	}

	public async getTransactionsForBlock(
		contextID: Buffer,
		header: BlockHeader,
		assets: BlockAssets,
	): Promise<{ transactions: Transaction[]; events: Event[] }> {
		// Initialize array to select transactions
		const readyTransactions = [];

		// Get processable transactions from transaction pool
		// transactions are sorted by lowest nonce per account
		const transactionsBySender = this._pool.getProcessableTransactions();

		// Initialize block size with 0
		let blockTransactionsSize = 0;
		const feePriorityHeap = new dataStructures.MaxHeap();
		for (const transactions of transactionsBySender.values()) {
			const lowestNonceTrx = transactions[0];
			feePriorityHeap.push(lowestNonceTrx.feePriority as bigint, lowestNonceTrx);
		}

		const events = [];

		// Loop till we have last account exhausted to pick transactions
		while (transactionsBySender.size > 0) {
			// Get the transaction with highest fee and lowest nonce
			const lowestNonceHighestFeeTrx = feePriorityHeap.pop()?.value as Transaction | undefined;
			if (!lowestNonceHighestFeeTrx) {
				throw new Error('lowest nonce tx must exist');
			}
			const senderId = address.getAddressFromPublicKey(lowestNonceHighestFeeTrx.senderPublicKey);
			// Try to process transaction
			try {
				const { result: verifyResult } = await this._abi.verifyTransaction({
					contextID,
					transaction: lowestNonceHighestFeeTrx.toObject(),
					header: header.toObject(),
				});
				if (verifyResult !== TransactionVerifyResult.OK) {
					throw new Error('Transaction is not valid');
				}
				const {
					events: executedEvents,
					result: executeResult,
				} = await this._abi.executeTransaction({
					contextID,
					header: header.toObject(),
					transaction: lowestNonceHighestFeeTrx.toObject(),
					assets: assets.getAll(),
					dryRun: false,
				});
				if (executeResult === TransactionExecutionResult.INVALID) {
					this._pool.remove(lowestNonceHighestFeeTrx);
					throw new Error('Transaction is not valid');
				}
				events.push(...executedEvents.map(e => new Event(e)));
			} catch (error) {
				// If transaction can't be processed then discard all transactions
				// from that account as other transactions will be higher nonce
				transactionsBySender.delete(senderId);
				continue;
			}

			// If transaction byte size can't fit in max transactions length
			// then discard all transactions from that account as
			// other transactions will be higher nonce
			const trsByteSize = lowestNonceHighestFeeTrx.getBytes().length;
			if (blockTransactionsSize + trsByteSize > this._constants.maxTransactionsSize) {
				// End up filling the block
				break;
			}

			// Select transaction as ready for forging
			readyTransactions.push(lowestNonceHighestFeeTrx);

			// Increase block size with updated transaction size
			blockTransactionsSize += trsByteSize;

			// Remove the selected transaction from the list
			// as original array is readonly in future when we convert it to
			// typescript the `splice` will not work so why used destruction
			const [, ...choppedArray] = transactionsBySender.get(senderId) as PooledTransaction[];
			transactionsBySender.set(senderId, choppedArray);

			// If there is no transaction left in heap for that account
			// then remove that account from map
			const remainingTransactions = transactionsBySender.get(senderId);
			if (!remainingTransactions || remainingTransactions.length === 0) {
				transactionsBySender.delete(senderId);
				continue;
			}

			// Pick next lowest transaction from same account and push to fee queue
			const nextLowestNonceTransactions = transactionsBySender.get(senderId) as PooledTransaction[];
			feePriorityHeap.push(
				nextLowestNonceTransactions[0].feePriority as bigint,
				nextLowestNonceTransactions[0],
			);
		}

		return { transactions: readyTransactions, events };
	}
}
