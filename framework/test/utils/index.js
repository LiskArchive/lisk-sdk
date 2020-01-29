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

const { constants } = require('./constants');

const randomInt = (low, high) => Math.round(Math.random() * (high - low) + low);

const storageUtils = require('./storage');
const configUtils = require('./configs');
const nodeUtils = require('./node');

module.exports = {
	constants,
	randomInt,
	storageUtils,
	configUtils,
	nodeUtils,
};
