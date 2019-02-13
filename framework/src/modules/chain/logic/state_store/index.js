const AccountStore = require('./account_store');
const TransactionStore = require('./transaction_store');

class StateStoreManager {
	constructor(storage, cb) {
		this.entities = {
			Account: storage.entities.Account,
			Transaction: storage.entities.Transaction,
		};

		this.sandbox = {};

		return setImmediate(cb, null, this);
	}

	createSandbox(options) {
		this.sandbox = {
			account: new AccountStore(this.entities.Account, options),
			transaction: new TransactionStore(this.entities.Transaction, options),
		};
		return this.sandbox;
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
