/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import liskAPIInstance from './api';

class Query {
	constructor() {
		this.client = liskAPIInstance;
		this.handlers = {
			account: account => this.getAccount(account),
			block: block => this.getBlock(block),
			delegate: delegate => this.getDelegate(delegate),
			transaction: transaction => this.getTransaction(transaction),
		};
	}

	getBlock(input) {
		return this.client.sendRequest('blocks/get', { id: input });
	}

	getAccount(input) {
		return this.client.sendRequest('accounts', { address: input });
	}

	getTransaction(input) {
		return this.client.sendRequest('transactions/get', { id: input });
	}

	getDelegate(input) {
		return this.client.sendRequest('delegates/get', { username: input });
	}
}

export default new Query();
