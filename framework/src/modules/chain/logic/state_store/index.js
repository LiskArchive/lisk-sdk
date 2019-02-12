const AccountStore = require('./account_store');
const TransactionStore = require('./transaction_store');

class StateStoreManager {
	constructor(storage, cb) {
		this.entities = {
			Account: storage.entities.Account,
			Transaction: storage.entities.Transaction,
		};

		return setImmediate(cb, null, this);
	}

	createSandbox(options) {
		return {
			account: new AccountStore(this.entities.Account, options),
			transaction: new TransactionStore(this.entities.Transaction, options),
		};
	}
}

module.exports = StateStoreManager;
