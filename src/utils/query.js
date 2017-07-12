import lisk from './liskInstance';

class Query {
	constructor() {
		this.client = lisk;
	}

	isBlockQuery(input) {
		//console.log(this);
		return this.client.sendRequest('blocks/get', { id: input });
	}

	isAccountQuery(input) {
		return this.client.sendRequest('accounts', { address: input });
	}

	isTransactionQuery(input) {
		return this.client.sendRequest('transactions/get', { id: input });
	}

	isDelegateQuery(input) {
		return this.client.sendRequest('delegates/get', { username: input });
	}
}

export default new Query();
