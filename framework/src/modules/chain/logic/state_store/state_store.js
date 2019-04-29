const AccountStore = require('./account_store');
const TransactionStore = require('./transaction_store');
const RoundStore = require('./round_store');

class StateStore {
	constructor(storage, options) {
		this.entities = {
			Account: storage.entities.Account,
			Transaction: storage.entities.Transaction,
			Round: storage.entities.Round,
		};

		this.account = new AccountStore(this.entities.Account, options);
		this.round = new RoundStore(this.entities.Round, options);
		this.transaction = new TransactionStore(this.entities.Transaction, options);
	}

	createSnapshot() {
		this.account.createSnapshot();
		this.transaction.createSnapshot();
	}

	restoreSnapshot() {
		this.account.restoreSnapshot();
		this.transaction.restoreSnapshot();
	}
}

module.exports = StateStore;
