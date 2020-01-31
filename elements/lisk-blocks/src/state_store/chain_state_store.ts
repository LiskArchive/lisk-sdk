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

import { clone } from 'lodash';

import { ChainState, ChainStateEntity, StorageTransaction } from '../types';

export class ChainStateStore {
	private readonly _name = 'ChainState';
	private _data: ChainState;
	private _originalData: ChainState;
	private _updatedKeys: Set<string>;
	private _originalUpdatedKeys: Set<string>;
	private readonly _tx: StorageTransaction | undefined;
	private readonly _chainState: ChainStateEntity;

	public constructor(
		chainStateEntity: ChainStateEntity,
		{ tx }: { readonly tx?: StorageTransaction } = { tx: undefined },
	) {
		this._chainState = chainStateEntity;
		this._data = {};
		this._originalData = {};
		this._updatedKeys = new Set();
		this._originalUpdatedKeys = new Set();
		this._tx = tx;
	}

	public async cache(): Promise<void> {
		const results = await this._chainState.get();
		for (const { key, value } of results) {
			this._data[key] = value;
		}
	}

	public createSnapshot(): void {
		this._originalData = clone(this._data);
		this._originalUpdatedKeys = clone(this._updatedKeys);
	}

	public restoreSnapshot(): void {
		this._data = clone(this._originalData);
		this._updatedKeys = clone(this._originalUpdatedKeys);
	}

	public async get(key: string): Promise<string> {
		const value = this._data[key];

		if (value) {
			return value;
		}

		this._data[key] = await this._chainState.getKey(key);

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

	public async finalize(): Promise<void> {
		if (this._updatedKeys.size === 0) {
			return;
		}

		await Promise.all(
			Array.from(this._updatedKeys).map(key =>
				this._chainState.setKey(key, this._data[key], this._tx),
			),
		);
	}
}
