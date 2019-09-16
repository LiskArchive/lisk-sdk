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

const createStorageComponent = async (options, logger) => {
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
