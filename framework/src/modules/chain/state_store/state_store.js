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
