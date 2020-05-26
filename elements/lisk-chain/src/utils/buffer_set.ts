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

export class BufferSet {
	private _data: { [key: string]: Buffer | undefined } = {};

	public constructor(data?: { [key: string ]: Buffer | undefined }) {
		this._data = data ?? {};
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
}
