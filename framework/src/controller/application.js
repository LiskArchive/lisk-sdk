const assert = require('assert');
const Controller = require('./controller');
const defaults = require('./defaults');
const version = require('../version');
const validator = require('./helpers/validator');
const schema = require('./schema/application');
const { createLoggerComponent } = require('../components/logger');

const ChainModule = require('../modules/chain');

// Private scope used because private keyword is restricted
const scope = {
	modules: new WeakMap(),
	transactions: new WeakMap(),
};

const registerProcessHooks = app => {
	process.title = `${app.label}`;

	process.on('uncaughtException', err => {
		// Handle error safely
		app.logger.error('System error: uncaughtException :', {
			message: err.message,
			stack: err.stack,
		});
		app.shutdown(1);
	});

	process.on('unhandledRejection', err => {
		// Handle error safely
		app.logger.fatal('System error: unhandledRejection :', {
			message: err.message,
			stack: err.stack,
		});
		app.shutdown(1);
	});

	process.once('SIGTERM', () => app.shutdown(1));

	process.once('SIGINT', () => app.shutdown(1));

	process.once('cleanup', (error, code) => app.shutdown(code, error));

	process.once('exit', (error, code) => app.shutdown(code, error));
};

module.exports = class Application {
	/**
	 *
	 * @param {string} label
	 * @param {Object} genesisBlock
	 * @param {Object} [constants]
	 * @param {Object} [config]
	 * @param {Object} [config.components]
	 * @param {Object} [config.components.logger]
	 */
	constructor(
		label,
		genesisBlock,
		constants = {},
		config = { components: { logger: null } }
	) {
		if (!config.components.logger) {
			config.components.logger = {
				filename: `~/.lisk/${label}/lisk.log`,
			};
		}

		validator.loadSchema(schema);
		validator.validate(schema.appLabel, label);
		validator.validate(schema.constants, constants);
		validator.validate(schema.config, config);

		// TODO: Validate schema for genesis block, constants, exceptions
		this.genesisBlock = genesisBlock;
		this.constants = Object.assign({}, defaults.constants, constants);
		this.label = label;
		this.banner = `${label || 'LiskApp'} - Lisk Framework(${version})`;
		this.config = config;
		this.controller = null;

		this.logger = createLoggerComponent(this.config.components.logger);

		scope.modules.set(this, {});
		scope.transactions.set(this, {});

		this.registerModule(ChainModule, {
			genesisBlock: this.genesisBlock,
			constants: this.constants,
		});
	}

	/**
	 * Register module with the application
	 *
	 * @param {Object} moduleSpec
	 * @param {Object} config
	 * @param {string} [alias] - Will use this alias or fallback to moduleSpec.alias
	 */
	registerModule(moduleSpec, config = {}, alias = undefined) {
		assert(moduleSpec, 'ModuleSpec is required');
		assert(
			typeof config === 'object',
			'Module config must be provided or set to empty object.'
		);
		assert(alias || moduleSpec.alias, 'Module alias must be provided.');
		const moduleAlias = alias || moduleSpec.alias;
		assert(
			!Object.keys(this.getModules()).includes(moduleAlias),
			`A module with alias "${moduleAlias}" already registered.`
		);

		const modules = this.getModules();
		modules[moduleAlias] = {
			spec: moduleSpec,
			config: config || {},
		};
		scope.modules.set(this, modules);
	}

	/**
	 * Override the module's configuration
	 * @param {string} moduleName
	 * @param {Object} config
	 */
	overrideModuleConfig(moduleName, config) {
		const modules = this.getModules();
		assert(Object.keys(modules).includes(moduleName), `No module ${moduleName} is registered`);
		modules[moduleName].config = Object.assign({}, modules[moduleName].config, config);
		scope.modules.set(this, modules);
	}

	registerTransaction(Transaction, alias) {
		assert(Transaction, 'Transaction is required');
		assert(alias, 'Transaction is required');
		assert(
			typeof Transaction === 'function',
			'Transaction should be constructor'
		);
		// TODO: Validate the transaction is properly inherited from base class
		assert(
			!Object.keys(this.getTransactions()).includes(alias),
			`A transaction with alias "${alias}" already registered.`
		);

		const transactions = this.getTransactions();
		transactions[alias] = Object.freeze(Transaction);
		scope.transactions.set(this, transactions);
	}

	getTransactions() {
		return scope.transactions.get(this);
	}

	getTransaction(alias) {
		return scope.transactions.get(this)[alias];
	}

	getModule(alias) {
		return scope.modules.get(this)[alias];
	}

	getModules() {
		return scope.modules.get(this);
	}

	async run() {
		this.logger.info(`Starting the app - ${this.banner}`);
		// Freeze every module and configuration so it would not interrupt the app execution
		Object.freeze(this.genesisBlock);
		Object.freeze(this.constants);
		Object.freeze(this.label);
		Object.freeze(this.config);

		registerProcessHooks(this);

		this.controller = new Controller(
			this.getModules(),
			this.config.components,
			this.logger
		);
		return this.controller.load();
	}

	async shutdown(errorCode = 0, message = '') {
		if (this.controller) {
			await this.controller.cleanup();
		}
		this.logger.log(`Shutting down with error code ${errorCode} ${message}`);
		process.exit(errorCode);
	}
};
