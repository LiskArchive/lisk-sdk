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
const { getNetworkIdentifier } = require('@liskhq/lisk-cryptography');
const { validator: liskValidator } = require('@liskhq/lisk-validator');
const _ = require('lodash');
const Controller = require('../controller/controller');
const version = require('../version');
const validator = require('./validator');
const configurator = require('./default_configurator');
const { genesisBlockSchema, constantsSchema } = require('./schema');

const ApplicationState = require('./application_state');

const { createLoggerComponent } = require('../components/logger');
const { createStorageComponent } = require('../components/storage');
const {
	MigrationEntity,
	NetworkInfoEntity,
	AccountEntity,
	BlockEntity,
	ChainStateEntity,
	ForgerInfoEntity,
	RoundDelegatesEntity,
	TempBlockEntity,
	TransactionEntity,
} = require('../application/storage/entities');
const {
	networkMigrations,
	nodeMigrations,
} = require('../application/storage/migrations');

const { Network } = require('./network');
const { Node } = require('./node');

const { InMemoryChannel } = require('../controller/channels');

const HttpAPIModule = require('../modules/http_api');

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
		this.channel = null;
		this.initialState = null;
		this.applicationState = null;

		// TODO: This should be removed after https://github.com/LiskHQ/lisk/pull/2980
		global.constants = this.constants;

		// Private members
		this._modules = {};
		this._transactions = {};
		this._migrations = {};
		this._node = null;
		this._network = null;
		this._controller = null;

		this.logger = this._initLogger();
		this.storage = this._initStorage();

		this.registerTransaction(TransferTransaction);
		this.registerTransaction(SecondSignatureTransaction);
		this.registerTransaction(DelegateTransaction);
		this.registerTransaction(VoteTransaction);
		this.registerTransaction(MultisignatureTransaction);

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

		this.config.modules[moduleAlias] = Object.assign(
			this.config.modules[moduleAlias] || {},
			options,
		);
		this._modules[moduleAlias] = moduleKlass;

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

		this._transactions[Transaction.TYPE] = Object.freeze(Transaction);
	}

	registerMigrations(namespace, migrations) {
		assert(namespace, 'Namespace is required');
		assert(Array.isArray(migrations), 'Migrations list should be an array');
		assert(
			!Object.keys(this._migrations).includes(namespace),
			`Migrations for "${namespace}" was already registered.`,
		);

		this._migrations[namespace] = Object.freeze(migrations);
	}

	getTransactions() {
		return this._transactions;
	}

	getTransaction(transactionType) {
		return this._transactions[transactionType];
	}

	getModule(alias) {
		return this._modules.get[alias];
	}

	getModules() {
		return this._modules;
	}

	getMigrations() {
		return this._migrations;
	}

	async run() {
		this.logger.info(
			'If you experience any type of error, please open an issue on Lisk GitHub: https://github.com/LiskHQ/lisk-sdk/issues',
		);
		this.logger.info(
			'Contribution guidelines can be found at Lisk-docs: https://github.com/LiskHQ/lisk-docs/blob/build/CONTRIBUTING.adoc',
		);
		this.logger.info(`Booting the application with Lisk Framework(${version})`);

		// Freeze every module and configuration so it would not interrupt the app execution
		this._compileAndValidateConfigurations();

		Object.freeze(this.genesisBlock);
		Object.freeze(this.constants);
		Object.freeze(this.config);

		this.logger.info(`Starting the app - ${this.config.app.label}`);

		registerProcessHooks(this);

		// Initialize all objects
		this.applicationState = this._initApplicationState();
		this.channel = this._initChannel();
		this.applicationState.channel = this.channel;

		this._controller = this._initController();
		this._network = this._initNetwork();
		this._node = this._initNode();

		// Load system components
		await this.storage.bootstrap();
		await this.storage.entities.Migration.defineSchema();

		// Have to keep it consistent until update migration namespace in database
		await this.storage.entities.Migration.applyAll({
			chain: nodeMigrations(),
			network: networkMigrations(),
		});

		await this._controller.load(
			this.getModules(),
			this.config.modules,
			this.getMigrations(),
		);

		await this._network.bootstrap();
		await this._node.bootstrap();

		this.channel.publish('app:ready');
	}

	async shutdown(errorCode = 0, message = '') {
		if (this._controller) {
			await this._controller.cleanup(errorCode, message);
		}

		this.logger.info({ errorCode, message }, 'Shutting down application');

		// TODO: Fix the cause of circular exception
		// await this._network.stop();
		// await this._node.cleanup();
		await this.storage.cleanup();

		process.exit(errorCode);
	}

	// --------------------------------------
	// Private
	// --------------------------------------
	_compileAndValidateConfigurations() {
		const modules = this.getModules();
		this.config.app.networkId = getNetworkIdentifier(
			this.genesisBlock.payloadHash,
			this.genesisBlock.communityIdentifier,
		);

		const appConfigToShareWithModules = {
			version: this.config.app.version,
			minVersion: this.config.app.minVersion,
			protocolVersion: this.config.app.protocolVersion,
			networkId: this.config.app.networkId,
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
			networkId: this.config.app.networkId,
			wsPort: this.config.app.network.wsPort,
			httpPort: this.config.modules.http_api.httpPort,
		};

		this.logger.trace(this.config, 'Compiled configurations');
	}

	_initLogger() {
		return createLoggerComponent({
			...this.config.components.logger,
			module: 'lisk:app',
		});
	}

	_initStorage() {
		const storageConfig = this.config.components.storage;
		const loggerConfig = this.config.components.logger;
		const dbLogger =
			storageConfig.logFileName &&
			storageConfig.logFileName === loggerConfig.logFileName
				? this.logger
				: createLoggerComponent({
						...loggerConfig,
						logFileName: storageConfig.logFileName,
						module: 'lisk:app:database',
				  });

		const storage = createStorageComponent(
			this.config.components.storage,
			dbLogger,
		);

		storage.registerEntity('Migration', MigrationEntity);
		storage.registerEntity('NetworkInfo', NetworkInfoEntity);
		storage.registerEntity('Account', AccountEntity, { replaceExisting: true });
		storage.registerEntity('Block', BlockEntity, { replaceExisting: true });
		storage.registerEntity('Transaction', TransactionEntity, {
			replaceExisting: true,
		});
		storage.registerEntity('ChainState', ChainStateEntity);
		storage.registerEntity('ForgerInfo', ForgerInfoEntity);
		storage.registerEntity('RoundDelegates', RoundDelegatesEntity);
		storage.registerEntity('TempBlock', TempBlockEntity);

		storage.entities.Account.extendDefaultOptions({
			limit: this.constants.ACTIVE_DELEGATES,
		});

		return storage;
	}

	_initApplicationState() {
		return new ApplicationState({
			initialState: this.initialState,
			logger: this.logger,
		});
	}

	_initChannel() {
		return new InMemoryChannel(
			'app',
			[
				'ready',
				'state:updated',
				'networkEvent',
				'blocks:change',
				'transactions:confirmed:change',
				'signature:change',
				'transactions:change',
				'rounds:change',
				'multisignatures:signature:change',
				'multisignatures:change',
				'delegates:fork',
				'loader:sync',
				'dapps:change',
				'rebuild',
				'processor:sync',
				'processor:deleteBlock',
				'processor:broadcast',
				'processor:newBlock',
			],
			{
				getComponentConfig: {
					handler: action => this.config.components[action.params],
				},
				getApplicationState: {
					handler: () => this.applicationState.state,
				},
				updateApplicationState: {
					handler: action => this.applicationState.update(action.params),
				},
				sendToNetwork: {
					handler: action => this._network.send(action.params),
				},
				broadcastToNetwork: {
					handler: action => this._network.broadcast(action.params),
				},
				requestFromNetwork: {
					handler: action => this._network.request(action.params),
				},
				requestFromPeer: {
					handler: action => this._network.requestFromPeer(action.params),
				},
				getConnectedPeers: {
					handler: action => this._network.getConnectedPeers(action.params),
				},
				getDisconnectedPeers: {
					handler: action => this._network.getDisconnectedPeers(action.params),
				},
				applyPenaltyOnPeer: {
					handler: action => this._network.applyPenalty(action.params),
				},
				calculateSupply: {
					handler: action => this._node.actions.calculateSupply(action),
				},
				calculateMilestone: {
					handler: action => this._node.actions.calculateMilestone(action),
				},
				calculateReward: {
					handler: action => this._node.actions.calculateReward(action),
				},
				getForgerPublicKeysForRound: {
					handler: async action =>
						this._node.actions.getForgerPublicKeysForRound(action),
				},
				updateForgingStatus: {
					handler: async action =>
						this._node.actions.updateForgingStatus(action),
				},
				postSignature: {
					handler: async action => this._node.actions.postSignature(action),
				},
				getForgingStatusForAllDelegates: {
					handler: async () =>
						this._node.actions.getForgingStatusForAllDelegates(),
				},
				getTransactionsFromPool: {
					handler: async action =>
						this._node.actions.getTransactionsFromPool(action),
				},
				getTransactions: {
					handler: async action => this._node.actions.getTransactions(action),
					isPublic: true,
				},
				getSignatures: {
					handler: async () => this._node.actions.getSignatures(),
					isPublic: true,
				},
				postTransaction: {
					handler: async action => this._node.actions.postTransaction(action),
				},
				getSlotNumber: {
					handler: async action => this._node.actions.getSlotNumber(action),
				},
				calcSlotRound: {
					handler: async action => this._node.actions.calcSlotRound(action),
				},
				getNodeStatus: {
					handler: async () => this._node.actions.getNodeStatus(),
				},
				getLastBlock: {
					handler: async () => this._node.actions.getLastBlock(),
					isPublic: true,
				},
				getBlocksFromId: {
					handler: async action => this._node.actions.getBlocksFromId(action),
					isPublic: true,
				},
				getHighestCommonBlock: {
					handler: async action =>
						this._node.actions.getHighestCommonBlock(action),
					isPublic: true,
				},
			},
			{ skipInternalEvents: true },
		);
	}

	_initController() {
		return new Controller({
			appLabel: this.config.app.label,
			config: {
				components: this.config.components,
				ipc: this.config.app.ipc,
				tempPath: this.config.app.tempPath,
			},
			logger: this.logger,
			storage: this.storage,
			channel: this.channel,
		});
	}

	_initNetwork() {
		const network = new Network({
			options: this.config.app.network,
			storage: this.storage,
			logger: this.logger,
			channel: this.channel,
		});
		return network;
	}

	_initNode() {
		const node = new Node({
			channel: this.channel,
			options: {
				...this.config.modules.chain, // TODO: Will change it in upcoming PR
				genesisBlock: this.genesisBlock,
				constants: this.constants,
				registeredTransactions: this.getTransactions(),
			},
			logger: this.logger,
			storage: this.storage,
			applicationState: this.applicationState,
		});

		return node;
	}
}

module.exports = Application;
