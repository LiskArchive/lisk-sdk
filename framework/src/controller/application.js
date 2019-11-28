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
		app.logger.error(
			{
				err,
			},
			'System error: uncaughtException',
		);
		app.shutdown(1, err.message);
	});

	process.on('unhandledRejection', err => {
		// Handle error safely
		app.logger.fatal(
			{
				err,
			},
			'System error: unhandledRejection',
		);
		app.shutdown(1, err.message);
	});

	process.once('SIGTERM', () => app.shutdown(1));

	process.once('SIGINT', () => app.shutdown(1));

	process.once('cleanup', (error, code) => app.shutdown(code, error));

	process.once('exit', (error, code) => app.shutdown(code, error));
};

class Application {
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

		this.logger = createLoggerComponent({
			...this.config.components.logger,
			module: 'lisk-controller',
		});

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

	overrideModuleOptions(alias, options) {
		const modules = this.getModules();
		assert(
			Object.keys(modules).includes(alias),
			`No module ${alias} is registered`,
		);
		this.config.modules[alias] = {
			...this.config.modules[alias],
			...options,
		};
	}

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

	getTransactions() {
		return __private.transactions.get(this);
	}

	getTransaction(transactionType) {
		return __private.transactions.get(this)[transactionType];
	}

	getModule(alias) {
		return __private.modules.get(this)[alias];
	}

	getModules() {
		return __private.modules.get(this);
	}

	getMigrations() {
		return __private.migrations.get(this);
	}

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

	async shutdown(errorCode = 0, message = '') {
		if (this.controller) {
			await this.controller.cleanup(errorCode, message);
		}
		this.logger.info({ errorCode, message }, 'Shutting down application');
		process.exit(errorCode);
	}

	_compileAndValidateConfigurations() {
		const modules = this.getModules();

		this.config.app.nethash = this.genesisBlock.payloadHash;

		const appConfigToShareWithModules = {
			version: this.config.app.version,
			minVersion: this.config.app.minVersion,
			protocolVersion: this.config.app.protocolVersion,
			nethash: this.config.app.nethash,
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
			nethash: this.config.app.nethash,
			wsPort: this.config.modules.network.wsPort,
			httpPort: this.config.modules.http_api.httpPort,
		};

		this.logger.trace(this.config, 'Compiled configurations');
	}
}

module.exports = Application;
