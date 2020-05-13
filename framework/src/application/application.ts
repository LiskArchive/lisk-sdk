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

import * as fs from 'fs';
import * as assert from 'assert';
import * as os from 'os';
import {
	TransferTransaction,
	DelegateTransaction,
	VoteTransaction,
	UnlockTransaction,
	MultisignatureTransaction,
	ProofOfMisbehaviorTransaction,
	transactionInterface,
	BaseTransaction,
} from '@liskhq/lisk-transactions';
import { Contexter } from '@liskhq/lisk-chain';
import { KVStore } from '@liskhq/lisk-db';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { validator as liskValidator } from '@liskhq/lisk-validator';
import * as _ from 'lodash';
import { Controller, ModulesOptions } from '../controller/controller';
import { version } from '../version';
import * as validator from './validator';
import * as configurator from './default_configurator';
import { genesisBlockSchema, constantsSchema } from './schema';
import { ApplicationState } from './application_state';
import { Network } from './network';
import { Node } from './node';
import { InMemoryChannel } from '../controller/channels';

import { createLoggerComponent } from '../components/logger';
import { createStorageComponent } from '../components/storage';
import { BaseModule, InstantiableModule } from '../modules/base_module';
import {
	MigrationEntity,
	NetworkInfoEntity,
	AccountEntity,
	BlockEntity,
	ChainStateEntity,
	ConsensusStateEntity,
	ForgerInfoEntity,
	TempBlockEntity,
	TransactionEntity,
} from './storage/entities';
import { networkMigrations, nodeMigrations } from './storage/migrations';
import { ActionInfoObject } from '../controller/action';
import { Logger } from '../types';
import { NodeConstants, GenesisBlockInstance } from './node/node';
import { DelegateConfig } from './node/forger';
import { NetworkConfig } from './network/network';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import HttpAPIModule = require('../modules/http_api');

const registerProcessHooks = (app: Application): void => {
	process.title = `${app.config.label}(${app.config.version})`;

	process.on('uncaughtException', err => {
		// Handle error safely
		app.logger.error(
			{
				err,
			},
			'System error: uncaughtException',
		);
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
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
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		app.shutdown(1, (err as Error).message);
	});

	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	process.once('SIGTERM', async () => app.shutdown(1));

	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	process.once('SIGINT', async () => app.shutdown(1));

	// eslint-disable-next-line
	process.once('exit' as any, (code: number) => app.shutdown(code));
};

interface ApplicationConfig {
	label: string;
	version: string;
	protocolVersion: string;
	networkId: string;
	lastCommitId: string;
	buildVersion: string;
	ipc: {
		enabled: boolean;
	};
	rootPath: string;
	readonly forging: {
		readonly waitThreshold: number;
		readonly delegates: DelegateConfig[];
		readonly force?: boolean;
		readonly defaultPassword?: string;
	};
	readonly rebuildUpToRound: string;
	readonly network: NetworkConfig;
	genesisConfig: {
		readonly epochTime: string;
		readonly blockTime: number;
		readonly maxPayloadLength: number;
		readonly reward: {
			readonly milestones: string[];
			readonly offset: number;
			readonly distance: number;
		};
	};
	constants: {
		[key: string]: {} | string | number | undefined;
		readonly activeDelegates: number;
		readonly standbyDelegates: number;
		readonly totalAmount: string;
		readonly delegateListRoundOffset: number;
	};
	components: {
		[key: string]: {} | undefined;
		logger: {
			logFileName: string;
		};
	};
	modules: ModulesOptions;
}

export class Application {
	public logger: Logger;
	public config: ApplicationConfig;
	public constants: NodeConstants;

	private _node!: Node;
	private _network!: Network;
	private _controller!: Controller;
	private _applicationState!: ApplicationState;
	private _transactions: { [key: number]: typeof BaseTransaction };
	private _modules: { [key: string]: InstantiableModule<BaseModule> };
	private _channel!: InMemoryChannel;

	private readonly _genesisBlock: GenesisBlockInstance;
	private _migrations: { [key: string]: object };
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private readonly storage: any;

	public constructor(
		genesisBlock: GenesisBlockInstance,
		config: Partial<ApplicationConfig> = {},
	) {
		const errors = liskValidator.validate(genesisBlockSchema, genesisBlock);
		if (errors.length) {
			throw errors;
		}
		this._genesisBlock = genesisBlock;

		// Don't change the object parameters provided
		// eslint-disable-next-line no-param-reassign
		config.rootPath = config.rootPath?.replace('~', os.homedir);
		let appConfig = _.cloneDeep(config);

		appConfig.label =
			appConfig.label ?? `lisk-${this._genesisBlock.payloadHash.slice(0, 7)}`;

		if (!_.has(appConfig, 'components.logger.logFileName')) {
			_.set(
				appConfig,
				'components.logger.logFileName',
				`${process.cwd()}/logs/${appConfig.label}/lisk.log`,
			);
		}

		appConfig = configurator.getConfig(appConfig, {
			failOnInvalidArg: process.env.NODE_ENV !== 'test',
		}) as ApplicationConfig;

		// These constants are readonly we are loading up their default values
		// In additional validating those values so any wrongly changed value
		// by us can be catch on application startup
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const constants = validator.parseEnvArgAndValidate(constantsSchema, {});

		// app.genesisConfig are actually old constants
		// we are merging these here to refactor the underlying code in other iteration
		this.constants = {
			...constants,
			...appConfig.genesisConfig,
		} as NodeConstants;
		this.config = appConfig as ApplicationConfig;

		// Private members
		this._modules = {};
		this._transactions = {};
		this._migrations = {};

		this.logger = this._initLogger();
		this.storage = this._initStorage();

		this.registerTransaction(TransferTransaction);
		this.registerTransaction(DelegateTransaction);
		this.registerTransaction(MultisignatureTransaction);
		this.registerTransaction(VoteTransaction);
		this.registerTransaction(UnlockTransaction);
		this.registerTransaction(ProofOfMisbehaviorTransaction);

		this.registerModule(
			(HttpAPIModule as unknown) as InstantiableModule<BaseModule>,
		);
		this.overrideModuleOptions(HttpAPIModule.alias, {
			loadAsChildProcess: true,
		});
	}

	public registerModule(
		moduleKlass: InstantiableModule<BaseModule>,
		options = {},
		alias?: string,
	): void {
		assert(moduleKlass, 'ModuleSpec is required');
		assert(
			typeof options === 'object',
			'Module options must be provided or set to empty object.',
		);
		assert(alias ?? moduleKlass.alias, 'Module alias must be provided.');
		const moduleAlias = alias ?? moduleKlass.alias;
		assert(
			!Object.keys(this.getModules()).includes(moduleAlias),
			`A module with alias "${moduleAlias}" already registered.`,
		);

		this.config.modules[moduleAlias] = Object.assign(
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			this.config.modules[moduleAlias] ?? {},
			options,
		);
		this._modules[moduleAlias] = moduleKlass;

		// Register migrations defined by the module
		this.registerMigrations(moduleKlass.alias, moduleKlass.migrations);
	}

	public overrideModuleOptions(alias: string, options?: object): void {
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

	public registerTransaction(
		Transaction: typeof BaseTransaction,
		{ matcher }: { matcher?: (context: Contexter) => boolean } = {},
	): void {
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

	// eslint-disable-next-line
	public registerMigrations(namespace: string, migrations: any): void {
		assert(namespace, 'Namespace is required');
		assert(Array.isArray(migrations), 'Migrations list should be an array');
		assert(
			!Object.keys(this._migrations).includes(namespace),
			`Migrations for "${namespace}" was already registered.`,
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this._migrations[namespace] = Object.freeze(migrations);
	}

	public getTransactions(): { [key: number]: typeof BaseTransaction } {
		return this._transactions;
	}

	public getTransaction(transactionType: number): typeof BaseTransaction {
		return this._transactions[transactionType];
	}

	public getModule(alias: string): InstantiableModule<BaseModule> {
		return this._modules[alias];
	}

	public getModules(): { [key: string]: InstantiableModule<BaseModule> } {
		return this._modules;
	}

	public getMigrations(): { [key: string]: object } {
		return this._migrations;
	}

	public async run(): Promise<void> {
		this.logger.info(
			'If you experience any type of error, please open an issue on Lisk GitHub: https://github.com/LiskHQ/lisk-sdk/issues',
		);
		this.logger.info(
			'Contribution guidelines can be found at Lisk-docs: https://github.com/LiskHQ/lisk-docs/blob/build/CONTRIBUTING.adoc',
		);
		this.logger.info(`Booting the application with Lisk Framework(${version})`);

		// Freeze every module and configuration so it would not interrupt the app execution
		this._compileAndValidateConfigurations();

		Object.freeze(this._genesisBlock);
		Object.freeze(this.constants);
		Object.freeze(this.config);

		this.logger.info(`Starting the app - ${this.config.label}`);

		registerProcessHooks(this);

		// Initialize all objects
		this._applicationState = this._initApplicationState();
		this._channel = this._initChannel();
		this._applicationState.channel = this._channel;

		this._controller = this._initController();
		this._network = this._initNetwork();
		this._node = this._initNode();

		// Load system components
		// eslint-disable-next-line
		await this.storage.bootstrap();
		// eslint-disable-next-line
		await this.storage.entities.Migration.defineSchema();

		// Have to keep it consistent until update migration namespace in database
		// eslint-disable-next-line
		await this.storage.entities.Migration.applyAll({
			node: nodeMigrations(),
			network: networkMigrations(),
		});

		await this._controller.load(
			this.getModules(),
			this.config.modules,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.getMigrations() as any,
		);

		await this._network.bootstrap();
		await this._node.bootstrap();

		this._channel.publish('app:ready');
	}

	public async shutdown(errorCode = 0, message = ''): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (this._controller) {
			await this._controller.cleanup(errorCode, message);
		}

		this.logger.info({ errorCode, message }, 'Shutting down application');

		await this._node.cleanup();
		// TODO: Fix the cause of circular exception
		// await this._network.stop();
		// eslint-disable-next-line
		// this.storage.cleanup();

		process.exit(errorCode);
	}

	// --------------------------------------
	// Private
	// --------------------------------------
	private _compileAndValidateConfigurations(): void {
		const modules = this.getModules();
		this.config.networkId = getNetworkIdentifier(
			this._genesisBlock.payloadHash,
			this._genesisBlock.communityIdentifier,
		);

		const appConfigToShareWithModules = {
			version: this.config.version,
			protocolVersion: this.config.protocolVersion,
			networkId: this.config.networkId,
			genesisBlock: this._genesisBlock,
			constants: this.constants,
			lastCommitId: this.config.lastCommitId,
			buildVersion: this.config.buildVersion,
		};

		// TODO: move this configuration to module specific config file
		const childProcessModules = process.env.LISK_CHILD_PROCESS_MODULES
			? process.env.LISK_CHILD_PROCESS_MODULES.split(',')
			: [];

		Object.keys(modules).forEach(alias => {
			this.overrideModuleOptions(alias, {
				loadAsChildProcess: childProcessModules.includes(alias),
			});
			this.overrideModuleOptions(alias, appConfigToShareWithModules);
		});

		this.logger.trace(this.config, 'Compiled configurations');
	}

	private _initLogger(): Logger {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return createLoggerComponent({
			...this.config.components.logger,
			module: 'lisk:app',
		});
	}

	private _initStorage(): object {
		/* eslint-disable */
		const storageConfig = this.config.components.storage as any;
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
		) as any;

		storage.registerEntity('Migration', MigrationEntity);
		storage.registerEntity('NetworkInfo', NetworkInfoEntity);
		storage.registerEntity('Account', AccountEntity, { replaceExisting: true });
		storage.registerEntity('Block', BlockEntity, { replaceExisting: true });
		storage.registerEntity('Transaction', TransactionEntity, {
			replaceExisting: true,
		});
		storage.registerEntity('ChainState', ChainStateEntity);
		storage.registerEntity('ConsensusState', ConsensusStateEntity);
		storage.registerEntity('ForgerInfo', ForgerInfoEntity);
		storage.registerEntity('TempBlock', TempBlockEntity);

		storage.entities.Account.extendDefaultOptions({
			limit: this.constants.activeDelegates + this.constants.standbyDelegates,
		});

		return storage;
		/* eslint-enable */
	}

	private _initApplicationState(): ApplicationState {
		return new ApplicationState({
			initialState: {
				version: this.config.version,
				protocolVersion: this.config.protocolVersion,
				networkId: this.config.networkId,
				wsPort: this.config.network.wsPort,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				httpPort: this.config.modules.http_api?.httpPort,
			},
			logger: this.logger,
		});
	}

	private _initChannel(): InMemoryChannel {
		/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
		/* eslint-disable @typescript-eslint/explicit-function-return-type */
		return new InMemoryChannel(
			'app',
			[
				'ready',
				'state:updated',
				'network:event',
				'network:ready',
				'transaction:new',
				'round:change',
				'chain:sync',
				'chain:fork',
				'chain:rebuild',
				'block:new',
				'block:broadcast',
				'block:delete',
			],
			{
				getComponentConfig: {
					handler: (action: ActionInfoObject) =>
						this.config.components[action.params as string],
				},
				getApplicationState: {
					handler: (_action: ActionInfoObject) => this._applicationState.state,
				},
				updateApplicationState: {
					handler: (action: ActionInfoObject) =>
						this._applicationState.update(action.params),
				},
				sendToNetwork: {
					handler: (action: ActionInfoObject) =>
						this._network.send(action.params),
				},
				broadcastToNetwork: {
					handler: (action: ActionInfoObject) =>
						this._network.broadcast(action.params),
				},
				requestFromNetwork: {
					handler: async (action: ActionInfoObject) =>
						this._network.request(action.params),
				},
				requestFromPeer: {
					handler: async (action: ActionInfoObject) =>
						this._network.requestFromPeer(action.params),
				},
				getConnectedPeers: {
					handler: (_action: ActionInfoObject) =>
						this._network.getConnectedPeers(),
				},
				getDisconnectedPeers: {
					handler: (_action: ActionInfoObject) =>
						this._network.getDisconnectedPeers(),
				},
				applyPenaltyOnPeer: {
					handler: (action: ActionInfoObject) =>
						this._network.applyPenalty(action.params),
				},
				calculateSupply: {
					handler: (action: ActionInfoObject) =>
						this._node.actions.calculateSupply(action),
				},
				calculateMilestone: {
					handler: (action: ActionInfoObject) =>
						this._node.actions.calculateMilestone(action),
				},
				calculateReward: {
					handler: (action: ActionInfoObject) =>
						this._node.actions.calculateReward(action),
				},
				getForgerAddressesForRound: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getForgerAddressesForRound(action),
				},
				updateForgingStatus: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.updateForgingStatus(action),
				},
				getForgingStatusOfAllDelegates: {
					handler: (_action: ActionInfoObject) =>
						this._node.actions.getForgingStatusOfAllDelegates(),
				},
				getTransactionsFromPool: {
					handler: (_action: ActionInfoObject) =>
						this._node.actions.getTransactionsFromPool(),
				},
				getTransactions: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getTransactions(action),
					isPublic: true,
				},
				postTransaction: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.postTransaction(action),
				},
				getSlotNumber: {
					handler: (action: ActionInfoObject) =>
						this._node.actions.getSlotNumber(action),
				},
				calcSlotRound: {
					handler: (action: ActionInfoObject) =>
						this._node.actions.calcSlotRound(action),
				},
				getNodeStatus: {
					handler: (_action: ActionInfoObject) =>
						this._node.actions.getNodeStatus(),
				},
				getLastBlock: {
					handler: async (_action: ActionInfoObject) =>
						this._node.actions.getLastBlock(),
					isPublic: true,
				},
				getBlocksFromId: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getBlocksFromId(action),
					isPublic: true,
				},
				getHighestCommonBlock: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getHighestCommonBlock(action),
					isPublic: true,
				},
				getAccount: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getAccount(action),
				},
				getAccounts: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getAccounts(action),
				},
				getBlockByID: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getBlockByID(action),
				},
				getBlocksByIDs: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getBlocksByIDs(action),
				},
				getBlockByHeight: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getBlockByHeight(action),
				},
				getBlocksByHeightBetween: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getBlocksByHeightBetween(action),
				},
				getTransactionByID: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getTransactionByID(action),
				},
				getTransactionsByIDs: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getTransactionsByIDs(action),
				},
			},
			{ skipInternalEvents: true },
		);
		/* eslint-enable @typescript-eslint/explicit-module-boundary-types */
		/* eslint-enable @typescript-eslint/explicit-function-return-type */
	}

	private _initController(): Controller {
		return new Controller({
			appLabel: this.config.label,
			config: {
				ipc: this.config.ipc,
				rootPath: this.config.rootPath,
			},
			logger: this.logger,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			storage: this.storage,
			channel: this._channel,
		});
	}

	private _initNetwork(): Network {
		const network = new Network({
			options: this.config.network,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			storage: this.storage,
			logger: this.logger,
			channel: this._channel,
		});
		return network;
	}

	private _initNode(): Node {
		const { components, modules, ...rootConfigs } = this.config;
		const { network, ...nodeConfigs } = rootConfigs;
		const node = new Node({
			channel: this._channel,
			options: {
				...nodeConfigs,
				genesisBlock: this._genesisBlock,
				constants: this.constants,
				registeredTransactions: this.getTransactions(),
			},
			logger: this.logger,
			// TODO: Remove the storage with PR 5257
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			storage: this.storage,
			forgerDB: this._getDBInstance(nodeConfigs, 'forger.db'),
			applicationState: this._applicationState,
		});

		return node;
	}

	private _getDBInstance(
		options: Partial<ApplicationConfig>,
		dbName: string,
	): KVStore {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		const dbPath = `${options.rootPath}/${options.label}/data/${dbName}`;
		if (!fs.existsSync(dbPath)) {
			fs.mkdirSync(dbPath, { recursive: true });
		}
		this.logger.debug({ dbName, dbPath }, 'Create database instance.');
		return new KVStore(dbPath);
	}
}
