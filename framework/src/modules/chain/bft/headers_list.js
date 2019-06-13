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

'use strict';

const assert = require('assert');

class HeadersList {
	constructor({ size }) {
		assert(size, 'Must provide size of the queue');
		this._items = [];
		this._size = size;
	}

	get items() {
		return this._items;
	}

	// eslint-disable-next-line class-methods-use-this
	set items(value) {
		throw new Error('You can\'t set the items directly use "list.add"');
	}

	get length() {
		return this.items.length;
	}

	get size() {
		return this._size;
	}

	set size(newSize) {
		const currentSize = this.size;
		if (currentSize > newSize) {
			this.items.splice(0, currentSize - newSize);
		}

		this._size = newSize;
	}

	get first() {
		return this.items[0];
	}

	get last() {
		return this.items[this.length - 1];
	}

	add(blockHeader) {
		const first = this.first;
		const last = this.last;

		if (this.items.length) {
			assert(
				blockHeader.height === last.height + 1 ||
					blockHeader.height === first.height - 1,
				`Block header with height ${last.height + 1} or ${first.height -
					1} can only be added at the moment, you provided ${
					blockHeader.height
				} height`
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

	remove({ aboveHeight } = {}) {
		// If list is empty just return
		if (this.length === 0) {
			return undefined;
		}

		if (!aboveHeight) {
			aboveHeight = this.last.height - 1;
		}

		const removeItemsCount = this.last.height - aboveHeight;

		if (removeItemsCount < 0 || removeItemsCount >= this.items.length) {
			return this.items.splice(0, this.items.length);
		}

		return this.items.splice(
			this.items.length - removeItemsCount,
			removeItemsCount
		);
	}

	top(size) {
		assert(size, 'Please provide the size');

		return this.items.slice(this.length - size, this.length + 1);
	}

	empty() {
		const items = [...this.items];
		this._items = [];
		return items;
	}
}

module.exports = { HeadersList };
