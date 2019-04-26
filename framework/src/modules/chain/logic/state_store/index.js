const AccountStore = require('./account_store');
const TransactionStore = require('./transaction_store');
const RoundStore = require('./round_store');

class StateStoreManager {
	constructor(storage, cb) {
		this.entities = {
			Account: storage.entities.Account,
			Transaction: storage.entities.Transaction,
			Round: storage.entities.Round,
		};

		this.stateStore = {};

		return setImmediate(cb, null, this);
	}

	createStore(options) {
		this.stateStore = {
			account: new AccountStore(this.entities.Account, options),
			round: new RoundStore(this.entities.Round, options),
			transaction: new TransactionStore(this.entities.Transaction, options),
		};
		return this.stateStore;
	}

	createSnapshot() {
		this.stateStore.account.createSnapshot();
		this.stateStore.transaction.createSnapshot();
	}

	restoreSnapshot() {
		this.stateStore.account.restoreSnapshot();
		this.stateStore.transaction.restoreSnapshot();
	}
}

module.exports = StateStoreManager;
