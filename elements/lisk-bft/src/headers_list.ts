/*
 * Copyright © 2018 Lisk Foundation
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

import * as assert from 'assert';

import { BlockHeader } from './types';

export class HeadersList {
	private _size: number;
	private _items: BlockHeader[];

	public constructor({ size }: { readonly size: number }) {
		assert(size, 'Must provide size of the queue');
		this._items = [];
		this._size = size;
	}

	public get items(): BlockHeader[] {
		return this._items;
	}

	public get length(): number {
		return this.items.length;
	}

	public get size(): number {
		return this._size;
	}

	public set size(newSize: number) {
		const currentSize = this.size;
		if (currentSize > newSize) {
			this.items.splice(0, currentSize - newSize);
		}

		this._size = newSize;
	}

	public get first(): BlockHeader {
		return this.items[0];
	}

	public get last(): BlockHeader {
		return this.items[this.length - 1];
	}

	public add(blockHeader: BlockHeader): HeadersList {
		const first = this.first;
		const last = this.last;

		if (this.items.length) {
			assert(
				blockHeader.height === last.height + 1 ||
					blockHeader.height === first.height - 1,
				`Block header with height ${last.height + 1} or ${first.height -
					1} can only be added at the moment, you provided ${
					blockHeader.height
				} height`,
			);
		}

		if (first && blockHeader.height === last.height + 1) {
			// Add to the end
			this.items.push(blockHeader);
		} else {
			// Add to the start
			this.items.unshift(blockHeader);
		}

		// If the list size is already full remove one item
		if (this.items.length > this.size) {
			this.items.shift();
		}

		return this;
	}

	public remove({ aboveHeight }: { readonly aboveHeight?: number } = {}):
		| ReadonlyArray<BlockHeader>
		| undefined {
		// If list is empty just return
		if (this.length === 0) {
			return undefined;
		}

		const _aboveHeight = aboveHeight ?? this.last.height - 1;

		const removeItemsCount = this.last.height - _aboveHeight;

		if (removeItemsCount < 0 || removeItemsCount >= this.items.length) {
			return this.items.splice(0, this.items.length);
		}

		return this.items.splice(
			this.items.length - removeItemsCount,
			removeItemsCount,
		);
	}

	public top(size: number): ReadonlyArray<BlockHeader> {
		return this.items.slice(this.length - size, this.length + 1);
	}

	public empty(): ReadonlyArray<BlockHeader> {
		const items = [...this.items];
		this._items = [];

		return items;
	}

	public get(height: number): BlockHeader {
		return this.items[height - this.first.height];
	}
}
