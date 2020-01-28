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

export abstract class Cache<T> {
	private _items: T[];
	private readonly _size: number;

	public constructor(size: number) {
		this._size = size;
		this._items = [];
	}

	public get items(): T[] {
		return this._items;
	}

	public get length(): number {
		return this.items.length;
	}

	public get size(): number {
		return this._size;
	}

	public get first(): T {
		return this.items[0];
	}

	public get last(): T {
		return this.items[this.length - 1];
	}

	public abstract add(item: T): T[];

	public empty(): T[] {
		this._items = [];

		return this.items;
	}
}
