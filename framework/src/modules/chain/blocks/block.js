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

const {
	createV1,
	getBytesV0,
	getBytesV1,
	dbReadV0,
	dbReadV1,
	storageReadV0,
	storageReadV1,
	verifySignature,
	getId,
	getHash,
	objectNormalize,
	sign,
} = require('./blockV1');
const { createV2, getBytesV2, dbReadV2, storageReadV2 } = require('./blockV2');

const createFunc = {
	1: createV1,
	2: createV2,
};
const create = data => createFunc[data.version](data);

const getBytesFunc = {
	0: getBytesV0,
	1: getBytesV1,
	2: getBytesV2,
};
const getBytes = block => getBytesFunc[block.version](block);

const dbReadFunc = {
	0: dbReadV0,
	1: dbReadV1,
	2: dbReadV2,
};
const dbRead = raw => dbReadFunc[raw.b_version](raw);

const storageReadFunc = {
	0: storageReadV0,
	1: storageReadV1,
	2: storageReadV2,
};
const storageRead = raw => storageReadFunc[raw.version](raw);

module.exports = {
	sign,
	getHash,
	getId,
	create,
	dbRead,
	storageRead,
	getBytes,
	verifySignature,
	objectNormalize,
};
