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
import { objects, jobHandlers } from '@liskhq/lisk-utils';
import { systemDirs } from './system_dirs';
import { Controller, InMemoryChannel, ActionInfoObject } from './controller';
import { applicationConfigSchema } from './schema';
import { Node } from './node';
import { Logger, createLogger } from './logger';

import { DuplicateAppInstanceError } from './errors';
import { BasePlugin, InstantiablePlugin } from './plugins/base_plugin';
import {
	ApplicationConfig,
	GenesisConfig,
	EventPostTransactionData,
	PluginOptions,
	RegisteredSchema,
	RegisteredModule,
} from './types';
import { BaseModule, TokenModule, SequenceModule, KeysModule, DPoSModule } from './modules';

const RUN_WAIT_TIMEOUT = 3000;
const MINIMUM_EXTERNAL_MODULE_ID = 1000;
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	process.once('exit' as any, (code: number) => {
		handleShutdown(code, 'process.exit').catch((error: Error) => app.logger.error({ error }));
	});
};

type InstantiableBaseModule = new (genesisConfig: GenesisConfig) => BaseModule;

export class Application {
	public config: ApplicationConfig;
	public logger!: Logger;

	private readonly _node: Node;
	private _controller!: Controller;
	private _plugins: { [key: string]: InstantiablePlugin<BasePlugin> };
	private _channel!: InMemoryChannel;
	private _loadingProcess!: jobHandlers.Defer<boolean>;

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

		const mergedConfig = objects.mergeDeep({}, appConfig, config) as ApplicationConfig;
		mergedConfig.rootPath = mergedConfig.rootPath.replace('~', os.homedir());
		const applicationConfigErrors = validator.validate(applicationConfigSchema, mergedConfig);
		if (applicationConfigErrors.length) {
			throw new LiskValidationError(applicationConfigErrors);
		}
		this.config = mergedConfig;

		// Private members
		this._plugins = {};
		// Initialize node
		const { plugins, ...rootConfigs } = this.config;
		this._node = new Node({
			genesisBlockJSON: this._genesisBlock,
			options: rootConfigs,
		});
	}

	public get networkIdentifier(): Buffer {
		return this._node.networkIdentifier;
	}

	public static defaultApplication(
		genesisBlock: Record<string, unknown>,
		config: Partial<ApplicationConfig> = {},
	): Application {
		const application = new Application(genesisBlock, config);
		application._registerModule(TokenModule);
		application._registerModule(SequenceModule);
		application._registerModule(KeysModule);
		application._registerModule(DPoSModule);

		return application;
	}

	public registerPlugin(
		pluginKlass: typeof BasePlugin,
		options: PluginOptions = {
			loadAsChildProcess: false,
		},
		alias?: string,
	): void {
		assert(pluginKlass, 'Plugin implementation is required');
		assert(typeof options === 'object', 'Plugin options must be provided or set to empty object.');
		assert(alias ?? pluginKlass.alias, 'Plugin alias must be provided.');
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
		this._registerModule(Module, true);
	}

	public getSchema(): RegisteredSchema {
		return this._node.getSchema();
	}

	public getRegisteredModules(): RegisteredModule[] {
		return this._node.getRegisteredModules();
	}

	public async run(): Promise<void> {
		// Freeze every plugin and configuration so it would not interrupt the app execution
		this._compileAndValidateConfigurations();

		Object.freeze(this._genesisBlock);
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
			'Contribution guidelines can be found at Lisk-sdk: https://github.com/LiskHQ/lisk-sdk/blob/development/docs/CONTRIBUTING.md',
		);
		this.logger.info(`Booting the application with Lisk Framework(${this.config.version})`);

		// Validate the instance
		await this._validatePidFile();

		// Initialize database instances
		this._forgerDB = this._getDBInstance(this.config, 'forger.db');
		this._blockchainDB = this._getDBInstance(this.config, 'blockchain.db');
		this._nodeDB = this._getDBInstance(this.config, 'node.db');

		// Initialize all objects
		this._loadingProcess = new jobHandlers.Defer<boolean>(
			RUN_WAIT_TIMEOUT,
			`Application could not started in ${RUN_WAIT_TIMEOUT}ms`,
		);

		this._channel = this._initChannel();

		this._controller = this._initController();

		await this._controller.load();

		await this._node.init({
			bus: this._controller.bus,
			channel: this._channel,
			forgerDB: this._forgerDB,
			blockchainDB: this._blockchainDB,
			nodeDB: this._nodeDB,
			logger: this.logger,
		});

		this._loadingProcess.resolve(true);

		await this._controller.loadPlugins(this._plugins, this.config.plugins);
		this.logger.debug(this._controller.bus.getEvents(), 'Application listening to events');
		this.logger.debug(this._controller.bus.getActions(), 'Application ready for actions');

		this._channel.publish('app:ready');
	}

	public async shutdown(errorCode = 0, message = ''): Promise<void> {
		this.logger.info({ errorCode, message }, 'Application shutdown started');

		// Wait if the loading process still in progress
		if (this._loadingProcess) {
			await this._loadingProcess.promise;
		}

		try {
			this._channel.publish('app:shutdown');
			await this._node.cleanup();
			await this._controller.cleanup(errorCode, message);
			await this._blockchainDB.close();
			await this._forgerDB.close();
			await this._nodeDB.close();
			await this._emptySocketsDirectory();
			this._clearControllerPidFile();
			this.logger.info({ errorCode, message }, 'Application shutdown completed');
		} catch (error) {
			this.logger.fatal({ err: error as Error }, 'Application shutdown failed');
		} finally {
			// Unfreeze the configuration
			this.config = objects.mergeDeep({}, this.config) as ApplicationConfig;

			// To avoid redundant shutdown call
			process.removeAllListeners('exit');
			process.exit(errorCode);
		}
	}

	// --------------------------------------
	// Private
	// --------------------------------------

	private _registerModule(Module: typeof BaseModule, validateModuleID = false): void {
		assert(Module, 'Module implementation is required');
		const InstantiableModule = Module as InstantiableBaseModule;
		const moduleInstance = new InstantiableModule(this.config.genesisConfig);
		if (validateModuleID && moduleInstance.id < MINIMUM_EXTERNAL_MODULE_ID) {
			throw new Error(
				`Custom module must have id greater than or equal to ${MINIMUM_EXTERNAL_MODULE_ID}`,
			);
		}
		this._node.registerModule(moduleInstance);
	}

	private _compileAndValidateConfigurations(): void {
		const appConfigToShareWithPlugin = {
			version: this.config.version,
			networkVersion: this.config.networkVersion,
			genesisConfig: this.config.genesisConfig,
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
				'chain:validators:change',
				'block:new',
				'block:broadcast',
				'block:delete',
			],
			{
				getConnectedPeers: {
					handler: (_action: ActionInfoObject) => this._node.actions.getConnectedPeers(),
				},
				getDisconnectedPeers: {
					handler: (_action: ActionInfoObject) => this._node.actions.getDisconnectedPeers(),
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
					handler: (_action: ActionInfoObject) => this._node.actions.getForgingStatus(),
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
					handler: (action: ActionInfoObject) =>
						this._node.actions.getLastBlock(action.params as { peerId: string }),
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
				getRegisteredModules: {
					handler: () => this._node.actions.getRegisteredModules(),
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
		const pidPath = path.join(dirs.pids, 'controller.pid');
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

	private _clearControllerPidFile() {
		const dirs = systemDirs(this.config.label, this.config.rootPath);
		fs.unlinkSync(path.join(dirs.pids, 'controller.pid'));
	}

	private _getDBInstance(options: ApplicationConfig, dbName: string): KVStore {
		const dirs = systemDirs(options.label, options.rootPath);
		const dbPath = `${dirs.data}/${dbName}`;
		this.logger.debug({ dbName, dbPath }, 'Create database instance.');
		return new KVStore(dbPath);
	}
}
