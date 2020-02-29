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
 *
 */
import { EventEmitter } from 'events';

import { MinHeap } from './min_heap';
import { TransactionObject } from './transaction_pool';

export interface TransactionListOptions {
	readonly maxSize?: number;
	readonly minReplacementFeeDifference?: bigint;
}

const DEFAULT_MAX_SIZE = 64;
const DEFAULT_REPLACEMENT_FEE_DIFF = BigInt(0);

export const EVENT_TRANSACTION_ADDED = 'EVENT_TRANSACTION_ADDED';
export const EVENT_TRANSACTION_REMOVED = 'EVENT_TRANSACTION_REMOVED';

export class TransactionList {
	public readonly address: string;
	public readonly events: EventEmitter;

	private _processable: Array<bigint>;
	// Value is not needed here
	private readonly _transactions: { [nonce: string]: TransactionObject };
	private readonly _nonceHeap: MinHeap<undefined, bigint>;
	private readonly _maxSize: number;
	private readonly _minReplacementFeeDifference: bigint;

	public constructor(address: string, options?: TransactionListOptions) {
		this.address = address;
		this.events = new EventEmitter();
		this._transactions = {};
		this._nonceHeap = new MinHeap<undefined, bigint>();
		this._processable = [];
		this._maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
		this._minReplacementFeeDifference =
			options?.minReplacementFeeDifference ?? DEFAULT_REPLACEMENT_FEE_DIFF;
	}

	public get(nonce: bigint): TransactionObject | undefined {
		return this._transactions[nonce.toString()];
	}

	public add(tx: TransactionObject, processable: boolean = false): boolean {
		const replacingTx = this._transactions[tx.nonce.toString()];
		// If the same nonce already exist in the pool try to replace
		if (replacingTx) {
			// If the fee is lower than the original fee + replacement, reject
			if (tx.fee < replacingTx.fee + this._minReplacementFeeDifference) {
				return false;
			}
			// Mark this and all subsequenct nonce unprocessable
			this._demoteAfter(tx.nonce);
			this._transactions[tx.nonce.toString()] = tx;
			this.events.emit(EVENT_TRANSACTION_REMOVED, {
				address: this.address,
				id: tx.id,
			});

			return true;
		}
		// If the size exceeds, remove the largest nonce
		const highestNonce = this._highestNonce();
		if (this._nonceHeap.count >= this._maxSize && tx.nonce > highestNonce) {
			return false;
		}

		this._transactions[tx.nonce.toString()] = tx;
		this._nonceHeap.push(tx.nonce, undefined);
		// If this transaction is processable and it is the first one in the list
		if (processable && this._processable.length === 0) {
			this._processable.push(tx.nonce);
		}

		// If the size exceeds, remove the largest noncetransaction
		if (this._nonceHeap.count > this._maxSize) {
			this.remove(highestNonce);
		}
		this.events.emit(EVENT_TRANSACTION_REMOVED, {
			address: this.address,
			id: tx.id,
		});

		return true;
	}

	public remove(nonce: bigint): boolean {
		const removingTx = this._transactions[nonce.toString()];
		if (!removingTx) {
			return false;
		}
		// tslint:disable-next-line no-dynamic-delete
		delete this._transactions[nonce.toString()];
		// Recreate heap: it could remove in the middle of the heap
		const keys = this._nonceHeap.keys;
		this._nonceHeap.clear();
		for (const key of keys) {
			if (key !== nonce) {
				this._nonceHeap.push(key, undefined);
			}
		}
		this._demoteAfter(nonce);

		this.events.emit(EVENT_TRANSACTION_REMOVED, {
			address: this.address,
			id: removingTx.id,
		});

		return true;
	}

	public promote(txs: ReadonlyArray<TransactionObject>): boolean {
		// Promtoe if only all ID are still existing and the same
		const promotingNonces = [];
		for (const tx of txs) {
			const promotingTx = this._transactions[tx.nonce.toString()];
			if (!promotingTx) {
				return false;
			}
			if (tx.id !== promotingTx.id) {
				return false;
			}
			promotingNonces.push(tx.nonce);
		}
		this._processable = Array.from(
			new Set([...this._processable, ...promotingNonces]),
		).sort();

		return true;
	}

	public get size(): number {
		return this._nonceHeap.count;
	}

	public getProcessable(): ReadonlyArray<TransactionObject> {
		const txs = [];
		for (const nonce of this._processable) {
			txs.push(this._transactions[nonce.toString()]);
		}

		return txs;
	}

	public getUnprocessable(): ReadonlyArray<TransactionObject> {
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
		const remainingCount = clonedHeap.count;
		const unprocessableTx: TransactionObject[] = [];
		// tslint:disable-next-line no-let
		for (let i = 0; i < remainingCount; i += 1) {
			const { key } = clonedHeap.pop() as { key: bigint };
			unprocessableTx.push(this._transactions[key.toString()]);
		}

		return unprocessableTx;
	}

	public getPromotable(): ReadonlyArray<TransactionObject> {
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
		const firstNonProcessable = clonedHeap.pop();
		if (!firstNonProcessable) {
			return [];
		}
		if (this._processable.length !== 0) {
			const heighestNonce = this._processable[this._processable.length - 1];
			if (firstNonProcessable.key !== heighestNonce + BigInt(1)) {
				return [];
			}
		}
		const promotableTx = [
			this._transactions[firstNonProcessable.key.toString()],
		];

		const remainingNonces = clonedHeap.count;
		// tslint:disable-next-line no-let
		let lastPromotableNonce = this._transactions[
			firstNonProcessable.key.toString()
		].nonce;
		// tslint:disable-next-line no-let
		for (let i = 0; i < remainingNonces; i += 1) {
			const { key } = clonedHeap.pop() as { key: bigint };
			if (lastPromotableNonce + BigInt(1) === key) {
				promotableTx.push(this._transactions[key.toString()]);
				lastPromotableNonce = this._transactions[key.toString()].nonce;
			}
		}

		return promotableTx;
	}

	private _demoteAfter(nonce: bigint): void {
		this._processable = this._processable.filter(
			processableNonce => processableNonce < nonce,
		);
	}

	private _highestNonce(): bigint {
		// tslint:disable-next-line no-let
		const highestNonce = BigInt(-1);
		const keys = this._nonceHeap.keys;
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
}
