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
import { KVStore } from '@liskhq/lisk-db';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { objects } from '@liskhq/lisk-utils';
import { systemDirs } from './system_dirs';
import { Controller, InMemoryChannel, ActionInfoObject } from '../controller';
import { version } from '../version';
import { constantsSchema, applicationConfigSchema } from './schema';
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
import { BaseModule, TokenModule, SequenceModule, KeysModule, DPoSModule } from '../modules';

// eslint-disable-next-line @typescript-eslint/no-misused-promises
const rm = promisify(fs.unlink);

const isPidRunning = async (pid: number): Promise<boolean> =>
	psList().then(list => list.some(x => x.pid === pid));

const registerProcessHooks = (app: Application): void => {
	const handleShutdown = async (code: number, message: string) => {
		await app.shutdown(code, message);
	};

	process.title = `${app.config.label}(${app.config.version})`;

	process.on('uncaughtException', err => {
		// Handle error safely
		app.logger.error(
			{
				err,
			},
			'System error: uncaughtException',
		);

		handleShutdown(1, err.message).catch((error: Error) => app.logger.error({ error }));
	});

	process.on('unhandledRejection', err => {
		// Handle error safely
		app.logger.fatal(
			{
				err,
			},
			'System error: unhandledRejection',
		);

		handleShutdown(1, (err as Error).message).catch((error: Error) => app.logger.error({ error }));
	});

	process.once('SIGTERM', () => {
		handleShutdown(0, 'SIGTERM').catch((error: Error) => app.logger.error({ error }));
	});

	process.once('SIGINT', () => {
		handleShutdown(0, 'SIGINT').catch((error: Error) => app.logger.error({ error }));
	});

	process.once('exit' as any, (code: number) => {
		handleShutdown(code, 'process.exit').catch((error: Error) => app.logger.error({ error }));
	});
};

type InstantiableBaseModule = new (genesisConfig: GenesisConfig) => BaseModule;

export class Application {
	public config: ApplicationConfig;
	public constants: ApplicationConstants & GenesisConfig;
	public logger!: Logger;

	private _node!: Node;
	private _network!: Network;
	private _controller!: Controller;
	private readonly _customModules: InstantiableBaseModule[];
	private _plugins: { [key: string]: InstantiablePlugin<BasePlugin> };
	private _channel!: InMemoryChannel;

	private readonly _genesisBlock: Record<string, unknown>;
	private _blockchainDB!: KVStore;
	private _nodeDB!: KVStore;
	private _forgerDB!: KVStore;

	public constructor(
		genesisBlock: Record<string, unknown>,
		config: Partial<ApplicationConfig> = {},
	) {
		// Don't change the object parameters provided
		this._genesisBlock = genesisBlock;
		const appConfig = objects.cloneDeep(applicationConfigSchema.default);

		appConfig.label =
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			config.label ?? `lisk-${config.genesisConfig?.communityIdentifier}`;

		const mergedConfig = mergeDeep({}, appConfig, config) as ApplicationConfig;
		mergedConfig.rootPath = mergedConfig.rootPath.replace('~', os.homedir());
		const applicationConfigErrors = validator.validate(applicationConfigSchema, mergedConfig);
		if (applicationConfigErrors.length) {
			throw new LiskValidationError(applicationConfigErrors);
		}

		// app.genesisConfig are actually old constants
		// we are merging these here to refactor the underlying code in other iteration
		// eslint-disable-next-line
		this.constants = {
			...constantsSchema.default,
			...mergedConfig.genesisConfig,
		};
		this.config = mergedConfig;

		// Private members
		this._plugins = {};
		this._customModules = [];
	}

	public static defaultApplication(
		genesisBlock: Record<string, unknown>,
		config: Partial<ApplicationConfig> = {},
	): Application {
		const application = new Application(genesisBlock, config);
		application.registerModule(TokenModule);
		application.registerModule(SequenceModule);
		application.registerModule(KeysModule);
		application.registerModule(DPoSModule);

		return application;
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
			!Object.keys(this._plugins).includes(pluginAlias),
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
		assert(Object.keys(this._plugins).includes(alias), `No plugin ${alias} is registered`);
		this.config.plugins[alias] = {
			...this.config.plugins[alias],
			...options,
		};
	}

	public registerModule(Module: typeof BaseModule): void {
		assert(Module, 'Module implementation is required');

		this._customModules.push(Module as InstantiableBaseModule);
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
		this._channel = this._initChannel();

		this._controller = this._initController();
		this._network = this._initNetwork();
		this._node = this._initNode();

		await this._controller.load();

		await this._node.bootstrap();
		await this._network.bootstrap(this._node.networkIdentifier);

		await this._controller.loadPlugins(this._plugins, this.config.plugins);
		this.logger.debug(this._controller.bus.getEvents(), 'Application listening to events');
		this.logger.debug(this._controller.bus.getActions(), 'Application ready for actions');

		this._channel.publish('app:ready');
	}

	public async shutdown(errorCode = 0, message = ''): Promise<void> {
		this.logger.info({ errorCode, message }, 'Application shutdown started');

		if (this._controller) {
			this._channel.publish('app:shutdown');
			await this._controller.cleanup(errorCode, message);
		}

		try {
			await this._node.cleanup();
			await this._network.cleanup();
			await this._blockchainDB.close();
			await this._forgerDB.close();
			await this._nodeDB.close();
			await this._emptySocketsDirectory();
			this.logger.info({ errorCode, message }, 'Application shutdown completed');
		} catch (error) {
			this.logger.fatal({ err: error as Error }, 'Application shutdown failed');
		} finally {
			// Unfreeze the configuration
			this.config = mergeDeep({}, this.config) as ApplicationConfig;

			// To avoid redundant shutdown call
			process.removeAllListeners('exit');
			process.exit(errorCode);
		}
	}

	// --------------------------------------
	// Private
	// --------------------------------------
	private _compileAndValidateConfigurations(): void {
		// TODO: Check which config and options are actually required to avoid sending large data
		const appConfigToShareWithPlugin = {
			version: this.config.version,
			networkVersion: this.config.networkVersion,
			// TODO: Analyze if we need to provide genesis block as options to plugins
			//  If yes then we should encode it to json with the issue https://github.com/LiskHQ/lisk-sdk/issues/5513
			// genesisBlock: this._genesisBlock,
			constants: this.constants,
			lastCommitId: this.config.lastCommitId,
			buildVersion: this.config.buildVersion,
		};

		Object.keys(this._plugins).forEach(alias => {
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

	private _initChannel(): InMemoryChannel {
		/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
		/* eslint-disable @typescript-eslint/explicit-function-return-type */
		return new InMemoryChannel(
			'app',
			[
				'ready',
				'shutdown',
				'network:event',
				'network:ready',
				'transaction:new',
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
				getForgers: {
					handler: async (_action: ActionInfoObject) => this._node.actions.getValidators(),
				},
				updateForgingStatus: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.updateForgingStatus(
							action.params as {
								address: string;
								password: string;
								forging: boolean;
							},
						),
				},
				getForgingStatus: {
					handler: (_action: ActionInfoObject) =>
						this._node.actions.getForgingStatusOfAllDelegates(),
				},
				getTransactionsFees: {
					handler: (_action: ActionInfoObject) => this._node.actions.getTransactionsFees(),
				},
				getTransactionsFromPool: {
					handler: (_action: ActionInfoObject) => this._node.actions.getTransactionsFromPool(),
				},
				getTransactions: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getTransactions(action.params as { data: unknown; peerId: string }),
				},
				postTransaction: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.postTransaction(action.params as EventPostTransactionData),
				},
				getLastBlock: {
					handler: async (_action: ActionInfoObject) => this._node.actions.getLastBlock(),
				},
				getBlocksFromId: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getBlocksFromId(action.params as { data: unknown; peerId: string }),
				},
				getHighestCommonBlock: {
					handler: async (action: ActionInfoObject) =>
						this._node.actions.getHighestCommonBlock(
							action.params as { data: unknown; peerId: string },
						),
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
				getNodeInfo: {
					handler: () => this._node.actions.getNodeInfo(),
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
			networkVersion: this.config.networkVersion,
			options: this.config.network,
			logger: this.logger,
			channel: this._channel,
			nodeDB: this._nodeDB,
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
				forging: {
					...nodeConfigs.forging,
					delegates: convertedDelegates,
				},
				genesisBlock: this._genesisBlock,
				genesisConfig: {
					...this.constants,
				},
			},
			logger: this.logger,
			forgerDB: this._forgerDB,
			blockchainDB: this._blockchainDB,
			networkModule: this._network,
			customModules: this._customModules,
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
