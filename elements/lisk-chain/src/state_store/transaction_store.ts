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
 */
import { TransactionJSON } from '@liskhq/lisk-transactions';
// tslint:disable-next-line no-require-imports
import cloneDeep = require('lodash.clonedeep');

import {
	IndexableTransactionJSON,
	StorageEntity,
	StorageFilters,
} from '../types';
import { uniqBy } from '../utils';

export class TransactionStore {
	private readonly _primaryKey = 'id';
	private readonly _name = 'Transaction';
	private _data: TransactionJSON[];
	private _originalData: TransactionJSON[];
	private _updatedKeys: { [key: number]: string[] } = {};
	private _originalUpdatedKeys: { [key: number]: string[] } = {};
	private readonly _transaction: StorageEntity<TransactionJSON>;

	public constructor(transactionEntity: StorageEntity<TransactionJSON>) {
		this._transaction = transactionEntity;
		this._data = [];
		this._originalData = [];
		this._updatedKeys = {};
		this._originalUpdatedKeys = {};
	}

	public async cache(filter: StorageFilters): Promise<TransactionJSON[]> {
		const result = await this._transaction.get(
			filter,
			// tslint:disable-next-line no-null-keyword
			{ extended: true, limit: null },
		);
		this._data = uniqBy(
			[...this._data, ...result] as IndexableTransactionJSON[],
			this._primaryKey,
		);

		return cloneDeep(result);
	}

	public add(element: TransactionJSON): void {
		this._data.push(element);
	}

	public createSnapshot(): void {
		this._originalData = { ...this._data };
		this._originalUpdatedKeys = { ...this._updatedKeys };
	}

	public restoreSnapshot(): void {
		this._data = { ...this._originalData };
		this._updatedKeys = { ...this._originalUpdatedKeys };
	}

	public get(primaryValue: string): TransactionJSON {
		const element = this._data.find(
			item => item[this._primaryKey] === primaryValue,
		);
		if (!element) {
			throw new Error(
				`${this._name} with ${this._primaryKey} = ${primaryValue} does not exist`,
			);
		}

		return element;
	}

	public getOrDefault(): void {
		throw new Error(`getOrDefault cannot be called for ${this._name}`);
	}

	public find(
		fn: (
			value: TransactionJSON,
			index: number,
			obj: TransactionJSON[],
		) => unknown,
	): TransactionJSON | undefined {
		return this._data.find(fn);
	}

	public set(): void {
		throw new Error(`set cannot be called for ${this._name}`);
	}

	public finalize(): void {
		throw new Error(`finalize cannot be called for ${this._name}`);
	}
}
