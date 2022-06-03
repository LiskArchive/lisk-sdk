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
import * as childProcess from 'child_process';
import { Block } from '@liskhq/lisk-chain';
import { KVStore } from '@liskhq/lisk-db';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { objects, jobHandlers } from '@liskhq/lisk-utils';
import { APP_EVENT_SHUTDOWN, APP_EVENT_READY } from './constants';
import {
	ApplicationConfig,
	PluginConfig,
	PartialApplicationConfig,
	EndpointHandlers,
	PluginEndpointContext,
} from './types';

import { BasePlugin } from './plugins/base_plugin';
import { systemDirs } from './system_dirs';
import { Controller, InMemoryChannel } from './controller';
import { applicationConfigSchema } from './schema';
import { Logger, createLogger } from './logger';

import { DuplicateAppInstanceError } from './errors';
import { BaseModule, ModuleMetadata } from './modules/base_module';
import { getEndpointHandlers, mergeEndpointHandlers } from './endpoint';
import { ValidatorsAPI, ValidatorsModule } from './modules/validators';
import { TokenModule, TokenAPI } from './modules/token';
import { AuthModule, AuthAPI } from './modules/auth';
import { FeeModule, FeeAPI } from './modules/fee';
import { RewardModule, RewardAPI } from './modules/reward';
import { RandomModule, RandomAPI } from './modules/random';
import { DPoSModule, DPoSAPI } from './modules/dpos_v2';
import { generateGenesisBlock, GenesisBlockGenerateInput } from './genesis_block';
import { StateMachine } from './state_machine';
import { ABIHandler, EVENT_ENGINE_READY } from './abi_handler/abi_handler';
import { ABIServer } from './abi_handler/abi_server';

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

	private readonly _controller: Controller;
	private readonly _registeredModules: BaseModule[] = [];
	private readonly _stateMachine: StateMachine;

	private _abiServer!: ABIServer;
	private _stateDB!: KVStore;
	private _moduleDB!: KVStore;
	private _abiHandler!: ABIHandler;
	private _engineProcess!: childProcess.ChildProcess;

	private readonly _mutex = new jobHandlers.Mutex();

	public constructor(config: PartialApplicationConfig = {}) {
		const appConfig = objects.cloneDeep(applicationConfigSchema.default);

		appConfig.label =
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			config.label ?? `lisk-${config.genesis?.communityIdentifier}`;

		const mergedConfig = objects.mergeDeep({}, appConfig, config) as ApplicationConfig;
		const applicationConfigErrors = validator.validate(applicationConfigSchema, mergedConfig);
		if (applicationConfigErrors.length) {
			throw new LiskValidationError(applicationConfigErrors);
		}
		this.config = mergedConfig;

		const { plugins, ...rootConfigs } = this.config;
		this._controller = new Controller({
			appConfig: rootConfigs,
			pluginConfigs: plugins,
		});
		this._stateMachine = new StateMachine();
	}

	public get channel(): InMemoryChannel {
		if (!this._controller.channel) {
			throw new Error('Controller is not initialized yet.');
		}
		return this._controller.channel;
	}

	public static defaultApplication(config: PartialApplicationConfig = {}): DefaultApplication {
		const application = new Application(config);
		// create module instances
		const authModule = new AuthModule();
		const tokenModule = new TokenModule();
		const feeModule = new FeeModule();
		const rewardModule = new RewardModule();
		const randomModule = new RandomModule();
		const validatorModule = new ValidatorsModule();
		const dposModule = new DPoSModule();

		// resolve dependencies
		feeModule.addDependencies(tokenModule.api);
		rewardModule.addDependencies(tokenModule.api, randomModule.api);
		dposModule.addDependencies(randomModule.api, validatorModule.api, tokenModule.api);

		// register modules
		application._registerModule(authModule);
		application._registerModule(validatorModule);
		application._registerModule(tokenModule);
		application._registerModule(feeModule);
		application._registerModule(rewardModule);
		application._registerModule(randomModule);
		application._registerModule(dposModule);

		return {
			app: application,
			api: {
				validator: validatorModule.api,
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		plugin: BasePlugin<any>,
		options: PluginConfig = { loadAsChildProcess: false },
	): void {
		this._controller.registerPlugin(plugin, options);
	}

	public registerModule(Module: BaseModule): void {
		this._registerModule(Module, true);
	}

	public getRegisteredModules(): BaseModule[] {
		return this._registeredModules;
	}

	public getMetadata(): (ModuleMetadata & { id: number; name: string })[] {
		const modules = this._registeredModules.map(mod => {
			const meta = mod.metadata();
			return {
				id: mod.id,
				name: mod.name,
				...meta,
			};
		});
		modules.sort((a, b) => a.id - b.id);

		return modules;
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
		this._moduleDB = this._getDBInstance(this.config, 'module.db');
		this._stateDB = this._getDBInstance(this.config, 'state.db');

		await this._mutex.runExclusive<void>(async () => {
			// Initialize all objects
			this._controller.init({
				logger: this.logger,
				blockchainDB: this._stateDB,
				endpoints: this._rootEndpoints(),
				events: [APP_EVENT_READY.replace('app_', ''), APP_EVENT_SHUTDOWN.replace('app_', '')],
			});
			await this._stateMachine.init(
				this.config.genesis,
				this.config.generation.modules,
				this.config.genesis.modules,
			);
			this._abiHandler = new ABIHandler({
				channel: this._controller.channel,
				config: this.config,
				genesisBlock,
				logger: this.logger,
				moduleDB: this._moduleDB,
				modules: this._registeredModules,
				stateDB: this._stateDB,
				stateMachine: this._stateMachine,
			});
			const abiSocketPath = `ipc://${path.join(
				systemDirs(this.config.label, this.config.rootPath).sockets,
				'abi.ipc',
			)}`;

			this._abiServer = new ABIServer(this.logger, abiSocketPath, this._abiHandler);
			this._abiHandler.event.on(EVENT_ENGINE_READY, () => {
				this._controller
					.start()
					.then(() => {
						this.logger.debug(this._controller.getEvents(), 'Application listening to events');
						this.logger.debug(this._controller.getEndpoints(), 'Application ready for actions');
						this.channel.publish(APP_EVENT_READY);
					})
					.catch(err => {
						this.logger.error({ err: err as Error }, 'Fail to start controller');
					});
			});
			await this._abiServer.start();
			const program = path.resolve(__dirname, 'engine_igniter');
			const parameters = [abiSocketPath, 'false'];
			this._engineProcess = childProcess.fork(program, parameters);
			this._engineProcess.on('exit', (code, signal) => {
				// If child process exited with error
				if (code !== null && code !== undefined && code !== 0) {
					this.logger.error({ code, signal: signal ?? '' }, 'Engine exited unexpectedly');
				}
				process.exit(code ?? 0);
			});
			this._engineProcess.on('error', error => {
				this.logger.error({ err: error }, `Engine signaled error.`);
			});
		});
	}

	public async shutdown(errorCode = 0, message = ''): Promise<void> {
		this.logger.info({ errorCode, message }, 'Application shutdown started');
		// See if we can acquire mutex meant app is still loading or not
		const release = await this._mutex.acquire();

		try {
			this.channel.publish(APP_EVENT_SHUTDOWN);
			this._engineProcess.kill(0);
			await this._controller.stop(errorCode, message);
			await this._stateDB.close();
			await this._moduleDB.close();
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
		if (!this.logger) {
			this.logger = this._initLogger();
		}
		await this._stateMachine.init(
			this.config.genesis,
			this.config.generation.modules,
			this.config.genesis.modules,
		);
		return generateGenesisBlock(this._stateMachine, this.logger, input);
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
		this._registeredModules.push(mod);
		this._stateMachine.registerModule(mod);
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
		const applicationEndpoint: EndpointHandlers = {
			// eslint-disable-next-line @typescript-eslint/require-await
			getRegisteredActions: async (_: PluginEndpointContext) => this._controller.getEndpoints(),
			// eslint-disable-next-line @typescript-eslint/require-await
			getRegisteredEvents: async (_: PluginEndpointContext) => this._controller.getEvents(),
		};
		return mergeEndpointHandlers(applicationEndpoint, {});
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
		await fs.writeFile(pidPath, process.pid.toString());
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
