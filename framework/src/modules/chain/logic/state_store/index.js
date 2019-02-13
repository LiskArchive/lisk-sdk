const AccountStore = require('./account_store');
const TransactionStore = require('./transaction_store');

class StateStoreManager {
	constructor(storage, cb) {
		this.entities = {
			Account: storage.entities.Account,
			Transaction: storage.entities.Transaction,
		};

		this.stateStore = {};

		return setImmediate(cb, null, this);
	}

	createStore(options) {
		this.stateStore = {
			account: new AccountStore(this.entities.Account, options),
			transaction: new TransactionStore(this.entities.Transaction, options),
		};
		return this.stateStore;
	}

	createSnapshot() {
		this.sandbox.account.createSnapshot();
		this.sandbox.transaction.createSnapshot();
	}

	restoreSnapshot() {
		this.sandbox.account.restoreSnapshot();
		this.sandbox.transaction.restoreSnapshot();
	}
}

module.exports = StateStoreManager;
