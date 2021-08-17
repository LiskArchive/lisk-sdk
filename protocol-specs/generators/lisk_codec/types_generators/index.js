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
const booleans = require('./booleans');
const numbers = require('./numbers');
const bytes = require('./bytes');
const objects = require('./objects');
const block = require('./block');
const genesisBlockAsset = require('./genesis_block_asset');
const blockHeader = require('./block_header');
const transaction = require('./transaction');
const cartSample = require('./cart_sample');
const peerInfo = require('./peer_info');
const nestedArray = require('./nested_array');
const strings = require('./strings');
const account = require('./account');
const arrays = require('./arrays');
const blockAsset = require('./block_asset');

module.exports = {
	...strings,
	...account,
	...arrays,
	...blockAsset,
	...blockHeader,
	...block,
	...booleans,
	...bytes,
	...cartSample,
	...nestedArray,
	...genesisBlockAsset,
	...numbers,
	...objects,
	...peerInfo,
	...transaction,
};
