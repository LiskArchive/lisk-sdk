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
 *
 */

import { MinHeap } from './min_heap';
import { Transaction } from './types';

export interface TransactionListOptions {
	readonly maxSize?: number;
	readonly minReplacementFeeDifference?: bigint;
}

const DEFAULT_MAX_SIZE = 64;
export const DEFAULT_MINIMUM_REPLACEMENT_FEE_DIFFERENCE = BigInt(10);

type AddStatus =
	| { added: true; removedID?: Buffer; reason?: undefined }
	| { added: false; removedID?: Buffer; reason: string };

export class TransactionList {
	public readonly address: Buffer;

	private _processable: Array<bigint>;
	private readonly _transactions: { [nonce: string]: Transaction };
	// Value is not needed here because it is stored separately in the _transactions
	private readonly _nonceHeap: MinHeap<undefined, bigint>;
	private readonly _maxSize: number;
	private readonly _minReplacementFeeDifference: bigint;

	public constructor(address: Buffer, options?: TransactionListOptions) {
		this.address = address;
		this._transactions = {};
		this._nonceHeap = new MinHeap<undefined, bigint>();
		this._processable = [];
		this._maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
		this._minReplacementFeeDifference =
			options?.minReplacementFeeDifference ?? DEFAULT_MINIMUM_REPLACEMENT_FEE_DIFFERENCE;
	}

	public get(nonce: bigint): Transaction | undefined {
		return this._transactions[nonce.toString()];
	}

	public add(incomingTx: Transaction, processable = false): AddStatus {
		const existingTx = this._transactions[incomingTx.nonce.toString()];
		// If the same nonce already exist in the pool try to replace
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (existingTx) {
			// If the fee is lower than the original fee + replacement, reject
			if (incomingTx.fee < existingTx.fee + this._minReplacementFeeDifference) {
				return {
					added: false,
					reason: 'Incoming transaction fee is not sufficient to replace existing transaction',
				};
			}
			// Mark this and all subsequent nonce unprocessable
			this._demoteAfter(incomingTx.nonce);
			this._transactions[incomingTx.nonce.toString()] = incomingTx;

			return { added: true, removedID: existingTx.id };
		}

		const highestNonce = this._highestNonce();
		let removedID;
		if (this._nonceHeap.count >= this._maxSize) {
			// If incoming nonce is bigger than the highest nonce, then reject
			if (incomingTx.nonce > highestNonce) {
				return {
					added: false,
					reason: 'Incoming transaction exceeds maximum transaction limit per account',
				};
			}
			// If incoming nonce is lower than the highest nonce, remove the largest nonce transaction instead
			removedID = this.remove(highestNonce);
		}

		this._transactions[incomingTx.nonce.toString()] = incomingTx;
		this._nonceHeap.push(incomingTx.nonce, undefined);
		// If this transaction is processable and it is the first one in the list
		if (processable && this._processable.length === 0) {
			this._processable.push(incomingTx.nonce);
		}

		return { added: true, removedID };
	}

	public remove(nonce: bigint): Buffer | undefined {
		const removingTx = this._transactions[nonce.toString()];
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!removingTx) {
			return undefined;
		}
		delete this._transactions[nonce.toString()];
		// Recreate heap: it could remove in the middle of the heap
		const { keys } = this._nonceHeap;
		this._nonceHeap.clear();
		for (const key of keys) {
			if (key !== nonce) {
				this._nonceHeap.push(key, undefined);
			}
		}
		this._demoteAfter(nonce);

		return removingTx.id;
	}

	public promote(txs: ReadonlyArray<Transaction>): boolean {
		// Promote if only all ID are still existing and the same
		const promotingNonces = [];
		for (const tx of txs) {
			const promotingTx = this._transactions[tx.nonce.toString()];
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!promotingTx) {
				return false;
			}
			if (tx.id !== promotingTx.id) {
				return false;
			}
			promotingNonces.push(tx.nonce);
		}
		this._processable = Array.from(new Set([...this._processable, ...promotingNonces]));
		this._sortProcessable();

		return true;
	}

	public get size(): number {
		return this._nonceHeap.count;
	}

	public getProcessable(): ReadonlyArray<Transaction> {
		const txs = [];
		for (const nonce of this._processable) {
			txs.push(this._transactions[nonce.toString()]);
		}

		return txs;
	}

	public getUnprocessable(): ReadonlyArray<Transaction> {
		if (this._nonceHeap.count === 0) {
			return [];
		}
		if (this._processable.length === this._nonceHeap.count) {
			return [];
		}
		const clonedHeap = this._nonceHeap.clone();
		// Clone heap with the root node as the first unprocessable transaction
		for (const _ of this._processable) {
			clonedHeap.pop();
		}
		const remainingCount = clonedHeap.count;
		const unprocessableTx: Transaction[] = [];
		for (let i = 0; i < remainingCount; i += 1) {
			const { key } = clonedHeap.pop() as { key: bigint };
			unprocessableTx.push(this._transactions[key.toString()]);
		}

		return unprocessableTx;
	}

	public getPromotable(): ReadonlyArray<Transaction> {
		if (this._nonceHeap.count === 0) {
			return [];
		}
		if (this._processable.length === this._nonceHeap.count) {
			return [];
		}
		const clonedHeap = this._nonceHeap.clone();
		// Make cloned heap root to unprocessable
		for (const _ of this._processable) {
			clonedHeap.pop();
		}
		const firstUnprocessable = clonedHeap.pop();
		if (!firstUnprocessable) {
			return [];
		}
		if (this._processable.length !== 0) {
			const highestProcessableNonce = this._processable[this._processable.length - 1];
			if (firstUnprocessable.key !== highestProcessableNonce + BigInt(1)) {
				return [];
			}
		}
		const promotableTx = [this._transactions[firstUnprocessable.key.toString()]];

		const remainingNonces = clonedHeap.count;
		let lastPromotedNonce = this._transactions[firstUnprocessable.key.toString()].nonce;
		for (let i = 0; i < remainingNonces; i += 1) {
			const { key } = clonedHeap.pop() as { key: bigint };
			if (lastPromotedNonce + BigInt(1) === key) {
				promotableTx.push(this._transactions[key.toString()]);
				lastPromotedNonce = this._transactions[key.toString()].nonce;
			}
		}

		return promotableTx;
	}

	private _demoteAfter(nonce: bigint): void {
		this._processable = this._processable.filter(processableNonce => processableNonce < nonce);
		this._sortProcessable();
	}

	private _highestNonce(): bigint {
		const highestNonce = BigInt(-1);
		const { keys } = this._nonceHeap;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!keys) {
			return highestNonce;
		}

		return keys.reduce((prev, current) => {
			if (current > prev) {
				return current;
			}

			return prev;
		}, highestNonce);
	}

	private _sortProcessable(): void {
		this._processable.sort((a, b) => {
			if (a - b > BigInt(0)) {
				return 1;
			}
			if (a - b < BigInt(0)) {
				return -1;
			}

			return 0;
		});
	}
}
