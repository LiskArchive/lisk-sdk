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
	NetworkInfoEntity: NetworkInfo,
} = require('../../../../src/application/storage/entities');

const Storage = require('../../../../src/components/storage/storage');
const {
	config: defaultConfig,
} = require('../../../../src/components/storage/defaults');
const validator = require('../../../../src/application/validator');

const ChainModule = require('../../../../src/application/node');
const HttpAPIModule = require('../../../../src/modules/http_api');
const {
	migrations: controllerMigrations,
} = require('../../../../src/application/storage/migrations');

const ApplicationAlias = 'app';
const modulesMigrations = {
	[ChainModule.alias]: ChainModule.migrations,
	[HttpAPIModule.alias]: HttpAPIModule.migrations,
	[ApplicationAlias]: controllerMigrations(),
};

const createStorageComponent = async (options, logger = console) => {
	const storageOptions = validator.parseEnvArgAndValidate(
		defaultConfig,
		options,
	);
	const storage = new Storage(storageOptions, logger);

	storage.registerEntity('Migration', Migration);
	storage.registerEntity('NetworkInfo', NetworkInfo);

	await storage.bootstrap();

	// apply migrations
	await storage.entities.Migration.defineSchema();
	await storage.entities.Migration.applyAll(modulesMigrations);

	return storage;
};

module.exports = { createStorageComponent };
