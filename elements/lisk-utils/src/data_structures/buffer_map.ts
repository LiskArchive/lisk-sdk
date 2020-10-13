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
import { keyString } from './buffer_string';

// eslint-disable-next-line import/order
import cloneDeep = require('lodash.clonedeep');

export class BufferMap<V> {
	private _data: { [key: string]: V | undefined } = {};

	public constructor(data?: { [key: string]: V | undefined }) {
		this._data = data ?? {};
	}
	public get size(): number {
		return Object.keys(this._data).length;
	}

	public get(key: Buffer): V | undefined {
		return this._data[keyString(key)];
	}

	public delete(key: Buffer): void {
		delete this._data[keyString(key)];
	}

	public set(key: Buffer, value: V): void {
		this._data[keyString(key)] = value;
	}

	public has(key: Buffer): boolean {
		return this._data[keyString(key)] !== undefined;
	}

	public clone(): BufferMap<V> {
		return new BufferMap(cloneDeep(this._data));
	}

	public entries(): [Buffer, V][] {
		return Object.entries(this._data).map(([key, value]) => [
			Buffer.from(key, 'binary'),
			value,
		]) as [Buffer, V][];
	}

	public values(): V[] {
		return Object.values(this._data as { [key: string]: V });
	}
}
