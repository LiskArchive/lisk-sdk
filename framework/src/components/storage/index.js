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

const { config: defaultConfig } = require('./defaults');
const validator = require('../../controller/validator');
const Storage = require('./storage');
const adapters = require('./adapters');
const entities = require('./entities');
const utils = require('./utils');
const errors = require('./errors');

function createStorageComponent(options, logger) {
	options = validator.parseEnvArgAndValidate(defaultConfig, options);

	const storage = new Storage(options, logger);

	storage.registerEntity('Account', entities.Account);
	storage.registerEntity('Block', entities.Block);
	storage.registerEntity('Transaction', entities.Transaction);

	return storage;
}

module.exports = {
	defaults: defaultConfig,
	createStorageComponent,
	adapters,
	entities,
	errors,
	utils,
	Storage,
};
