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

export class BufferSet {
	private _data: { [key: string]: Buffer } = {};

	public constructor(data?: Buffer[]) {
		this._data = {};
		if (data) {
			for (const d of data) {
				this.add(d);
			}
		}
	}

	public delete(key: Buffer): void {
		delete this._data[keyString(key)];
	}

	public add(value: Buffer): void {
		this._data[keyString(value)] = value;
	}

	public has(value: Buffer): boolean {
		return this._data[keyString(value)] !== undefined;
	}

	public clone(): BufferSet {
		return new BufferSet(cloneDeep(Object.values(this._data)));
	}

	public get size(): number {
		return Object.keys(this._data).length;
	}

	public [Symbol.iterator](): { next: () => { value: Buffer; done: boolean } } {
		let index = -1;
		const data = Object.values<Buffer>(this._data);

		return {
			next: (): { value: Buffer; done: boolean } => {
				index += 1;

				return {
					value: data[index],
					done: !(index in data),
				};
			},
		};
	}
}
