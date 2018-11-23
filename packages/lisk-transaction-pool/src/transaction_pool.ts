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

	// tslint:disable
export interface TransactionObject {
	readonly id: string;
	readonly recipientId: string;
	readonly senderPublicKey: string;
	receivedAt?: Date;
}

export interface TransactionFunctions {
	verifyTransactionAgainstOtherTransactions?(
		transaction: Transaction,
		otherTransactions: ReadonlyArray<Transaction>,
	): boolean;
}

export type Transaction = TransactionObject & TransactionFunctions;

interface Block {
	readonly transactions: ReadonlyArray<Transaction>;
}

interface Queues {
	readonly [queue: string]: Queue;
}

interface ProcessTransactionsResponse {
	readonly errors: ReadonlyArray<Error>;
	readonly invalidTransactions: ReadonlyArray<Transaction>;
	readonly validTransactions: ReadonlyArray<Transaction>;
}

type processTransactions = (
	transactions: ReadonlyArray<Transaction>,
) => ProcessTransactionsResponse;

export class TransactionPool {
	private applyTransactions: processTransactions;
	private queues: Queues;
	private validateTransactions: processTransactions;
	private verifyTransactions: processTransactions;

	public constructor(
		validateTransactions: processTransactions,
		verifyTransactions: processTransactions,
		applyTransactions: processTransactions,
	) {
		this.queues = {
			received: new Queue(),
			validated: new Queue(),
			verified: new Queue(),
			pending: new Queue(),
			ready: new Queue(),
		};
		this.validateTransactions = validateTransactions;
		this.verifyTransactions = verifyTransactions;
		this.applyTransactions = applyTransactions;
	}

	public addTransactions(transactions: ReadonlyArray<Transaction>): void {
	}

	public getProcessableTransactions(limit: number): ReadonlyArray<Transaction> {
	}

	public onDeleteBlock(block: Block): void {
	}

	public onNewBlock(block: Block): void {
	}

	public onRoundRollback(delegates: ReadonlyArray<string>): void {
	}

	public verifyTransaction(): void {
	}

	private existsInTransactionPool(transaction: Transaction): boolean {
	}

	private expireTransactions(): void {
	}

	private processVerifiedTransactions(): void {
	}

	private validateReceivedTransactions(): void {
	}

	private verifyValidatedTransactions(
		transactions: ReadonlyArray<Transaction>,
	): void {
	}
}
