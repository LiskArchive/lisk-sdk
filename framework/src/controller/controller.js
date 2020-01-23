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

const fs = require('fs-extra');
const path = require('path');
const childProcess = require('child_process');
const psList = require('ps-list');
const systemDirs = require('./system_dirs');
const { InMemoryChannel } = require('./channels');
const Bus = require('./bus');
const { DuplicateAppInstanceError } = require('../errors');
const { validateModuleSpec } = require('./validator');
const ApplicationState = require('./application_state');
const { createStorageComponent } = require('../components/storage');
const { migrations: controllerMigrations } = require('./storage/migrations');
const { MigrationEntity, NetworkInfoEntity } = require('./storage/entities');
const { Network } = require('./network');

const isPidRunning = async pid =>
	psList().then(list => list.some(x => x.pid === pid));

class Controller {
	constructor(appLabel, config, initialState, logger) {
		this.logger = logger;
		this.appLabel = appLabel;
		this.initialState = initialState;
		this.logger.info('Initializing controller');

		const dirs = systemDirs(this.appLabel, config.tempPath);
		this.config = {
			...config,
			dirs,
			socketsPath: {
				root: `unix://${dirs.sockets}`,
				pub: `unix://${dirs.sockets}/lisk_pub.sock`,
				sub: `unix://${dirs.sockets}/lisk_sub.sock`,
				rpc: `unix://${dirs.sockets}/lisk_rpc.sock`,
			},
		};

		this.modules = {};
		this.childrenList = [];
		this.channel = null; // Channel for controller
		this.bus = null;

		const storageConfig = config.components.storage;
		this.storage = createStorageComponent(storageConfig, logger);
		this.storage.registerEntity('Migration', MigrationEntity);
	}

	async load(modules, moduleOptions, migrations = {}, networkConfig) {
		this.logger.info('Loading controller');
		await this._setupDirectories();
		await this._validatePidFile();
		this._initState();
		await this._setupBus();
		console.log(controllerMigrations);
		await this._loadMigrations({ ...migrations, app: controllerMigrations });
		this.storage.registerEntity('NetworkInfo', NetworkInfoEntity);
		await this._initialiseNetwork(networkConfig);
		await this._loadModules(modules, moduleOptions);

		this.logger.debug(this.bus.getEvents(), 'Bus listening to events');
		this.logger.debug(this.bus.getActions(), 'Bus ready for actions');

		this.channel.publish('app:ready');
	}

	// eslint-disable-next-line class-methods-use-this
	async _setupDirectories() {
		// Make sure all directories exists
		await fs.ensureDir(this.config.dirs.temp);
		await fs.ensureDir(this.config.dirs.sockets);
		await fs.ensureDir(this.config.dirs.pids);
	}

	async _validatePidFile() {
		const pidPath = `${this.config.dirs.pids}/controller.pid`;
		const pidExists = await fs.pathExists(pidPath);
		if (pidExists) {
			const pid = parseInt(await fs.readFile(pidPath), 10);
			const pidRunning = await isPidRunning(pid);

			this.logger.info({ pid }, 'Previous Lisk PID');
			this.logger.info({ pid: process.pid }, 'Current Lisk PID');

			if (pidRunning && pid !== process.pid) {
				this.logger.error(
					{ app_name: this.appLabel },
					'An instance of application is already running, please change application name to run another instance',
				);
				throw new DuplicateAppInstanceError(this.appLabel, pidPath);
			}
		}
		await fs.writeFile(pidPath, process.pid);
	}

	_initState() {
		this.applicationState = new ApplicationState({
			initialState: this.initialState,
			logger: this.logger,
		});
	}

	async _setupBus() {
		this.bus = new Bus(
			{
				wildcard: true,
				delimiter: ':',
				maxListeners: 1000,
			},
			this.logger,
			this.config,
		);

		await this.bus.setup();

		this.channel = new InMemoryChannel(
			'app',
			['ready', 'state:updated'],
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
					handler: action => this.network.send(action.params),
				},
				broadcastToNetwork: {
					handler: action => this.network.broadcast(action.params),
				},
				requestFromNetwork: {
					handler: action => this.network.request(action.params),
				},
				requestFromPeer: {
					handler: action => this.network.requestFromPeer(action.params),
				},
				getConnectedPeers: {
					handler: action => this.network.getConnectedPeers(action.params),
				},
				getDisconnectedPeers: {
					handler: action => this.network.getDisconnectedPeers(action.params),
				},
				applyPenaltyOnPeer: {
					handler: action => this.network.applyPenalty(action.params),
				},
			},
			{ skipInternalEvents: true },
		);

		await this.channel.registerToBus(this.bus);

		this.applicationState.channel = this.channel;

		// If log level is greater than info
		if (this.logger.level && this.logger.level() < 30) {
			this.bus.onAny(event => {
				this.logger.trace(
					{
						module: event.module,
						name: event.name,
						data: event.data,
					},
					'Monitor Bus Channel',
				);
			});
		}
	}

	async _loadMigrations(migrationsObj) {
		await this.storage.bootstrap();
		await this.storage.entities.Migration.defineSchema();
		return this.storage.entities.Migration.applyAll(migrationsObj);
	}

	async _initialiseNetwork(networkConfig) {
		this.network = new Network({
			networkConfig,
			storage: this.storage,
			logger: this.logger,
			channel: this.channel,
		});
		this.network.initialiseNetwork();
	}

	async _loadModules(modules, moduleOptions) {
		// To perform operations in sequence and not using bluebird
		for (const alias of Object.keys(modules)) {
			const klass = modules[alias];
			const options = moduleOptions[alias];

			if (options.loadAsChildProcess) {
				if (this.config.ipc.enabled) {
					await this._loadChildProcessModule(alias, klass, options);
				} else {
					this.logger.warn(
						`IPC is disabled. ${alias} will be loaded in-memory.`,
					);
					await this._loadInMemoryModule(alias, klass, options);
				}
			} else {
				await this._loadInMemoryModule(alias, klass, options);
			}
		}
	}

	async _loadInMemoryModule(alias, Klass, options) {
		const moduleAlias = alias || Klass.alias;
		const { name, version } = Klass.info;

		const module = new Klass(options);
		validateModuleSpec(module);

		this.logger.info(
			{ name, version, moduleAlias },
			'Loading in-memory module',
		);

		const channel = new InMemoryChannel(
			moduleAlias,
			module.events,
			module.actions,
		);

		await channel.registerToBus(this.bus);

		channel.publish(`${moduleAlias}:registeredToBus`);
		channel.publish(`${moduleAlias}:loading:started`);

		await module.load(channel);

		channel.publish(`${moduleAlias}:loading:finished`);

		this.modules[moduleAlias] = module;

		this.logger.info({ name, version, moduleAlias }, 'Loaded in-memory module');
	}

	async _loadChildProcessModule(alias, Klass, options) {
		const module = new Klass(options);
		validateModuleSpec(module);

		const moduleAlias = alias || module.constructor.alias;
		const { name, version } = module.constructor.info;

		this.logger.info(
			{ name, version, moduleAlias },
			'Loading module as child process',
		);

		const modulePath = path.resolve(
			__dirname,
			'../modules',
			alias.replace(/([A-Z])/g, $1 => `_${$1.toLowerCase()}`),
		);

		const program = path.resolve(__dirname, 'child_process_loader.js');

		const parameters = [modulePath];

		// Avoid child processes and the main process sharing the same debugging ports causing a conflict
		const forkedProcessOptions = {};
		const maxPort = 20000;
		const minPort = 10000;
		if (process.env.NODE_DEBUG) {
			forkedProcessOptions.execArgv = [
				`--inspect=${Math.floor(
					Math.random() * (maxPort - minPort) + minPort,
				)}`,
			];
		}

		const child = childProcess.fork(program, parameters, forkedProcessOptions);

		// TODO: Check which config and options are actually required to avoid sending large data
		child.send({
			loadModule: true,
			config: this.config,
			moduleOptions: options,
		});

		this.childrenList.push(child);

		child.on('exit', (code, signal) => {
			this.logger.error(
				{ name, version, moduleAlias, code, signal },
				'Child process module exited',
			);
			// Exits the main process with a failure code
			process.exit(1);
		});

		return Promise.race([
			new Promise(resolve => {
				this.channel.once(`${moduleAlias}:loading:finished`, () => {
					this.logger.info(
						{ name, version, moduleAlias },
						'Child process module ready',
					);
					resolve();
				});
			}),
			new Promise((_, reject) => {
				setTimeout(reject, 2000);
			}),
		]);
	}

	async unloadModules(modules = Object.keys(this.modules)) {
		// To perform operations in sequence and not using bluebird

		for (const alias of modules) {
			await this.modules[alias].unload();
			delete this.modules[alias];
		}
	}

	async cleanup(code, reason) {
		this.logger.info('Cleanup controller...');

		if (reason) {
			this.logger.error(`Reason: ${reason}`);
		}

		this.childrenList.forEach(child => child.kill());

		try {
			await this.bus.cleanup();
			await this.unloadModules();
			this.logger.info('Unload completed');
		} catch (err) {
			this.logger.error({ err }, 'Caused error during modules cleanup');
		}
	}
}

module.exports = Controller;
