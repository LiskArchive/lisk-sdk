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
	containsUniqueData(): boolean;
	verifyTransactionAgainstOtherTransactions(
		otherTransactions: ReadonlyArray<Transaction>,
	): boolean;
}

export type Transaction = TransactionObject & TransactionFunctions;

interface Queues {
	readonly [queue: string]: Queue;
}

export class TransactionPool {
	// tslint:disable-next-line variable-name
	private readonly _queues: Queues;

	public constructor() {
		this._queues = {
			received: new Queue(),
			validated: new Queue(),
			verified: new Queue(),
			pending: new Queue(),
			ready: new Queue(),
		};
	}

	public addTransactions(transactions: ReadonlyArray<Transaction>): void {
		transactions.forEach((transaction: Transaction) => {
			if (this.existsInTransactionPool(transaction)) {
				this._queues.received.enqueueOne(transaction);
			}
		});
	}

	public addVerifiedRemovedTransactions(transactions: ReadonlyArray<Transaction>): void {
		const { received, validated, ...otherQueues } = this._queues;

		// Move transactions from the verified, pending and ready queues to the validated queue where account was a receipient in the delete block
		const transactionsToAffectedAccounts = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionForRecipientId(transactions),
		);

		this._queues.validated.enqueueMany(transactionsToAffectedAccounts);
		// Add transactions to the verfied queue which were included in the deleted block
		this._queues.verified.enqueueMany(transactions);
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

	public removeConfirmedTransactions(transactions: ReadonlyArray<Transaction>): void {
		// Remove transactions in the transaction pool which were included in the new block
		this.removeTransactionsFromQueues(
			Object.keys(this._queues),
			queueCheckers.checkTransactionForId(transactions),
		);

		const { received, validated, ...otherQueues } = this._queues;
		// Remove transactions from the verified, pending and ready queues which were sent from the accounts in the new block
		const removedTransactionsBySenderPublicKeys = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionForSenderPublicKey(transactions),
		);

		// Remove all transactions from the verified, pending and ready queues if they are of a type which includes unique data and that type is included in the block
		// TODO: remove the condition for checking `containsUniqueData` exists, because it should always exist
		const blockTransactionsWithUniqueData = transactions.filter(
			(transaction: Transaction) =>
				transaction.containsUniqueData && transaction.containsUniqueData(),
		);
		const removedTransactionsByTypes = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionForTypes(blockTransactionsWithUniqueData),
		);

		// Add transactions which need to be reverified to the validated queue
		this._queues.validated.enqueueMany([
			...removedTransactionsBySenderPublicKeys,
			...removedTransactionsByTypes,
		]);
	}

	public reverifyTransactionsFromSenders(senderPublicKeys: ReadonlyArray<string>): void {
		// Move transactions from the verified, pending and ready queues to the validated queue which were sent from delegate accounts
		const { received, validated, ...otherQueues } = this._queues;
		const senderProperty: queueCheckers.TransactionFilterableKeys =
			'senderPublicKey';
		const removedTransactionsBySenderPublicKeys = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionPropertyForValues(
				senderPublicKeys,
				senderProperty,
			),
		);

		this._queues.validated.enqueueMany(removedTransactionsBySenderPublicKeys);
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

	private removeTransactionsFromQueues(
		queueNames: ReadonlyArray<string>,
		condition: (transaction: Transaction) => boolean,
	): ReadonlyArray<Transaction> {
		return queueNames
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