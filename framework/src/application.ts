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
import * as path from 'path';
import * as psList from 'ps-list';
import * as assert from 'assert';
import { Block } from '@liskhq/lisk-chain';
import { KVStore } from '@liskhq/lisk-db';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { objects, jobHandlers } from '@liskhq/lisk-utils';
import { APP_EVENT_SHUTDOWN, APP_EVENT_READY } from './constants';
import {
	ApplicationConfig,
	PluginConfig,
	RegisteredSchema,
	RegisteredModule,
	PartialApplicationConfig,
	EndpointHandlers,
	PluginEndpointContext,
} from './types';

import { BasePlugin } from './plugins/base_plugin';
import { systemDirs } from './system_dirs';
import { Controller, InMemoryChannel } from './controller';
import { applicationConfigSchema } from './schema';
import { Node } from './node';
import { Logger, createLogger } from './logger';

import { DuplicateAppInstanceError } from './errors';
import { BaseModule } from './modules/base_module';
import { getEndpointHandlers, mergeEndpointHandlers } from './endpoint';
import { ValidatorsAPI } from './modules/validators';
import { BFTAPI } from './modules/bft';
import { TokenModule, TokenAPI } from './modules/token';
import { AuthModule, AuthAPI } from './modules/auth';
import { FeeModule, FeeAPI } from './modules/fee';
import { RewardModule, RewardAPI } from './modules/reward';
import { RandomModule, RandomAPI } from './modules/random';
import { DPoSModule, DPoSAPI } from './modules/dpos_v2';
import { GenesisBlockGenerateInput } from './node/generator';

const MINIMUM_EXTERNAL_MODULE_ID = 1000;

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

interface DefaultApplication {
	app: Application;
	api: {
		validator: ValidatorsAPI;
		bft: BFTAPI;
		auth: AuthAPI;
		token: TokenAPI;
		fee: FeeAPI;
		random: RandomAPI;
		reward: RewardAPI;
		dpos: DPoSAPI;
	};
}

export class Application {
	public config: ApplicationConfig;
	public logger!: Logger;

	private readonly _node: Node;
	private readonly _controller: Controller;

	private _blockchainDB!: KVStore;
	private _nodeDB!: KVStore;
	private _forgerDB!: KVStore;

	private readonly _mutex = new jobHandlers.Mutex();

	public constructor(config: PartialApplicationConfig = {}) {
		const appConfig = objects.cloneDeep(applicationConfigSchema.default);

		appConfig.label =
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			config.label ?? `lisk-${config.genesisConfig?.communityIdentifier}`;

		const mergedConfig = objects.mergeDeep({}, appConfig, config) as ApplicationConfig;
		const applicationConfigErrors = validator.validate(applicationConfigSchema, mergedConfig);
		if (applicationConfigErrors.length) {
			throw new LiskValidationError(applicationConfigErrors);
		}
		this.config = mergedConfig;

		// Initialize node
		const { plugins, ...rootConfigs } = this.config;
		this._node = new Node({
			options: rootConfigs,
		});
		this._controller = new Controller({
			appConfig: rootConfigs,
			pluginConfigs: plugins,
		});
	}

	public get networkIdentifier(): Buffer {
		return this._node.networkIdentifier;
	}

	public get channel(): InMemoryChannel {
		if (!this._controller.channel) {
			throw new Error('Controller is not initialized yet.');
		}
		return this._controller.channel;
	}

	public get validatorAPI(): ValidatorsAPI {
		return this._node.validatorAPI;
	}

	public get bftAPI(): BFTAPI {
		return this._node.bftAPI;
	}

	public static defaultApplication(config: PartialApplicationConfig = {}): DefaultApplication {
		const application = new Application(config);
		// create module instances
		const authModule = new AuthModule();
		const tokenModule = new TokenModule();
		const feeModule = new FeeModule();
		const rewardModule = new RewardModule();
		const randomModule = new RandomModule();
		const dposModule = new DPoSModule();

		// resolve dependencies
		feeModule.addDependencies(tokenModule.api);
		rewardModule.addDependencies(tokenModule.api, randomModule.api, application.bftAPI);
		dposModule.addDependencies(
			randomModule.api,
			application.bftAPI,
			application.validatorAPI,
			tokenModule.api,
		);

		// register modules
		application._registerModule(authModule);
		application._registerModule(tokenModule);
		application._registerModule(feeModule);
		application._registerModule(rewardModule);
		application._registerModule(randomModule);
		application._registerModule(dposModule);

		return {
			app: application,
			api: {
				validator: application._node.validatorAPI,
				bft: application._node.bftAPI,
				token: tokenModule.api,
				auth: authModule.api,
				fee: feeModule.api,
				dpos: dposModule.api,
				random: randomModule.api,
				reward: rewardModule.api,
			},
		};
	}

	public registerPlugin(
		plugin: BasePlugin,
		options: PluginConfig = { loadAsChildProcess: false },
	): void {
		this._controller.registerPlugin(plugin, options);
	}

	public registerModule(Module: BaseModule): void {
		this._registerModule(Module, true);
	}

	public getSchema(): RegisteredSchema {
		return this._node.getSchema();
	}

	public getRegisteredModules(): RegisteredModule[] {
		return this._node.getRegisteredModules();
	}

	public async run(genesisBlock: Block): Promise<void> {
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

		await this._mutex.runExclusive<void>(async () => {
			// Initialize all objects
			this._controller.init({
				logger: this.logger,
				blockchainDB: this._blockchainDB,
				endpoints: this._rootEndpoints(),
				events: this._rootEvents(),
				networkIdentifier: this.networkIdentifier,
			});

			await this._node.init({
				channel: this.channel,
				genesisBlock,
				forgerDB: this._forgerDB,
				blockchainDB: this._blockchainDB,
				nodeDB: this._nodeDB,
				logger: this.logger,
			});

			await this._controller.start();
			await this._node.start();
			this.logger.debug(this._controller.getEvents(), 'Application listening to events');
			this.logger.debug(this._controller.getEndpoints(), 'Application ready for actions');

			this.channel.publish(APP_EVENT_READY);
		});
	}

	public async shutdown(errorCode = 0, message = ''): Promise<void> {
		this.logger.info({ errorCode, message }, 'Application shutdown started');
		// See if we can acquire mutex meant app is still loading or not
		const release = await this._mutex.acquire();

		try {
			this.channel.publish(APP_EVENT_SHUTDOWN);
			await this._node.stop();
			await this._controller.stop(errorCode, message);
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
			release();

			// To avoid redundant shutdown call
			process.removeAllListeners('exit');
			process.exit(errorCode);
		}
	}

	public async generateGenesisBlock(input: GenesisBlockGenerateInput): Promise<Block> {
		return this._node.generateGenesisBlock(input);
	}

	// --------------------------------------
	// Private
	// --------------------------------------

	private _registerModule(mod: BaseModule, validateModuleID = false): void {
		assert(mod, 'Module implementation is required');
		if (validateModuleID && mod.id < MINIMUM_EXTERNAL_MODULE_ID) {
			throw new Error(
				`Custom module must have id greater than or equal to ${MINIMUM_EXTERNAL_MODULE_ID}`,
			);
		}
		this._node.registerModule(mod);
		this._controller.registerEndpoint(mod.name, getEndpointHandlers(mod.endpoint));
	}

	private _initLogger(): Logger {
		const dirs = systemDirs(this.config.label, this.config.rootPath);
		return createLogger({
			...this.config.logger,
			logFilePath: path.join(dirs.logs, this.config.logger.logFileName),
			module: 'lisk:app',
		});
	}

	private _rootEndpoints(): EndpointHandlers {
		const nodeEndpoint = this._node.getEndpoints();
		const applicationEndpoint: EndpointHandlers = {
			// eslint-disable-next-line @typescript-eslint/require-await
			getRegisteredActions: async (_: PluginEndpointContext) => this._controller.getEndpoints(),
			// eslint-disable-next-line @typescript-eslint/require-await
			getRegisteredEvents: async (_: PluginEndpointContext) => this._controller.getEvents(),
		};
		return mergeEndpointHandlers(applicationEndpoint, nodeEndpoint);
	}

	private _rootEvents(): string[] {
		const nodeEvents = this._node.getEvents();
		return [
			APP_EVENT_READY.replace('app:', ''),
			APP_EVENT_SHUTDOWN.replace('app:', ''),
			...nodeEvents,
		];
	}

	private async _setupDirectories(): Promise<void> {
		const dirs = systemDirs(this.config.label, this.config.rootPath);
		await Promise.all(Array.from(Object.values(dirs)).map(async dirPath => fs.ensureDir(dirPath)));
	}

	private async _emptySocketsDirectory(): Promise<void> {
		const { sockets } = systemDirs(this.config.label, this.config.rootPath);
		const socketFiles = fs.readdirSync(sockets);

		await Promise.all(
			socketFiles.map(async aSocketFile => fs.unlink(path.join(sockets, aSocketFile))),
		);
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
