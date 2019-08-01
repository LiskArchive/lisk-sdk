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

const assert = require('assert');
const {
	TransferTransaction,
	SecondSignatureTransaction,
	DelegateTransaction,
	VoteTransaction,
	MultisignatureTransaction,
	transactionInterface,
} = require('@liskhq/lisk-transactions');
const { validator: liskValidator } = require('@liskhq/lisk-validator');
const randomstring = require('randomstring');
const _ = require('lodash');
const Controller = require('./controller');
const version = require('../version');
const validator = require('./validator');
const configurator = require('./default_configurator');
const { genesisBlockSchema, constantsSchema } = require('./schema');

const { createLoggerComponent } = require('../components/logger');

const ChainModule = require('../modules/chain');
const HttpAPIModule = require('../modules/http_api');
const NetworkModule = require('../modules/network');

// Private __private used because private keyword is restricted
const __private = {
	modules: new WeakMap(),
	transactions: new WeakMap(),
	migrations: new WeakMap(),
};

const registerProcessHooks = app => {
	process.title = `${app.config.app.label}(${app.config.app.version})`;

	process.on('uncaughtException', err => {
		// Handle error safely
		app.logger.error('System error: uncaughtException :', {
			message: err.message,
			stack: err.stack,
		});
		app.shutdown(1, err.message);
	});

	process.on('unhandledRejection', err => {
		// Handle error safely
		app.logger.fatal('System error: unhandledRejection :', {
			message: err.message,
			stack: err.stack,
		});
		app.shutdown(1, err.message);
	});

	process.once('SIGTERM', () => app.shutdown(1));

	process.once('SIGINT', () => app.shutdown(1));

	process.once('cleanup', (error, code) => app.shutdown(code, error));

	process.once('exit', (error, code) => app.shutdown(code, error));
};

/**
 * Application class to start the block chain instance
 *
 * @class
 * @memberof framework.controller
 * @requires assert
 * @requires Controller
 * @requires module.defaults
 * @requires validator
 * @requires schema/application
 * @requires components/logger
 * @requires components/storage
 */
class Application {
	/**
	 * Create the application object
	 *
	 * @example
	 *    const app = new Application(myGenesisBlock)
	 * @example
	 *    const app = new Application(myGenesisBlock, {app: {label: 'myApp'}})
	 *
	 * @param {Object} genesisBlock - Genesis block object
	 * @param {Object} [config] - Main configuration object
	 * @param {string} [config.app.label] - Label of the application
	 * @param {Object} [config.app.genesisConfig] - Configuration for applicationState
	 * @param {string} [config.app.version] - Version of the application
	 * @param {string} [config.app.minVersion] - Minimum compatible version on the network
	 * @param {string} [config.app.protocolVersion] - Compatible protocol version application is using
	 * @param {string} [config.app.lastCommitId] - Last commit id coming from application repository
	 * @param {string} [config.app.buildVersion] - Build version of the application
	 * @param {Object} [config.components] - Configurations for components
	 * @param {Object} [config.components.logger] - Configuration for logger component
	 * @param {Object} [config.components.cache] - Configuration for cache component
	 * @param {Object} [config.components.storage] - Configuration for storage component
	 * @param {Object} [config.modules] - Configurations for modules
	 *
	 * @throws Framework.errors.SchemaValidationError
	 */
	constructor(genesisBlock, config = {}) {
		const errors = liskValidator.validate(genesisBlockSchema, genesisBlock);
		if (errors.length) {
			throw errors;
		}

		// Don't change the object parameters provided
		let appConfig = _.cloneDeep(config);

		if (!_.has(appConfig, 'app.label')) {
			_.set(
				appConfig,
				'app.label',
				`lisk-${genesisBlock.payloadHash.slice(0, 7)}`,
			);
		}

		if (!_.has(appConfig, 'components.logger.logFileName')) {
			_.set(
				appConfig,
				'components.logger.logFileName',
				`${process.cwd()}/logs/${appConfig.app.label}/lisk.log`,
			);
		}

		appConfig = configurator.getConfig(appConfig, {
			failOnInvalidArg: process.env.NODE_ENV !== 'test',
		});

		// These constants are readonly we are loading up their default values
		// In additional validating those values so any wrongly changed value
		// by us can be catch on application startup
		const constants = validator.parseEnvArgAndValidate(constantsSchema, {});

		// app.genesisConfig are actually old constants
		// we are merging these here to refactor the underlying code in other iteration
		this.constants = { ...constants, ...appConfig.app.genesisConfig };
		this.genesisBlock = genesisBlock;
		this.config = appConfig;
		this.controller = null;

		// TODO: This should be removed after https://github.com/LiskHQ/lisk/pull/2980
		global.constants = this.constants;

		this.logger = createLoggerComponent(this.config.components.logger);

		__private.modules.set(this, {});
		__private.transactions.set(this, {});
		__private.migrations.set(this, {});

		this.registerTransaction(TransferTransaction);
		this.registerTransaction(SecondSignatureTransaction);
		this.registerTransaction(DelegateTransaction);
		this.registerTransaction(VoteTransaction);
		this.registerTransaction(MultisignatureTransaction);

		this.registerModule(ChainModule, {
			registeredTransactions: this.getTransactions(),
		});
		this.registerModule(NetworkModule);
		this.registerModule(HttpAPIModule);
		this.overrideModuleOptions(HttpAPIModule.alias, {
			loadAsChildProcess: true,
		});
	}

	/**
	 * Register module with the application
	 *
	 * @param {Object} moduleKlass - Module specification
	 *  @see {@link '../modules/README.md'}
	 * @param {Object} [options] - Modules configuration object. Provided options will override `moduleKlass.defaults` to generate final configuration used for the module
	 * @param {string} [alias] - Will use this alias or fallback to `moduleKlass.alias`
	 */
	registerModule(moduleKlass, options = {}, alias = undefined) {
		assert(moduleKlass, 'ModuleSpec is required');
		assert(
			typeof options === 'object',
			'Module options must be provided or set to empty object.',
		);
		assert(alias || moduleKlass.alias, 'Module alias must be provided.');
		const moduleAlias = alias || moduleKlass.alias;
		assert(
			!Object.keys(this.getModules()).includes(moduleAlias),
			`A module with alias "${moduleAlias}" already registered.`,
		);

		const modules = this.getModules();
		modules[moduleAlias] = moduleKlass;
		this.config.modules[moduleAlias] = Object.assign(
			this.config.modules[moduleAlias] || {},
			options,
		);
		__private.modules.set(this, modules);

		// Register migrations defined by the module
		this.registerMigrations(moduleKlass.alias, moduleKlass.migrations);
	}

	/**
	 * Override the module's configuration
	 *
	 * @param {string} alias - Alias of module used during registration
	 * @param {Object} options - Override configurations, these will override existing configurations.
	 */
	overrideModuleOptions(alias, options) {
		const modules = this.getModules();
		assert(
			Object.keys(modules).includes(alias),
			`No module ${alias} is registered`,
		);
		this.config.modules[alias] = Object.assign(
			{},
			this.config.modules[alias],
			options,
		);
	}

	/**
	 * Register a transaction
	 *
	 * @param {number} transactionType - Unique integer that identifies the transaction type
	 * @param {constructor} Transaction - Implementation of @liskhq/lisk-transactions/base_transaction
	 */
	registerTransaction(Transaction, { matcher } = {}) {
		assert(Transaction, 'Transaction implementation is required');

		assert(
			Number.isInteger(Transaction.TYPE),
			'Transaction type is required as an integer',
		);

		assert(
			!Object.keys(this.getTransactions()).includes(
				Transaction.TYPE.toString(),
			),
			`A transaction type "${Transaction.TYPE}" is already registered.`,
		);

		validator.validate(transactionInterface, Transaction.prototype);

		if (matcher) {
			Object.defineProperty(Transaction.prototype, 'matcher', {
				get: () => matcher,
			});
		}
		const transactions = this.getTransactions();

		transactions[Transaction.TYPE] = Object.freeze(Transaction);
		__private.transactions.set(this, transactions);
	}

	/**
	 * Register migrations with the application
	 *
	 * @param {Object} namespace - Migration namespace
	 * @param {Array} migrations - Migrations list. Format ['/path/to/migration/yyyyMMddHHmmss_name_of_migration.sql']
	 */
	registerMigrations(namespace, migrations) {
		assert(namespace, 'Namespace is required');
		assert(Array.isArray(migrations), 'Migrations list should be an array');
		assert(
			!Object.keys(this.getMigrations()).includes(namespace),
			`Migrations for "${namespace}" was already registered.`,
		);

		const currentMigrations = this.getMigrations();
		currentMigrations[namespace] = Object.freeze(migrations);
		__private.migrations.set(this, currentMigrations);
	}

	/**
	 * Get list of all transactions registered with the application
	 *
	 * @return {Object}
	 */
	getTransactions() {
		return __private.transactions.get(this);
	}

	/**
	 * Get one transaction for provided type
	 *
	 * @param {number} transactionType - Unique integer that identifies the transaction type
	 * @return {constructor|undefined}
	 */
	getTransaction(transactionType) {
		return __private.transactions.get(this)[transactionType];
	}

	/**
	 * Get one module for provided alias
	 *
	 * @param {string} alias - Alias for module used during registration
	 * @return {{klass: Object, options: Object}}
	 */
	getModule(alias) {
		return __private.modules.get(this)[alias];
	}

	/**
	 * Get all registered modules
	 *
	 * @return {Array.<Object>}
	 */
	getModules() {
		return __private.modules.get(this);
	}

	/**
	 * Get all registered migrations
	 *
	 * @return {Array.<Object>}
	 */
	getMigrations() {
		return __private.migrations.get(this);
	}

	/**
	 * Run the application
	 *
	 * @async
	 * @return {Promise.<void>}
	 */
	async run() {
		this.logger.info(`Booting the application with Lisk Framework(${version})`);

		// Freeze every module and configuration so it would not interrupt the app execution
		this._compileAndValidateConfigurations();

		Object.freeze(this.genesisBlock);
		Object.freeze(this.constants);
		Object.freeze(this.config);

		this.logger.info(`Starting the app - ${this.config.app.label}`);

		registerProcessHooks(this);

		this.controller = new Controller(
			this.config.app.label,
			{
				components: this.config.components,
				ipc: this.config.app.ipc,
				tempPath: this.config.app.tempPath,
			},
			this.initialState,
			this.logger,
		);
		return this.controller.load(
			this.getModules(),
			this.config.modules,
			this.getMigrations(),
		);
	}

	/**
	 * Stop the running application
	 *
	 * @param {number} [errorCode=0] - Error code
	 * @param {string} [message] - Message specifying exit reason
	 * @return {Promise.<void>}
	 */
	async shutdown(errorCode = 0, message = '') {
		if (this.controller) {
			await this.controller.cleanup(errorCode, message);
		}
		this.logger.info(`Shutting down with error code ${errorCode}: ${message}`);
		process.exit(errorCode);
	}

	_compileAndValidateConfigurations() {
		const modules = this.getModules();

		this.config.app.nonce = randomstring.generate(16);
		this.config.app.nethash = this.genesisBlock.payloadHash;

		const appConfigToShareWithModules = {
			version: this.config.app.version,
			minVersion: this.config.app.minVersion,
			protocolVersion: this.config.app.protocolVersion,
			nethash: this.config.app.nethash,
			nonce: this.config.app.nonce,
			genesisBlock: this.genesisBlock,
			constants: this.constants,
			lastCommitId: this.config.app.lastCommitId,
			buildVersion: this.config.app.buildVersion,
		};

		// TODO: move this configuration to module especific config file
		const childProcessModules = process.env.LISK_CHILD_PROCESS_MODULES
			? process.env.LISK_CHILD_PROCESS_MODULES.split(',')
			: [];

		Object.keys(modules).forEach(alias => {
			this.overrideModuleOptions(alias, {
				loadAsChildProcess: childProcessModules.includes(alias),
			});
			this.overrideModuleOptions(alias, appConfigToShareWithModules);
		});

		this.initialState = {
			version: this.config.app.version,
			minVersion: this.config.app.minVersion,
			protocolVersion: this.config.app.protocolVersion,
			nonce: this.config.app.nonce,
			nethash: this.config.app.nethash,
			wsPort: this.config.modules.network.wsPort,
			httpPort: this.config.modules.http_api.httpPort,
		};

		this.logger.trace('Compiled configurations', this.config);
	}
}

module.exports = Application;
