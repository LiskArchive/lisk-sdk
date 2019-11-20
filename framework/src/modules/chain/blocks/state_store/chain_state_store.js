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

'use strict';

const _ = require('lodash');

class ChainStateStore {
	constructor(chainStateEntity, { tx } = {}) {
		this.chainState = chainStateEntity;
		this.data = {};
		this.updatedKeys = new Set();
		this.tx = tx;
	}

	async cache() {
		const results = await this.chainState.get();
		for (const { key, value } of results) {
			this.data[key] = value;
		}
	}

	createSnapshot() {
		this.originalData = _.clone(this.data);
		this.originalUpdatedKeys = _.clone(this.updatedKeys);
	}

	restoreSnapshot() {
		this.data = _.clone(this.originalData);
		this.updatedKeys = _.clone(this.originalUpdatedKeys);
	}

	get(key) {
		return this.data[key];
	}

	getOrDefault() {
		throw new Error(`getOrDefault cannot be called for ${this.name}`);
	}

	find() {
		throw new Error(`getOrDefault cannot be called for ${this.name}`);
	}

	set(key, value) {
		this.data[key] = value;
		this.updatedKeys.add(key);
	}

	async finalize() {
		if (this.updatedKeys.size === 0) {
			return;
		}

		Promise.all(
			Array.from(this.updatedKeys).map(key =>
				this.chainStateEntity.setKey(key, this.data[key], this.tx),
			),
		);
	}
}

module.exports = ChainStateStore;
