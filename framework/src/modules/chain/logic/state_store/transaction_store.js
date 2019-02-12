const _ = require('lodash');

class TransactionStore {
	constructor(transactionEntity, { mutate } = { mutate: true }) {
		this.transaction = transactionEntity;
		this.data = [];
		this.primaryKey = 'id';
		this.name = 'Transaction';
		this.mutate = mutate;
	}

	async cache(filter, tx) {
		const result = await this.transaction.get(filter, {}, tx);
		this.data = _.uniqBy([...this.data, ...result], this.primaryKey);
		return result;
	}

	get(primaryValue) {
		const element = this.data.find(
			item => item[this.primaryKey] === primaryValue
		);
		if (!element) {
			throw new Error(
				`${this.name} with ${this.primaryKey} = ${primaryValue} does not exist`
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
