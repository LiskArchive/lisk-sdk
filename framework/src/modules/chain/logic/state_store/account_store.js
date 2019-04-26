const _ = require('lodash');

const defaultAccount = {
	publicKey: null,
	secondPublicKey: null,
	secondSignature: false,
	username: null,
	isDelegate: false,
	balance: '0',
	missedBlocks: 0,
	producedBlocks: 0,
	rank: null,
	fees: '0',
	rewards: '0',
	vote: '0',
	nameExist: false,
	multiMin: 0,
	multiLifetime: 0,
};

class AccountStore {
	constructor(accountEntity, { mutate, tx } = { mutate: true, tx: undefined }) {
		this.account = accountEntity;
		this.data = [];
		this.updatedKeys = {};
		this.primaryKey = 'address';
		this.name = 'Account';
		this.mutate = mutate;
		this.originalData = [];
		this.originalUpdatedKeys = {};
		this.tx = tx;
	}

	async cache(filter) {
		const result = await this.account.get(filter, { extended: true }, this.tx);
		this.data = _.uniqBy([...this.data, ...result], this.primaryKey);
		return result;
	}

	createSnapshot() {
		this.originalData = _.clone(this.data);
		this.updatedKeys = _.clone(this.updatedKeys);
	}

	restoreSnapshot() {
		this.data = this.originalData;
		this.updatedKeys = {};
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

	getOrDefault(primaryValue) {
		const element = this.data.find(
			item => item[this.primaryKey] === primaryValue
		);
		if (element) {
			return element;
		}
		const defaultElement = {
			...defaultAccount,
			[this.primaryKey]: primaryValue,
		};

		const newElementIndex = this.data.push(defaultElement) - 1;
		this.updatedKeys[newElementIndex] = Object.keys(defaultElement);

		return defaultElement;
	}

	find(fn) {
		return this.data.find(fn);
	}

	set(primaryValue, updatedElement) {
		const elementIndex = this.data.findIndex(
			item => item[this.primaryKey] === primaryValue
		);

		if (elementIndex === -1) {
			throw new Error(
				`${this.name} with ${this.primaryKey} = ${primaryValue} does not exist`
			);
		}

		const updatedKeys = Object.entries(updatedElement).reduce(
			(existingUpdatedKeys, [key, value]) => {
				if (value !== this.data[elementIndex][key]) {
					existingUpdatedKeys.push(key);
				}

				return existingUpdatedKeys;
			},
			[]
		);

		this.data[elementIndex] = updatedElement;
		this.updatedKeys[elementIndex] = this.updatedKeys[elementIndex]
			? _.uniq([...this.updatedKeys[elementIndex], ...updatedKeys])
			: updatedKeys;
	}

	finalize() {
		if (!this.mutate) {
			throw new Error(
				'Cannot finalize when store is initialized with mutate = false'
			);
		}
		const affectedAccounts = Object.entries(this.updatedKeys).map(
			([index, updatedKeys]) => ({
				updatedItem: this.data[index],
				updatedKeys,
			})
		);

		const updateToAccounts = affectedAccounts.map(
			({ updatedItem, updatedKeys }) => {
				const filter = { [this.primaryKey]: updatedItem[this.primaryKey] };
				const updatedData = _.pick(updatedItem, updatedKeys);
				return this.account.upsert(filter, updatedData, null, this.tx);
			}
		);

		return Promise.all(updateToAccounts);
	}
}

module.exports = AccountStore;
