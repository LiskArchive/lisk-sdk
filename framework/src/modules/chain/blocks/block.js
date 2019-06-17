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

const blockV1 = require('./block_v1');
const blockV2 = require('./block_v2');

const createFunc = {
	0: blockV1.create,
	1: blockV1.create,
	2: blockV2.create,
};
const create = data => createFunc[data.version](data);

const getBytesFunc = {
	0: blockV1.getBytes,
	1: blockV1.getBytes,
	2: blockV2.getBytes,
};
const getBytes = block => getBytesFunc[block.version](block);

const dbReadFunc = {
	0: blockV1.dbRead,
	1: blockV1.dbRead,
	2: blockV2.dbRead,
};
const dbRead = raw => dbReadFunc[raw.b_version](raw);

const storageReadFunc = {
	0: blockV1.storageRead,
	1: blockV1.storageRead,
	2: blockV2.storageRead,
};
const storageRead = raw => storageReadFunc[raw.version](raw);

module.exports = {
	sign: blockV1.sign,
	getHash: blockV1.getHash,
	getId: blockV1.getId,
	create,
	dbRead,
	storageRead,
	getBytes,
	verifySignature: blockV1.verifySignature,
	objectNormalize: blockV1.objectNormalize,
};
