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

/**
 * Description of the namespace.
 *
 * @namespace constants
 * @memberof config
 * @see Parent: {@link component/cache}
 * @property {number} CACHE_KEYS_BLOCKS
 * @property {number} CACHE_KEYS_DELEGATES
 * @property {number} CACHE_KEYS_TRANSACTIONS
 * @property {number} CACHE_KEYS_TRANSACTION_COUNT
 * @todo Add description for the namespace and the properties.
 */
module.exports = {
	CACHE_KEYS_BLOCKS: '/api/blocks*',
	CACHE_KEYS_DELEGATES: '/api/delegates*',
	CACHE_KEYS_TRANSACTIONS: '/api/transactions*',
	CACHE_KEYS_TRANSACTION_COUNT: 'transactionCount',
};
