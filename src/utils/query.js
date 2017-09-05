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
import lisk from './liskInstance';

class Query {
	constructor() {
		this.client = lisk;
	}

	isBlockQuery(input) {
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
