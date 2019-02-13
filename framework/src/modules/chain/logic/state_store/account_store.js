const _ = require('lodash');

const defaultAccount = {
	publicKey: null,
	secondPublicKey: null,
	secondSignature: false,
	u_secondSignature: false,
	username: null,
	u_username: null,
	isDelegate: false,
	u_isDelegate: false,
	balance: '0',
	u_balance: '0',
	missedBlocks: 0,
	producedBlocks: 0,
	rank: null,
	fees: '0',
	rewards: '0',
	vote: '0',
	nameExist: false,
	u_nameExist: false,
	multiMin: 0,
	u_multiMin: 0,
	multiLifetime: 0,
	u_multiLifetime: 0,
};

class AccountStore {
	constructor(accountEntity, { mutate } = { mutate: true }) {
		this.account = accountEntity;
		this.data = [];
		this.updatedKeys = {};
		this.primaryKey = 'address';
		this.name = 'Account';
		this.mutate = mutate;
		this.originalData = [];
		this.originalUpdatedKeys = {};
	}

	async cache(filter) {
		const result = await this.account.get(filter, {});
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
		let element = this.data.find(
			item => item[this.primaryKey] === primaryValue
		);
		if (!element) {
			element = {
				...defaultAccount,
				[this.primaryKey]: primaryValue,
			};
			this.data.push(element);
		}
		return element;
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

	finalize(tx) {
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

		return affectedAccounts.map(({ updatedItem, updatedKeys }) => {
			const filter = { [this.primaryKey]: updatedItem[this.primaryKey] };
			const updatedData = _.pick(updatedItem, updatedKeys);

			return this.account.upsert(filter, updatedData, null, tx);
		});
	}
}

module.exports = AccountStore;
