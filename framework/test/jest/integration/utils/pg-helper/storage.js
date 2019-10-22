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

const {
	MigrationEntity: Migration,
} = require('../../../../../src/controller/migrations');

const Storage = require('../../../../../src/components/storage/storage');
const {
	config: defaultConfig,
} = require('../../../../../src/components/storage/defaults');
const validator = require('../../../../../src/controller/validator');

const ChainModule = require('../../../../../src/modules/chain');
const NetworkModule = require('../../../../../src/modules/network');
const HttpAPIModule = require('../../../../../src/modules/http_api');

const modulesMigrations = {
	[ChainModule.alias]: ChainModule.migrations,
	[NetworkModule.alias]: NetworkModule.migrations,
	[HttpAPIModule.alias]: HttpAPIModule.migrations,
};

const createStorageComponent = async (options, logger = console) => {
	const storageOptions = validator.parseEnvArgAndValidate(
		defaultConfig,
		options,
	);
	const storage = new Storage(storageOptions, logger);

	await storage.bootstrap();

	storage.registerEntity('Migration', Migration);

	// apply migrations
	await storage.entities.Migration.defineSchema();
	await storage.entities.Migration.applyAll(modulesMigrations);

	return storage;
};

module.exports = { createStorageComponent };
