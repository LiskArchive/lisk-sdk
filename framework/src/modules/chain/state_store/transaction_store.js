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

class TransactionStore {
	constructor(transactionEntity, { tx }) {
		this.transaction = transactionEntity;
		this.data = [];
		this.primaryKey = 'id';
		this.name = 'Transaction';
		this.tx = tx;
	}

	async cache(filter) {
		const result = await this.transaction.get(
			filter,
			{ extended: true },
			this.tx,
		);
		this.data = _.uniqBy([...this.data, ...result], this.primaryKey);
		return result;
	}

	add(element) {
		this.data.push(element);
	}

	createSnapshot() {
		this.originalData = _.clone(this.data);
		this.originalUpdatedKeys = _.clone(this.updatedKeys);
	}

	restoreSnapshot() {
		this.data = _.clone(this.originalData);
		this.updatedKeys = _.clone(this.originalUpdatedKeys);
	}

	get(primaryValue) {
		const element = this.data.find(
			item => item[this.primaryKey] === primaryValue,
		);
		if (!element) {
			throw new Error(
				`${this.name} with ${this.primaryKey} = ${primaryValue} does not exist`,
			);
		}
		return element;
	}

	getOrDefault() {
		throw new Error(`getOrDefault cannot be called for ${this.name}`);
	}

	find(fn) {
		return this.data.find(fn);
	}

	set() {
		throw new Error(`set cannot be called for ${this.name}`);
	}

	// eslint-disable-next-line class-methods-use-this
	finalize() {
		throw new Error(`finalize cannot be called for ${this.name}`);
	}
}

module.exports = TransactionStore;
