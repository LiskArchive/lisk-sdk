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

import { ChainStateEntity, StorageTransaction } from '../types';

interface KeyValuePair {
	// tslint:disable-next-line readonly-keyword
	[key: string]: string;
}

export class ChainStateStore {
	private readonly _name = 'ChainState';
	private _data: KeyValuePair;
	private _originalData: KeyValuePair;
	private _updatedKeys: Set<string>;
	private _originalUpdatedKeys: Set<string>;
	private readonly _chainState: ChainStateEntity;

	public constructor(chainStateEntity: ChainStateEntity) {
		this._chainState = chainStateEntity;
		this._data = {};
		this._originalData = {};
		this._updatedKeys = new Set();
		this._originalUpdatedKeys = new Set();
	}

	public async cache(): Promise<void> {
		const results = await this._chainState.get();
		for (const { key, value } of results) {
			this._data[key] = value;
		}
	}

	public createSnapshot(): void {
		this._originalData = { ...this._data };
		this._originalUpdatedKeys = new Set(this._updatedKeys);
	}

	public restoreSnapshot(): void {
		this._data = { ...this._originalData };
		this._updatedKeys = new Set(this._originalUpdatedKeys);
	}

	public async get(key: string): Promise<string | undefined> {
		const value = this._data[key];

		if (value) {
			return value;
		}

		const dbValue = await this._chainState.getKey(key);
		// If it doesn't exist in the database, return undefined without caching
		if (dbValue === undefined) {
			return dbValue;
		}
		this._data[key] = dbValue;

		return this._data[key];
	}

	public getOrDefault(): void {
		throw new Error(`getOrDefault cannot be called for ${this._name}`);
	}

	public find(): void {
		throw new Error(`getOrDefault cannot be called for ${this._name}`);
	}

	public set(key: string, value: string): void {
		this._data[key] = value;
		this._updatedKeys.add(key);
	}

	public async finalize(tx: StorageTransaction): Promise<void> {
		if (this._updatedKeys.size === 0) {
			return;
		}

		await Promise.all(
			Array.from(this._updatedKeys).map(key =>
				this._chainState.setKey(key, this._data[key], tx),
			),
		);
	}
}
