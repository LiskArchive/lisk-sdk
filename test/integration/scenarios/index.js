/*
 * Copyright © 2018 Lisk Foundation
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

module.exports = {
	network: {
		peers: require('./network/peers'),
	},
	propagation: {
		blocks: require('./propagation/blocks'),
		transactions: require('./propagation/transactions'),
	},
	stress: {
		transfer: require('./stress/0.transfer'),
	},
};
