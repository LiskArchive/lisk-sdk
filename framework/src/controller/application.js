const assert = require('assert');
const {
	TransferTransaction,
	SecondSignatureTransaction,
	DelegateTransaction,
	VoteTransaction,
	MultisignatureTransaction,
} = require('@liskhq/lisk-transactions');
const Controller = require('./controller');
const defaults = require('./defaults');
const version = require('../version');
const validator = require('./helpers/validator');
const applicationSchema = require('./schema/application');
const constantsSchema = require('./schema/constants');
const { createLoggerComponent } = require('../components/logger');

const ChainModule = require('../modules/chain');
const HttpAPIModule = require('../modules/http_api');

// Private __private used because private keyword is restricted
const __private = {
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
 * @requires helpers/validator
 * @requires schema/application
 * @requires components/logger
 * @requires components/storage
 */
class Application {
	/**
	 * Create the application object
	 *
	 * @example
	 *    const app = new Application('my-app-devnet', myGenesisBlock)
	 * @example
	 *    const app = new Application('my-app-devnet', myGenesisBlock, myConstants)
	 *
	 * @param {string|function} label - Application label used in logs. Useful if you have multiple networks for same application.
	 * @param {Object} genesisBlock - Genesis block object
	 * @param {Object} [constants] - Override constants
	 * @param {Object} [config] - Main configuration object
	 * @param {Object} [config.components] - Configurations for components
	 * @param {Object} [config.components.logger] - Configuration for logger component
	 * @param {Object} [config.components.cache] - Configuration for cache component
	 * @param {Object} [config.components.storage] - Configuration for storage component
	 * @param {Object} [config.initialState] - Configuration for applicationState
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
		if (typeof label === 'function') {
			label = label.call();
		}

		if (!config.components.logger) {
			config.components.logger = {
				filename: `logs/${label}/lisk.log`,
			};
		}

		// Provide global constants for controller used by z_schema
		global.constants = constants;

		validator.loadSchema(applicationSchema);
		validator.loadSchema(constantsSchema);
		validator.validate(applicationSchema.appLabel, label);
		validator.validate(constantsSchema.constants, constants);
		validator.validate(applicationSchema.config, config);
		validator.validate(applicationSchema.genesisBlock, genesisBlock);

		// TODO: Validate schema for genesis block, constants, exceptions
		this.genesisBlock = genesisBlock;
		this.constants = Object.assign({}, defaults.constants, constants);
		this.label = label;
		this.banner = `${label || 'LiskApp'} - Lisk Framework(${version})`;
		this.config = config;
		this.controller = null;

		this.logger = createLoggerComponent(this.config.components.logger);

		__private.modules.set(this, {});
		__private.transactions.set(this, {});

		this.registerTransaction(TransferTransaction, { transactionType: 0 });
		this.registerTransaction(SecondSignatureTransaction, {
			transactionType: 1,
		});
		this.registerTransaction(DelegateTransaction, { transactionType: 2 });
		this.registerTransaction(VoteTransaction, { transactionType: 3 });
		this.registerTransaction(MultisignatureTransaction, { transactionType: 4 });

		// TODO: move this configuration to module especific config file
		const childProcessModules = process.env.LISK_CHILD_PROCESS_MODULES
			? process.env.LISK_CHILD_PROCESS_MODULES.split(',')
			: ['httpApi'];

		this.registerModule(ChainModule, {
			genesisBlock: this.genesisBlock,
			constants: this.constants,
			registeredTransactions: this.getTransactions(),
			loadAsChildProcess: childProcessModules.includes(ChainModule.alias),
		});

		this.registerModule(HttpAPIModule, {
			constants: this.constants,
			loadAsChildProcess: childProcessModules.includes(HttpAPIModule.alias),
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
			'Module options must be provided or set to empty object.'
		);
		assert(alias || moduleKlass.alias, 'Module alias must be provided.');
		const moduleAlias = alias || moduleKlass.alias;
		assert(
			!Object.keys(this.getModules()).includes(moduleAlias),
			`A module with alias "${moduleAlias}" already registered.`
		);

		const modules = this.getModules();
		modules[moduleAlias] = {
			klass: moduleKlass,
			options: options || {},
		};
		__private.modules.set(this, modules);
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
			`No module ${alias} is registered`
		);
		modules[alias].options = Object.assign({}, modules[alias].options, options);
		__private.modules.set(this, modules);
	}

	/**
	 * Register a transaction
	 *
	 * @param {constructor} Transaction - Transaction class
	 * @param {string} alias - Will use this alias or fallback to `Transaction.alias`
	 */
	registerTransaction(Transaction, options = {}) {
		const transactionType = options.transactionType;

		// TODO: Validate the transaction is properly inherited from base class
		assert(Transaction, 'Transaction is required');
		assert(transactionType, 'options.transactionType is required');
		assert(
			!Object.keys(this.getTransactions()).includes(transactionType),
			`A transaction type "${transactionType}" is already registered.`
		);

		const transactions = this.getTransactions();
		transactions[transactionType] = Object.freeze(Transaction);
		__private.transactions.set(this, transactions);
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
	 * Get one transaction for provided alias
	 *
	 * @param {string} alias - Alias for transaction used during registration
	 * @return {constructor|undefined}
	 */
	getTransaction(alias) {
		return __private.transactions.get(this)[alias];
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
	 * Run the application
	 *
	 * @async
	 * @return {Promise.<void>}
	 */
	async run() {
		this.logger.info(`Starting the app - ${this.banner}`);
		// Freeze every module and configuration so it would not interrupt the app execution
		Object.freeze(this.genesisBlock);
		Object.freeze(this.constants);
		Object.freeze(this.label);
		Object.freeze(this.config);

		registerProcessHooks(this);

		this.controller = new Controller(this.label, this.config, this.logger);
		return this.controller.load(this.getModules());
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
		this.logger.log(`Shutting down with error code ${errorCode}: ${message}`);
		process.exit(errorCode);
	}
}

module.exports = Application;
