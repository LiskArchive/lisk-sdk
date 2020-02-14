/*
 * Copyright © 2020 Lisk Foundation
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
class StateStoreMock {
	constructor(initialAccount, initialState) {
		// Make sure to be deep copy
		this.accountData = initialAccount
			? initialAccount.map(a => ({ ...a }))
			: [];
		this.chainStateData = initialState ? { ...initialState } : {};

		this.account = {
			get: async address => {
				const account = this.accountData.find(acc => acc.address === address);
				if (!account) {
					throw new Error('Account not defined');
				}
				return { ...account };
			},
			set: (address, account) => {
				const index = this.accountData.findIndex(
					acc => acc.address === address,
				);
				if (index > -1) {
					this.accountData[index] = account;
					return;
				}
				this.accountData.push(account);
			},
			getUpdated: () => this.accountData,
		};
		this.chainState = {
			get: async key => {
				return this.chainStateData[key];
			},
			set: (key, val) => {
				this.chainStateData[key] = val;
			},
		};
	}
}

module.exports = {
	StateStoreMock,
};
