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

export abstract class Base<T> {
	private _items: T[];
	private readonly _minCachedItems: number;
	private readonly _maxCachedItems: number;
	private _needsRefill: boolean;

	public constructor(minCachedItems: number, maxCachedItems: number) {
		this._minCachedItems = minCachedItems;
		this._maxCachedItems = maxCachedItems;
		this._items = [];
		this._needsRefill = false;
	}

	public get items(): T[] {
		return this._items;
	}

	public get length(): number {
		return this.items.length;
	}

	public get maxCachedItems(): number {
		return this._maxCachedItems;
	}

	public get minCachedItems(): number {
		return this._minCachedItems;
	}

	public get first(): T {
		return this.items[0];
	}

	public get last(): T {
		return this.items[this.length - 1];
	}

	public empty(): T[] {
		this._items = [];

		return this.items;
	}

	public set needsRefill(needRefill: boolean) {
		this._needsRefill = needRefill;
	}

	public get needsRefill(): boolean {
		return this._needsRefill;
	}

	public abstract add(item: T): T[];
}
