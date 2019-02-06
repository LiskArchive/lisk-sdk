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

/**
 * Application class to start the block chain instance
 *
 * @namespace Framework
 * @type {module.Application}
 */
module.exports = class Application {
	/**
	 * Create the application object
	 *
	 * @example
	 *    const app = new Application('my-app-devnet', myGenesisBlock)
	 * @example
	 *    const app = new Application('my-app-devnet', myGenesisBlock, myConstants)
	 *
	 * @param {string} label - Application label used in logs. Useful if you have multiple networks for same application.
	 * @param {Object} genesisBlock - Genesis block object
	 * @param {Object} [constants] - Override constants
	 * @param {Object} [config] - Main configuration object
	 * @param {Object} [config.components] - Configurations for components
	 * @param {Object} [config.components.logger] - Configuration for logger component
	 * @param {Object} [config.modules] - Configurations for modules
	 * @param {string} [config.version] - Version of the application
	 * @param {string} [config.minVersion] - Minimum compatible version on the network
	 * @param {string} [config.protocolVersion] - Compatible protocol version application is using
	 *
	 * @throws Framework.errors.SchemaValidationError
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
	 * @param {Object} moduleSpec - Module specification
	 *  @see {@link '../modules/README.md'}
	 * @param {Object} [config] - Modules configuration object. Provided config will override `moduleSpec.defaults` to generate final configuration used for the module
	 * @param {string} [alias] - Will use this alias or fallback to `moduleSpec.alias`
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
	 *
	 * @param {string} alias - Alias of module used during registration
	 * @param {Object} config - Override configurations, these will override existing configurations.
	 */
	overrideModuleConfig(alias, config) {
		const modules = this.getModules();
		assert(
			Object.keys(modules).includes(alias),
			`No module ${alias} is registered`
		);
		modules[alias].config = Object.assign({}, modules[alias].config, config);
		scope.modules.set(this, modules);
	}

	/**
	 * Register a transaction
	 *
	 * @param {constructor} Transaction - Transaction class
	 * @param {string} alias - Will use this alias or fallback to `Transaction.alias`
	 */
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

	/**
	 * Get list of all transactions registered with the application
	 *
	 * @return {Object}
	 */
	getTransactions() {
		return scope.transactions.get(this);
	}

	/**
	 * Get one transaction for provided alias
	 *
	 * @param {string} alias - Alias for transaction used during registration
	 * @return {constructor|undefined}
	 */
	getTransaction(alias) {
		return scope.transactions.get(this)[alias];
	}

	/**
	 * Get one module for provided alias
	 *
	 * @param {string} alias - Alias for module used during registration
	 * @return {{spec: Object, config: Object}}
	 */
	getModule(alias) {
		return scope.modules.get(this)[alias];
	}

	/**
	 * Get all registered modules
	 *
	 * @return {Array.<Object>}
	 */
	getModules() {
		return scope.modules.get(this);
	}

	/**
	 * Run the application
	 *
	 * @return {Promise<*>}
	 */
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

	/**
	 * Stop the running application
	 *
	 * @param {number} [errorCode=0] - Error code
	 * @param {string} [message] - Message specifying exit reason
	 * @return {Promise<void>}
	 */
	async shutdown(errorCode = 0, message = '') {
		if (this.controller) {
			await this.controller.cleanup();
		}
		this.logger.log(`Shutting down with error code ${errorCode} ${message}`);
		process.exit(errorCode);
	}
};
