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
import { Database, StateDB } from '@liskhq/lisk-db';
import { validator } from '@liskhq/lisk-validator';
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
import { BaseModule, ModuleMetadataJSON } from './modules/base_module';
import { getEndpointHandlers, mergeEndpointHandlers } from './endpoint';
import { ValidatorsMethod, ValidatorsModule } from './modules/validators';
import { TokenModule, TokenMethod } from './modules/token';
import { AuthModule, AuthMethod } from './modules/auth';
import { FeeModule, FeeMethod } from './modules/fee';
import { RandomModule, RandomMethod } from './modules/random';
import { PoSModule, PoSMethod } from './modules/pos';
import { generateGenesisBlock, GenesisBlockGenerateInput } from './genesis_block';
import { StateMachine } from './state_machine';
import { ABIHandler, EVENT_ENGINE_READY } from './abi_handler/abi_handler';
import { ABIServer } from './abi_handler/abi_server';
import {
	SidechainInteroperabilityModule,
	MainchainInteroperabilityModule,
	SidechainInteroperabilityMethod,
	MainchainInteroperabilityMethod,
} from './modules/interoperability';
import { DynamicRewardMethod, DynamicRewardModule } from './modules/dynamic_rewards';

const isPidRunning = async (pid: number): Promise<boolean> =>
	psList().then(list => list.some(x => x.pid === pid));

const registerProcessHooks = (app: Application): void => {
	const handleShutdown = async (code: number, message: string) => {
		await app.shutdown(code, message);
	};

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
	process.once('exit', (code: number) => {
		handleShutdown(code, 'process.exit').catch((error: Error) => app.logger.error({ error }));
	});
};

interface DefaultApplication {
	app: Application;
	method: {
		validator: ValidatorsMethod;
		auth: AuthMethod;
		token: TokenMethod;
		fee: FeeMethod;
		random: RandomMethod;
		reward: DynamicRewardMethod;
		pos: PoSMethod;
		interoperability: SidechainInteroperabilityMethod | MainchainInteroperabilityMethod;
	};
}

export class Application {
	public config: ApplicationConfig;
	public logger!: Logger;

	private readonly _controller: Controller;
	private readonly _registeredModules: BaseModule[] = [];
	private readonly _stateMachine: StateMachine;

	private _abiServer!: ABIServer;
	private _stateDB!: StateDB;
	private _moduleDB!: Database;
	private _abiHandler!: ABIHandler;
	private _engineProcess!: childProcess.ChildProcess;

	private readonly _mutex = new jobHandlers.Mutex();

	public constructor(config: PartialApplicationConfig = {}) {
		const appConfig = objects.cloneDeep(applicationConfigSchema.default);

		const mergedConfig = objects.mergeDeep({}, appConfig, config);
		validator.validate<ApplicationConfig>(applicationConfigSchema, mergedConfig);

		this.config = mergedConfig;

		const { plugins, ...rootConfigs } = this.config;
		this._controller = new Controller({
			appConfig: rootConfigs,
			pluginConfigs: plugins,
			chainID: Buffer.from(this.config.genesis.chainID, 'hex'),
		});
		this._stateMachine = new StateMachine();
	}

	public get channel(): InMemoryChannel {
		if (!this._controller.channel) {
			throw new Error('Controller is not initialized yet.');
		}
		return this._controller.channel;
	}

	public static defaultApplication(
		config: PartialApplicationConfig = {},
		mainchain = false,
	): DefaultApplication {
		const application = new Application(config);
		// create module instances
		const authModule = new AuthModule();
		const tokenModule = new TokenModule();
		const feeModule = new FeeModule();
		const rewardModule = new DynamicRewardModule();
		const randomModule = new RandomModule();
		const validatorModule = new ValidatorsModule();
		const posModule = new PoSModule();
		let interoperabilityModule;
		if (mainchain) {
			interoperabilityModule = new MainchainInteroperabilityModule();
			interoperabilityModule.addDependencies(tokenModule.method, feeModule.method);
		} else {
			interoperabilityModule = new SidechainInteroperabilityModule();
			interoperabilityModule.addDependencies(validatorModule.method, tokenModule.method);
		}

		// resolve dependencies
		feeModule.addDependencies(tokenModule.method, interoperabilityModule.method);
		rewardModule.addDependencies(
			tokenModule.method,
			randomModule.method,
			validatorModule.method,
			posModule.method,
		);
		posModule.addDependencies(
			randomModule.method,
			validatorModule.method,
			tokenModule.method,
			feeModule.method,
		);
		tokenModule.addDependencies(interoperabilityModule.method, feeModule.method);

		// resolve interoperability dependencies
		interoperabilityModule.registerInteroperableModule(tokenModule);
		interoperabilityModule.registerInteroperableModule(feeModule);

		// register modules
		application._registerModule(feeModule); // fee should be registered first to call beforeTransactionsExecute first
		application._registerModule(authModule);
		application._registerModule(validatorModule);
		application._registerModule(tokenModule);
		application._registerModule(rewardModule);
		application._registerModule(randomModule);
		application._registerModule(posModule);
		application._registerModule(interoperabilityModule);

		return {
			app: application,
			method: {
				validator: validatorModule.method,
				token: tokenModule.method,
				auth: authModule.method,
				fee: feeModule.method,
				pos: posModule.method,
				random: randomModule.method,
				reward: rewardModule.method,
				interoperability: interoperabilityModule.method,
			},
		};
	}

	public registerPlugin(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		plugin: BasePlugin<any>,
		options: PluginConfig = { loadAsChildProcess: false },
	): void {
		for (const registeredModule of this._registeredModules) {
			if (plugin.name === registeredModule.name) {
				throw new Error(`A module with name "${plugin.name}" is already registered.`);
			}
		}
		this._controller.registerPlugin(plugin as BasePlugin, options);
	}

	public registerModule(Module: BaseModule): void {
		if (Object.keys(this._controller.getRegisteredPlugins()).includes(Module.name)) {
			throw new Error(`A plugin with name "${Module.name}" is already registered.`);
		}
		this._registerModule(Module);
	}

	public getRegisteredModules(): BaseModule[] {
		return this._registeredModules;
	}

	public getMetadata(): ModuleMetadataJSON[] {
		const modules = this._registeredModules.map(mod => {
			const meta = mod.metadata();
			return {
				...meta,
				name: mod.name,
			};
		});
		modules.sort((a, b) => a.name.localeCompare(b.name, 'en'));

		return modules;
	}

	public async run(): Promise<void> {
		Object.freeze(this.config);

		registerProcessHooks(this);

		// Initialize directories
		await this._setupDirectories();

		// Initialize logger
		this.logger = this._initLogger();
		this.logger.info(`Starting the app at ${this.config.system.dataPath}`);
		this.logger.info(
			'If you experience any type of error, please open an issue on Lisk GitHub: https://github.com/LiskHQ/lisk-sdk/issues',
		);
		this.logger.info(
			'Contribution guidelines can be found at Lisk-sdk: https://github.com/LiskHQ/lisk-sdk/blob/development/docs/CONTRIBUTING.md',
		);
		this.logger.info('Booting the application with Lisk Framework');

		// Validate the instance
		await this._validatePidFile();

		// Initialize database instances
		const {
			data: dbFolder,
			config,
			sockets: socketsPath,
		} = systemDirs(this.config.system.dataPath);
		this.logger.debug({ dbFolder }, 'Create module.db database instance.');
		this._moduleDB = new Database(path.join(dbFolder, 'module.db'));
		this.logger.debug({ dbFolder }, 'Create state.db database instance.');
		this._stateDB = new StateDB(path.join(dbFolder, 'state.db'));

		await this._mutex.runExclusive<void>(async () => {
			// Initialize all objects
			this._controller.init({
				logger: this.logger,
				stateDB: this._stateDB,
				moduleDB: this._moduleDB,
				endpoints: this._rootEndpoints(),
				events: [APP_EVENT_READY.replace('app_', ''), APP_EVENT_SHUTDOWN.replace('app_', '')],
			});
			await this._stateMachine.init(this.logger, this.config.genesis, this.config.modules);
			this._abiHandler = new ABIHandler({
				channel: this._controller.channel,
				config: this.config,
				logger: this.logger,
				moduleDB: this._moduleDB,
				modules: this._registeredModules,
				stateDB: this._stateDB,
				stateMachine: this._stateMachine,
				chainID: Buffer.from(this.config.genesis.chainID, 'hex'),
			});
			await this._abiHandler.cacheGenesisState();
			const abiSocketPath = `ipc://${path.join(socketsPath, 'abi.ipc')}`;

			this._abiServer = new ABIServer(this.logger, abiSocketPath, this._abiHandler);
			this._abiHandler.event.on(EVENT_ENGINE_READY, () => {
				this._controller
					.start()
					.then(() => {
						for (const method of this._controller.getEndpoints()) {
							this.logger.info({ method }, `Registered endpoint`);
						}
						this.channel.publish(APP_EVENT_READY);
					})
					.catch(err => {
						this.logger.error({ err: err as Error }, 'Fail to start controller');
					});
			});
			await this._abiServer.start();
			const program = path.resolve(__dirname, 'engine_igniter');
			const engineConfigPath = path.join(config, 'engine_config.json');
			fs.writeFileSync(engineConfigPath, JSON.stringify(this.config, undefined, '  '));
			const parameters = [abiSocketPath, '--config', engineConfigPath];
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
			this._stateDB.close();
			this._moduleDB.close();
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
		await this._stateMachine.init(this.logger, this.config.genesis, this.config.modules);
		return generateGenesisBlock(this._stateMachine, this.logger, input);
	}

	// --------------------------------------
	// Private
	// --------------------------------------

	private _registerModule(mod: BaseModule): void {
		assert(mod, 'Module implementation is required');
		this._registeredModules.push(mod);
		this._stateMachine.registerModule(mod);
		this._controller.registerEndpoint(mod.name, getEndpointHandlers(mod.endpoint));
	}

	private _initLogger(): Logger {
		return createLogger({
			logLevel: this.config?.system.logLevel ?? 'none',
			name: 'application',
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
		const dirs = systemDirs(this.config.system.dataPath);
		await Promise.all(Array.from(Object.values(dirs)).map(async dirPath => fs.ensureDir(dirPath)));
	}

	private async _emptySocketsDirectory(): Promise<void> {
		const { sockets } = systemDirs(this.config.system.dataPath);
		const socketFiles = fs.readdirSync(sockets);

		await Promise.all(
			socketFiles.map(async aSocketFile => fs.unlink(path.join(sockets, aSocketFile))),
		);
	}

	private async _validatePidFile(): Promise<void> {
		const dirs = systemDirs(this.config.system.dataPath);
		const pidPath = path.join(dirs.pids, 'controller.pid');
		const pidExists = await fs.pathExists(pidPath);
		if (pidExists) {
			const pid = parseInt((await fs.readFile(pidPath)).toString(), 10);
			const pidRunning = await isPidRunning(pid);

			this.logger.info({ pid }, 'Previous Lisk PID');
			this.logger.info({ pid: process.pid }, 'Current Lisk PID');

			if (pidRunning && pid !== process.pid) {
				this.logger.error(
					{ dataPath: this.config.system.dataPath },
					'An instance of application is already running, please change the application label to run another instance',
				);
				throw new DuplicateAppInstanceError(this.config.system.dataPath, pidPath);
			}
		}
		await fs.writeFile(pidPath, process.pid.toString());
	}

	private _clearControllerPidFile() {
		const dirs = systemDirs(this.config.system.dataPath);
		fs.unlinkSync(path.join(dirs.pids, 'controller.pid'));
	}
}
