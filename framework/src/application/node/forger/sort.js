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

// TODO: remove type constraints
const TRANSACTION_TYPES_MULTI = [4, 12];
const TRANSACTION_TYPES_TRANSFER = [0, 8];

const sortTransactions = transactions =>
	transactions.sort((a, b) => {
		// Place MULTI transaction after all other transaction types
		if (
			TRANSACTION_TYPES_MULTI.includes(a.type) &&
			!TRANSACTION_TYPES_MULTI.includes(b.type)
		) {
			return 1;
		}
		// Place all other transaction types before MULTI transaction
		if (
			!TRANSACTION_TYPES_MULTI.includes(a.type) &&
			TRANSACTION_TYPES_MULTI.includes(b.type)
		) {
			return -1;
		}
		// Place depending on type (lower first)
		if (a.type < b.type) {
			return -1;
		}
		if (a.type > b.type) {
			return 1;
		}
		// Place depending on amount (lower first)
		if (
			TRANSACTION_TYPES_TRANSFER.includes(a.type) &&
			a.asset.amount < BigInt(b.asset.amount)
		) {
			return -1;
		}
		if (
			TRANSACTION_TYPES_TRANSFER.includes(a.type) &&
			a.asset.amount > BigInt(b.asset.amount)
		) {
			return 1;
		}
		return 0;
	});

module.exports = {
	sortTransactions,
};
