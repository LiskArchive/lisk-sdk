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

import * as path from 'path';
import * as assert from 'assert';
import * as childProcess from 'child_process';
import { ChildProcess } from 'child_process';
import { systemDirs } from '../application/system_dirs';
import { InMemoryChannel } from './channels';
import { Bus } from './bus';
import { Logger } from '../application/logger';
import { SocketPaths } from './types';
import { ModulesOptions, ModuleOptions } from '../types';
import { BaseModule, InstantiableModule } from '../modules/base_module';

export interface ControllerOptions {
	readonly appLabel: string;
	readonly config: {
		readonly rootPath: string;
		readonly ipc: {
			readonly enabled: boolean;
		};
	};
	readonly logger: Logger;
	readonly channel: InMemoryChannel;
}

interface ControllerConfig {
	readonly rootPath: string;
	readonly socketsPath: SocketPaths;
	readonly dirs: {
		readonly root: string;
		readonly data: string;
		readonly tmp: string;
		readonly logs: string;
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

const validateModuleSpec = (moduleSpec: Partial<BaseModule>): void => {
	assert(
		(moduleSpec.constructor as typeof BaseModule).alias,
		'Module alias is required.',
	);
	assert(
		(moduleSpec.constructor as typeof BaseModule).info.name,
		'Module name is required.',
	);
	assert(
		(moduleSpec.constructor as typeof BaseModule).info.author,
		'Module author is required.',
	);
	assert(
		(moduleSpec.constructor as typeof BaseModule).info.version,
		'Module version is required.',
	);
	assert(moduleSpec.defaults, 'Module default options are required.');
	assert(moduleSpec.events, 'Module events are required.');
	assert(moduleSpec.actions, 'Module actions are required.');
	assert(moduleSpec.load, 'Module load action is required.');
	assert(moduleSpec.unload, 'Module unload actions is required.');
};

export class Controller {
	public readonly logger: Logger;
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
		this.appLabel = options.appLabel;
		this.channel = options.channel;
		this.logger.info('Initializing controller');

		const dirs = systemDirs(this.appLabel, options.config.rootPath);
		this.config = {
			rootPath: dirs.root,
			ipc: {
				enabled: options.config.ipc.enabled,
			},
			dirs: {
				...dirs,
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
	): Promise<void> {
		this.logger.info('Loading controller');
		await this._setupBus();
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
		const forkedProcessOptions: { execArgv: string[] | undefined } = {
			execArgv: undefined,
		};
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
