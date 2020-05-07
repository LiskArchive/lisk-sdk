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
import * as childProcess from 'child_process';
import * as psList from 'ps-list';
import { ChildProcess } from 'child_process';
import * as systemDirs from '../application/system_dirs';
import { InMemoryChannel } from './channels';
import { Bus } from './bus';
import { DuplicateAppInstanceError } from '../errors';
import { validateModuleSpec } from '../application/validator';
import { Logger, Storage } from '../types';
import { SocketPaths } from './types';
import { BaseModule, InstantiableModule } from '../modules/base_module';

const isPidRunning = async (pid: number): Promise<boolean> =>
	psList().then(list => list.some(x => x.pid === pid));

export interface ControllerOptions {
	readonly appLabel: string;
	readonly config: {
		readonly tempPath: string;
		readonly ipc: {
			readonly enabled: boolean;
		};
	};
	readonly logger: Logger;
	readonly storage: Storage;
	readonly channel: InMemoryChannel;
}

interface ControllerConfig {
	readonly tempPath: string;
	readonly socketsPath: SocketPaths;
	readonly dirs: {
		readonly temp: string;
		readonly sockets: string;
		readonly pids: string;
	};
	readonly ipc: {
		readonly enabled: boolean;
	};
}

interface ModulesObject {
	readonly [key: string]: InstantiableModule<BaseModule>;
}

interface ModuleOptions {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly [key: string]: any;
	readonly loadAsChildProcess: boolean;
}

interface ModulesOptions {
	readonly [key: string]: ModuleOptions;
}

interface Migrations {
	readonly [key: string]: ReadonlyArray<string>;
}

export class Controller {
	public readonly logger: Logger;
	public readonly storage: Storage;
	public readonly appLabel: string;
	public readonly channel: InMemoryChannel;
	public readonly config: ControllerConfig;
	public modules: {
		[key: string]: BaseModule;
	};
	public childrenList: Array<ChildProcess>;
	public bus: Bus | undefined;

	public constructor(options: ControllerOptions) {
		this.logger = options.logger;
		this.storage = options.storage;
		this.appLabel = options.appLabel;
		this.channel = options.channel;
		this.logger.info('Initializing controller');

		const dirs = systemDirs(this.appLabel, options.config.tempPath);
		this.config = {
			tempPath: dirs.temp,
			ipc: {
				enabled: options.config.ipc.enabled,
			},
			dirs: {
				temp: dirs.temp,
				sockets: dirs.sockets,
				pids: dirs.pids,
			},
			socketsPath: {
				root: `unix://${dirs.sockets}`,
				pub: `unix://${dirs.sockets}/lisk_pub.sock`,
				sub: `unix://${dirs.sockets}/lisk_sub.sock`,
				rpc: `unix://${dirs.sockets}/lisk_rpc.sock`,
			},
		};

		this.modules = {};
		this.childrenList = [];
	}

	public async load(
		modules: ModulesObject,
		moduleOptions: ModulesOptions,
		migrations: Migrations = {},
	): Promise<void> {
		this.logger.info('Loading controller');
		await this._setupDirectories();
		await this._validatePidFile();
		await this._setupBus();
		await this._loadMigrations({ ...migrations });
		await this._loadModules(modules, moduleOptions);

		this.logger.debug(this.bus?.getEvents(), 'Bus listening to events');
		this.logger.debug(this.bus?.getActions(), 'Bus ready for actions');
	}

	public async unloadModules(
		modules = Object.keys(this.modules),
	): Promise<void> {
		// To perform operations in sequence and not using bluebird

		for (const alias of modules) {
			await this.modules[alias].unload();
			delete this.modules[alias];
		}
	}

	public async cleanup(_code?: number, reason?: string): Promise<void> {
		this.logger.info('Cleanup controller...');

		if (reason) {
			this.logger.error(`Reason: ${reason}`);
		}

		this.childrenList.forEach(child => child.kill());

		try {
			await this.bus?.cleanup();
			await this.unloadModules();
			this.logger.info('Unload completed');
		} catch (err) {
			this.logger.error(err, 'Caused error during modules cleanup');
		}
	}

	// eslint-disable-next-line class-methods-use-this
	private async _setupDirectories(): Promise<void> {
		// Make sure all directories exists
		await fs.ensureDir(this.config.dirs.temp);
		await fs.ensureDir(this.config.dirs.sockets);
		await fs.ensureDir(this.config.dirs.pids);
	}

	private async _validatePidFile(): Promise<void> {
		const pidPath = `${this.config.dirs.pids}/controller.pid`;
		const pidExists = await fs.pathExists(pidPath);
		if (pidExists) {
			const pid = parseInt((await fs.readFile(pidPath)).toString(), 10);
			const pidRunning = await isPidRunning(pid);

			this.logger.info({ pid }, 'Previous Lisk PID');
			this.logger.info({ pid: process.pid }, 'Current Lisk PID');

			if (pidRunning && pid !== process.pid) {
				this.logger.error(
					{ appLabel: this.appLabel },
					'An instance of application is already running, please change application name to run another instance',
				);
				throw new DuplicateAppInstanceError(this.appLabel, pidPath);
			}
		}
		await fs.writeFile(pidPath, process.pid);
	}

	private async _setupBus(): Promise<void> {
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

		await this.channel.registerToBus(this.bus);

		// If log level is greater than info
		if (this.logger.level !== undefined && this.logger.level() < 30) {
			this.bus.onAny(event => {
				this.logger.trace(
					`eventName: ${event as string},`,
					'Monitor Bus Channel',
				);
			});
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async _loadMigrations(migrationsObj: Migrations): Promise<void> {
		return this.storage.entities.Migration.applyAll(migrationsObj);
	}

	private async _loadModules(
		modules: ModulesObject,
		moduleOptions: ModulesOptions,
	): Promise<void> {
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

	private async _loadInMemoryModule(
		alias: string,
		Klass: InstantiableModule<BaseModule>,
		options: ModuleOptions,
	): Promise<void> {
		const moduleAlias = alias || Klass.alias;
		const { name, version } = Klass.info;

		const module: BaseModule = new Klass(options);
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

		await channel.registerToBus(this.bus as Bus);

		channel.publish(`${moduleAlias}:registeredToBus`);
		channel.publish(`${moduleAlias}:loading:started`);

		await module.load(channel);

		channel.publish(`${moduleAlias}:loading:finished`);

		this.modules[moduleAlias] = module;

		this.logger.info({ name, version, moduleAlias }, 'Loaded in-memory module');
	}

	private async _loadChildProcessModule(
		alias: string,
		Klass: InstantiableModule<BaseModule>,
		options: ModuleOptions,
	): Promise<void> {
		const moduleAlias = alias || Klass.alias;
		const { name, version } = Klass.info;

		const module: BaseModule = new Klass(options);
		validateModuleSpec(module);

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
		const forkedProcessOptions = {
			execArgv: undefined,
		};
		const maxPort = 20000;
		const minPort = 10000;
		if (process.env.NODE_DEBUG) {
			// eslint-disable-next-line
			// @ts-ignore
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

		await Promise.race([
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
}
