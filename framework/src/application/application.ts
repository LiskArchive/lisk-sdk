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

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as psList from 'ps-list';
import * as assert from 'assert';
import { promisify } from 'util';
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
import { validateGenesisBlock, GenesisBlock } from '@liskhq/lisk-genesis';
import { KVStore } from '@liskhq/lisk-db';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { validator, LiskValidationError, ErrorObject } from '@liskhq/lisk-validator';
import * as _ from 'lodash';
import { systemDirs } from './system_dirs';
import { Controller, InMemoryChannel, ActionInfoObject } from '../controller';
import { version } from '../version';
import { constantsSchema, applicationConfigSchema } from './schema';
import { ApplicationState } from './application_state';
import { Network } from './network';
import { Node } from './node';
import { Logger, createLogger } from './logger';
import { mergeDeep } from './utils/merge_deep';

import { DuplicateAppInstanceError } from '../errors';
import { BasePlugin, InstantiablePlugin } from '../plugins/base_plugin';
import {
	ApplicationConfig,
	ApplicationConstants,
	GenesisConfig,
	EventPostTransactionData,
	PluginOptions,
} from '../types';
import { GenesisBlockJSON, genesisBlockFromJSON } from './genesis_block';
import { AccountAsset } from './node/account';

// eslint-disable-next-line @typescript-eslint/no-misused-promises
const rm = promisify(fs.unlink);

const isPidRunning = async (pid: number): Promise<boolean> =>
	psList().then(list => list.some(x => x.pid === pid));

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

export class Application {
	public config: ApplicationConfig;
	public constants: ApplicationConstants & GenesisConfig;
	public logger!: Logger;

	private _node!: Node;
	private _network!: Network;
	private _controller!: Controller;
	private _applicationState!: ApplicationState;
	private _transactions: { [key: number]: typeof BaseTransaction };
	private _plugins: { [key: string]: InstantiablePlugin<BasePlugin> };
	private _channel!: InMemoryChannel;

	private readonly _genesisBlock: GenesisBlock<AccountAsset>;
	private _blockchainDB!: KVStore;
	private _nodeDB!: KVStore;
	private _forgerDB!: KVStore;

	public constructor(genesisBlock: GenesisBlockJSON, config: Partial<ApplicationConfig> = {}) {
		const parsedGenesisBlock = genesisBlockFromJSON(genesisBlock);
		// TODO: Read hard coded value from configuration or constant
		const errors = validateGenesisBlock(parsedGenesisBlock, {
			roundLength: 103,
		});
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		this._genesisBlock = parsedGenesisBlock;

		// Don't change the object parameters provided
		// eslint-disable-next-line no-param-reassign
		const appConfig = _.cloneDeep(applicationConfigSchema.default);

		appConfig.label =
			config.label ??
			`lisk-${this._genesisBlock.header.transactionRoot.toString('base64').slice(0, 7)}`;

		const mergedConfig = mergeDeep({}, appConfig, config) as ApplicationConfig;
		mergedConfig.rootPath = mergedConfig.rootPath.replace('~', os.homedir());
		const applicationConfigErrors = validator.validate(applicationConfigSchema, mergedConfig);
		if (applicationConfigErrors.length) {
			throw new LiskValidationError(applicationConfigErrors as ErrorObject[]);
		}

		// app.genesisConfig are actually old constants
		// we are merging these here to refactor the underlying code in other iteration
		this.constants = {
			...constantsSchema.default,
			...mergedConfig.genesisConfig,
		};
		this.config = mergedConfig;

		// Private members
		this._plugins = {};
		this._transactions = {};

		this.registerTransaction(TransferTransaction);
		this.registerTransaction(DelegateTransaction);
		this.registerTransaction(MultisignatureTransaction);
		this.registerTransaction(VoteTransaction);
		this.registerTransaction(UnlockTransaction);
		this.registerTransaction(ProofOfMisbehaviorTransaction);
	}

	public registerPlugin(
		pluginKlass: typeof BasePlugin,
		options: PluginOptions = {
			loadAsChildProcess: false,
		},
		alias?: string,
	): void {
		assert(pluginKlass, 'ModuleSpec is required');
		assert(typeof options === 'object', 'Module options must be provided or set to empty object.');
		assert(alias ?? pluginKlass.alias, 'Module alias must be provided.');
		const pluginAlias = alias ?? pluginKlass.alias;
		assert(
			!Object.keys(this.getPlugins()).includes(pluginAlias),
			`A plugin with alias "${pluginAlias}" already registered.`,
		);

		this.config.plugins[pluginAlias] = Object.assign(
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			this.config.plugins[pluginAlias] ?? {},
			options,
		);
		this._plugins[pluginAlias] = pluginKlass as InstantiablePlugin<BasePlugin>;
	}

	public overridePluginOptions(alias: string, options?: PluginOptions): void {
		const plugins = this.getPlugins();
		assert(Object.keys(plugins).includes(alias), `No plugin ${alias} is registered`);
		this.config.plugins[alias] = {
			...this.config.plugins[alias],
			...options,
		};
	}

	public registerTransaction(
		Transaction: typeof BaseTransaction,
		{ matcher }: { matcher?: (context: Contexter) => boolean } = {},
	): void {
		assert(Transaction, 'Transaction implementation is required');

		assert(Number.isInteger(Transaction.TYPE), 'Transaction type is required as an integer');

		assert(
			!Object.keys(this.getTransactions()).includes(Transaction.TYPE.toString()),
			`A transaction type "${Transaction.TYPE}" is already registered.`,
		);

		const transactionSchemaErrors = validator.validate(transactionInterface, Transaction.prototype);
		if (transactionSchemaErrors.length) {
			throw new LiskValidationError(transactionSchemaErrors as ErrorObject[]);
		}

		if (matcher) {
			Object.defineProperty(Transaction.prototype, 'matcher', {
				get: () => matcher,
			});
		}

		this._transactions[Transaction.TYPE] = Object.freeze(Transaction);
	}

	public getTransactions(): { [key: number]: typeof BaseTransaction } {
		return this._transactions;
	}

	public getTransaction(transactionType: number): typeof BaseTransaction {
		return this._transactions[transactionType];
	}

	public getPlugin(alias: string): InstantiablePlugin<BasePlugin> {
		return this._plugins[alias];
	}

	public getPlugins(): { [key: string]: InstantiablePlugin<BasePlugin> } {
		return this._plugins;
	}

	public async run(): Promise<void> {
		// Freeze every plugin and configuration so it would not interrupt the app execution
		this._compileAndValidateConfigurations();

		Object.freeze(this._genesisBlock);
		Object.freeze(this.constants);
		Object.freeze(this.config);

		registerProcessHooks(this);

		// Initialize directories
		await this._setupDirectories();

		// Initialize logger
		this.logger = this._initLogger();
		this.logger.info(`Starting the app - ${this.config.label}`);
		this.logger.info(
			'If you experience any type of error, please open an issue on Lisk GitHub: https://github.com/LiskHQ/lisk-sdk/issues',
		);
		this.logger.info(
			'Contribution guidelines can be found at Lisk-docs: https://github.com/LiskHQ/lisk-docs/blob/build/CONTRIBUTING.adoc',
		);
		this.logger.info(`Booting the application with Lisk Framework(${version})`);

		// Validate the instance
		await this._validatePidFile();

		// Initialize database instances
		this._forgerDB = this._getDBInstance(this.config, 'forger.db');
		this._blockchainDB = this._getDBInstance(this.config, 'blockchain.db');
		this._nodeDB = this._getDBInstance(this.config, 'node.db');

		// Initialize all objects
		this._applicationState = this._initApplicationState();
		this._channel = this._initChannel();
		this._applicationState.channel = this._channel;

		this._controller = this._initController();
		this._network = this._initNetwork();
		this._node = this._initNode();

		await this._controller.load(this.getPlugins(), this.config.plugins);

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

		try {
			await this._network.cleanup();
			await this._node.cleanup();
			await this._blockchainDB.close();
			await this._forgerDB.close();
			await this._nodeDB.close();
			await this._emptySocketsDirectory();
		} catch (error) {
			this.logger.fatal({ err: error as Error }, 'failed to shutdown');
		}

		process.exit(errorCode);
	}

	// --------------------------------------
	// Private
	// --------------------------------------
	private _compileAndValidateConfigurations(): void {
		const plugins = this.getPlugins();
		this.config.networkId = getNetworkIdentifier(
			this._genesisBlock.header.transactionRoot,
			this.config.genesisConfig.communityIdentifier,
		).toString('base64');

		// TODO: Check which config and options are actually required to avoid sending large data
		const appConfigToShareWithPlugin = {
			version: this.config.version,
			protocolVersion: this.config.protocolVersion,
			networkId: this.config.networkId,
			// TODO: Analyze if we need to provide genesis block as options to plugins
			//  If yes then we should encode it to json with the issue https://github.com/LiskHQ/lisk-sdk/issues/5513
			// genesisBlock: this._genesisBlock,
			constants: this.constants,
			lastCommitId: this.config.lastCommitId,
			buildVersion: this.config.buildVersion,
		};

		Object.keys(plugins).forEach(alias => {
			this.overridePluginOptions(alias, appConfigToShareWithPlugin);
		});
	}

	private _initLogger(): Logger {
		const dirs = systemDirs(this.config.label, this.config.rootPath);
		return createLogger({
			...this.config.logger,
			logFilePath: path.join(dirs.logs, this.config.logger.logFileName),
			module: 'lisk:app',
		});
	}

	private _initApplicationState(): ApplicationState {
		return new ApplicationState({
			initialState: {
				version: this.config.version,
				protocolVersion: this.config.protocolVersion,
				networkId: this.config.networkId,
				wsPort: this.config.network.wsPort,
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
				'block:new',
				'block:broadcast',
				'block:delete',
			],
			{
				getConnectedPeers: {
					handler: (_action: ActionInfoObject) => this._network.getConnectedPeers(),
				},
				getDisconnectedPeers: {
					handler: (_action: ActionInfoObject) => this._network.getDisconnectedPeers(),
				},
				getForgerAddressesForRound: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getForgerAddressesForRound(action.params as { round: number }),
				},
				updateForgingStatus: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.updateForgingStatus(
							action.params as {
								publicKey: string;
								password: string;
								forging: boolean;
							},
						),
				},
				getForgingStatusOfAllDelegates: {
					handler: (_action: ActionInfoObject) =>
						this._node.actions.getForgingStatusOfAllDelegates(),
				},
				getTransactionsFromPool: {
					handler: (_action: ActionInfoObject) => this._node.actions.getTransactionsFromPool(),
				},
				getTransactions: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getTransactions(action.params as { data: unknown; peerId: string }),
					isPublic: true,
				},
				postTransaction: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.postTransaction(action.params as EventPostTransactionData),
				},
				getNodeStatus: {
					handler: (_action: ActionInfoObject) => this._node.actions.getNodeStatus(),
				},
				getLastBlock: {
					handler: async (_action: ActionInfoObject) => this._node.actions.getLastBlock(),
					isPublic: true,
				},
				getBlocksFromId: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getBlocksFromId(action.params as { data: unknown; peerId: string }),
					isPublic: true,
				},
				getHighestCommonBlock: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getHighestCommonBlock(
							action.params as { data: unknown; peerId: string },
						),
					isPublic: true,
				},
				getAccount: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getAccount(action.params as { address: string }),
				},
				getAccounts: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getAccounts(action.params as { address: readonly string[] }),
				},
				getBlockByID: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getBlockByID(action.params as { id: string }),
				},
				getBlocksByIDs: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getBlocksByIDs(action.params as { ids: readonly string[] }),
				},
				getBlockByHeight: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getBlockByHeight(action.params as { height: number }),
				},
				getBlocksByHeightBetween: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getBlocksByHeightBetween(
							action.params as { from: number; to: number },
						),
				},
				getTransactionByID: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getTransactionByID(action.params as { id: string }),
				},
				getTransactionsByIDs: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getTransactionsByIDs(action.params as { ids: readonly string[] }),
				},
				getSchema: {
					handler: () => this._node.actions.getSchema(),
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
			channel: this._channel,
		});
	}

	private _initNetwork(): Network {
		const network = new Network({
			options: this.config.network,
			logger: this.logger,
			channel: this._channel,
			nodeDB: this._nodeDB,
			applicationState: this._applicationState,
		});

		return network;
	}

	private _initNode(): Node {
		const { plugins, ...rootConfigs } = this.config;
		const { network, ...nodeConfigs } = rootConfigs;
		// Decode JSON into object
		const convertedDelegates = nodeConfigs.forging.delegates.map(delegate => ({
			...delegate,
			address: Buffer.from(delegate.address, 'base64'),
			hashOnion: {
				...delegate.hashOnion,
				hashes: delegate.hashOnion.hashes.map(h => Buffer.from(h, 'base64')),
			},
		}));
		const node = new Node({
			channel: this._channel,
			options: {
				...nodeConfigs,
				communityIdentifier: nodeConfigs.genesisConfig.communityIdentifier,
				forging: {
					...nodeConfigs.forging,
					delegates: convertedDelegates,
				},
				genesisBlock: this._genesisBlock,
				constants: {
					...this.constants,
					totalAmount: BigInt(this.constants.totalAmount),
				},
				registeredTransactions: this.getTransactions(),
			},
			logger: this.logger,
			forgerDB: this._forgerDB,
			blockchainDB: this._blockchainDB,
			applicationState: this._applicationState,
			networkModule: this._network,
		});

		return node;
	}

	// eslint-disable-next-line class-methods-use-this
	private async _setupDirectories(): Promise<void> {
		const dirs = systemDirs(this.config.label, this.config.rootPath);
		await Promise.all(Array.from(Object.values(dirs)).map(async dirPath => fs.ensureDir(dirPath)));
	}

	private async _emptySocketsDirectory(): Promise<void> {
		const { sockets } = systemDirs(this.config.label, this.config.rootPath);
		const socketFiles = fs.readdirSync(sockets);

		await Promise.all(socketFiles.map(async aSocketFile => rm(path.join(sockets, aSocketFile))));
	}

	private async _validatePidFile(): Promise<void> {
		const dirs = systemDirs(this.config.label, this.config.rootPath);
		const pidPath = `${dirs.pids}/controller.pid`;
		const pidExists = await fs.pathExists(pidPath);
		if (pidExists) {
			const pid = parseInt((await fs.readFile(pidPath)).toString(), 10);
			const pidRunning = await isPidRunning(pid);

			this.logger.info({ pid }, 'Previous Lisk PID');
			this.logger.info({ pid: process.pid }, 'Current Lisk PID');

			if (pidRunning && pid !== process.pid) {
				this.logger.error(
					{ appLabel: this.config.label },
					'An instance of application is already running, please change the application label to run another instance',
				);
				throw new DuplicateAppInstanceError(this.config.label, pidPath);
			}
		}
		await fs.writeFile(pidPath, process.pid);
	}

	private _getDBInstance(options: ApplicationConfig, dbName: string): KVStore {
		const dirs = systemDirs(options.label, options.rootPath);
		const dbPath = `${dirs.data}/${dbName}`;
		this.logger.debug({ dbName, dbPath }, 'Create database instance.');
		return new KVStore(dbPath);
	}
}
