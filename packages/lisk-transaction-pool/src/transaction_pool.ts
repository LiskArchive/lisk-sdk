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
 *
 */
import { Queue } from './queue';
import * as queueCheckers from './queue_checkers';

export interface TransactionObject {
	readonly id: string;
	receivedAt?: Date;
	readonly recipientId: string;
	readonly senderPublicKey: string;
	readonly type: number;
}

export interface TransactionFunctions {
	containsUniqueData?(): boolean;
	verifyTransactionAgainstOtherTransactions?(
		otherTransactions: ReadonlyArray<Transaction>,
	): boolean;
}

interface TransactionPoolOptions {
	readonly MULTISIGNATURE_TIMEOUT: number;
	readonly TRANSACTION_TIMEOUT: number;
}

export type Transaction = TransactionObject & TransactionFunctions;

interface Block {
	readonly transactions: ReadonlyArray<Transaction>;
}

interface Queues {
	readonly [queue: string]: Queue;
}

export class TransactionPool {
	// tslint:disable-next-line variable-name
	private readonly _queues: Queues;
	private readonly MULTISIGNATURE_TIMEOUT: number;
	private readonly TRANSACTION_TIMEOUT: number;

	public constructor({TRANSACTION_TIMEOUT, MULTISIGNATURE_TIMEOUT}: TransactionPoolOptions) {
		this._queues = {
			received: new Queue(),
			validated: new Queue(),
			verified: new Queue(),
			pending: new Queue(),
			ready: new Queue(),
		};
		this.TRANSACTION_TIMEOUT = TRANSACTION_TIMEOUT;
		this.MULTISIGNATURE_TIMEOUT = MULTISIGNATURE_TIMEOUT;

		// TODO: move this call to it's job, doing it here to stop linting errors
		this.expireTransactions();
	}

	public addTransactions(transactions: ReadonlyArray<Transaction>): void {
		transactions.forEach((transaction: Transaction) => {
			if (this.existsInTransactionPool(transaction)) {
				this._queues.received.enqueueOne(transaction);
			}
		});
	}

	public existsInTransactionPool(transaction: Transaction): boolean {
		return Object.keys(this._queues).reduce(
			(previousValue, currentValue) =>
				previousValue || this._queues[currentValue].exists(transaction),
			false,
		);
	}

	public get queues(): Queues {
		return this._queues;
	}

	public getProcessableTransactions(limit: number): ReadonlyArray<Transaction> {
		return this._queues.ready.dequeueUntil(
			queueCheckers.returnTrueUntilLimit(limit),
		);
	}

	public onDeleteBlock(block: Block): void {
		const { received, validated, ...otherQueues } = this._queues;

		// Move transactions from the verified, pending and ready queues to the validated queue where account was a receipient in the delete block
		const transactionsToAffectedAccounts = this.removeTransactionsFromQueues(
			otherQueues,
			queueCheckers.checkTransactionForRecipientId(block.transactions),
		);

		this._queues.validated.enqueueMany(transactionsToAffectedAccounts);
		// Add transactions to the verfied queue which were included in the deleted block
		this._queues.verified.enqueueMany(block.transactions);
	}

	public onNewBlock(block: Block): void {
		// Remove transactions in the transaction pool which were included in the new block
		this.removeTransactionsFromQueues(
			this._queues,
			queueCheckers.checkTransactionForId(block.transactions),
		);

		const { received, validated, ...otherQueues } = this._queues;
		// Remove transactions from the verified, pending and ready queues which were sent from the accounts in the new block
		const transactionsFromAffectedAccounts = this.removeTransactionsFromQueues(
			otherQueues,
			queueCheckers.checkTransactionForSenderPublicKey(block.transactions),
		);

		// Remove all transactions from the verified, pending and ready queues if they are of a type which includes unique data and that type is included in the block
		// TODO: remove the condition for checking `containsUniqueData` exists, because it should always exist
		const blockTransactionsWithUniqueData = block.transactions.filter(
			(transaction: Transaction) =>
				transaction.containsUniqueData && transaction.containsUniqueData(),
		);
		const transactionsOfTypesWithUniqueData = this.removeTransactionsFromQueues(
			otherQueues,
			queueCheckers.checkTransactionForTypes(blockTransactionsWithUniqueData),
		);

		// Add transactions which need to be reverified to the validated queue
		this._queues.validated.enqueueMany([
			...transactionsFromAffectedAccounts,
			...transactionsOfTypesWithUniqueData,
		]);
	}

	public onRoundRollback(delegates: ReadonlyArray<string>): void {
		// Move transactions from the verified, pending and ready queues to the validated queue which were sent from delegate accounts
		const { received, validated, ...otherQueues } = this._queues;
		const senderProperty: queueCheckers.transactionFilterableKeys =
			'senderPublicKey';
		const transactionsFromAffectedAccounts = this.removeTransactionsFromQueues(
			otherQueues,
			queueCheckers.checkTransactionPropertyForValues(
				delegates,
				senderProperty,
			),
		);

		this._queues.validated.enqueueMany(transactionsFromAffectedAccounts);
	}

	public validateTransactionAgainstTransactionsInPool(
		transaction: Transaction,
	): boolean {
		// TODO: remove the condition for checking `verifyTransactionAgainstOtherTransactions` exists, because it should always exist
		return transaction.verifyTransactionAgainstOtherTransactions
			? transaction.verifyTransactionAgainstOtherTransactions([
					...this.queues.ready.transactions,
					...this.queues.pending.transactions,
					...this.queues.verified.transactions,
			  ])
			: true;
	}

	private expireTransactions(): void {
		const {
			pending,
			...otherQueues
		} = this._queues;
		this.removeTransactionsFromQueues(otherQueues, queueCheckers.checkTransactionForExpiry(this.TRANSACTION_TIMEOUT));
		this.removeTransactionsFromQueues({ pending }, queueCheckers.checkTransactionForExpiry(this.MULTISIGNATURE_TIMEOUT));
	}

	private removeTransactionsFromQueues(
		queues: Queues,
		condition: (transaction: Transaction) => boolean,
	): ReadonlyArray<Transaction> {
		return Object.keys(queues)
			.map(queueName => this._queues[queueName].removeFor(condition))
			.reduce(
				(
					transactionsAccumelatedFromQueues: ReadonlyArray<Transaction>,
					transactionsFromCurrentQueue: ReadonlyArray<Transaction>,
				) =>
					transactionsAccumelatedFromQueues.concat(
						transactionsFromCurrentQueue,
					),
				[],
			);
	}
}