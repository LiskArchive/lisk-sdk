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

const __private = {
	items: new WeakMap(),
};

class HeadersList {
	constructor({ size }) {
		assert(size, 'Must provide size of the queue');
		this.size = size;
		__private.items.set(this, []);
	}

	get items() {
		return __private.items.get(this);
	}

	get length() {
		return __private.items.get(this).length;
	}

	get first() {
		return this.items[0];
	}

	get last() {
		return this.items[this.length - 1];
	}

	add(blockHeader) {
		const items = this.items;
		const first = this.first;
		const last = this.last;

		if (items.length) {
			assert(
				blockHeader.height === last.height + 1 ||
					blockHeader.height === first.height - 1,
				`Block header with height ${last.height + 1} or ${first.height -
					1} can be added at the moment`
			);
		}

		if (first && blockHeader.height === last.height + 1) {
			// Add to the end
			items.push(blockHeader);
		} else {
			// Add to the start
			items.unshift(blockHeader);
		}

		// If the list size is already full remove one item
		if (items.length > this.size) {
			items.shift();
		}

		__private.items.set(this, items);

		return this;
	}

	remove({ beforeHeight } = {}) {
		if (!beforeHeight) {
			beforeHeight = this.last.height - 1;
		}

		const items = this.items;
		const removeItemsCount = this.last.height - beforeHeight;
		let itemsToReturn;

		if (removeItemsCount < 0 || removeItemsCount >= items.length) {
			itemsToReturn = items.splice(0, items.length);
		} else {
			itemsToReturn = items.splice(
				items.length - removeItemsCount,
				removeItemsCount
			);
		}

		__private.items.set(this, items);
		return itemsToReturn;
	}
}

module.exports = { HeadersList };
