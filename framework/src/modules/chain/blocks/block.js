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

const signFunc = {
	0: blockV1.sign,
	1: blockV1.sign,
	2: blockV2.sign,
};
const sign = (block, keypair) => signFunc[block.version](block, keypair);

const getHashFunc = {
	0: blockV1.getHash,
	1: blockV1.getHash,
	2: blockV1.getHash,
};
const getHash = block => getHashFunc[block.version](block);

const getIdFunc = {
	0: blockV1.getId,
	1: blockV1.getId,
	2: blockV2.getId,
};
const getId = block => getIdFunc[block.version](block);

const verifySignatureFunc = {
	0: blockV1.verifySignature,
	1: blockV1.verifySignature,
	2: blockV2.verifySignature,
};
const verifySignature = block => verifySignatureFunc[block.version](block);

const objectNormalizeFunc = {
	0: blockV1.objectNormalize,
	1: blockV1.objectNormalize,
	2: blockV2.objectNormalize,
};
const objectNormalize = (block, exceptions) =>
	objectNormalizeFunc[block.version](block, exceptions);

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
