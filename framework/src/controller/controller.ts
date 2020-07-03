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
import { objects as objectsUtils } from '@liskhq/lisk-utils';
import { systemDirs } from '../application/system_dirs';
import { InMemoryChannel } from './channels/in_memory_channel';
import { Bus } from './bus';
import { Logger } from '../application/logger';
import { SocketPaths } from './types';
import { PluginsOptions, PluginOptions } from '../types';
import { BasePlugin, InstantiablePlugin } from '../plugins/base_plugin';
import { EventInfoObject } from './event';

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

interface PluginsObject {
	readonly [key: string]: InstantiablePlugin<BasePlugin>;
}

const validatePluginSpec = (pluginSpec: Partial<BasePlugin>): void => {
	assert(
		(pluginSpec.constructor as typeof BasePlugin).alias,
		'Plugin alias is required.',
	);
	assert(
		(pluginSpec.constructor as typeof BasePlugin).info.name,
		'Plugin name is required.',
	);
	assert(
		(pluginSpec.constructor as typeof BasePlugin).info.author,
		'Plugin author is required.',
	);
	assert(
		(pluginSpec.constructor as typeof BasePlugin).info.version,
		'Plugin version is required.',
	);
	assert(pluginSpec.defaults, 'Plugin default options are required.');
	assert(pluginSpec.events, 'Plugin events are required.');
	assert(pluginSpec.actions, 'Plugin actions are required.');
	assert(pluginSpec.load, 'Plugin load action is required.');
	assert(pluginSpec.unload, 'Plugin unload actions is required.');
};

export class Controller {
	public readonly logger: Logger;
	public readonly appLabel: string;
	public readonly channel: InMemoryChannel;
	public readonly config: ControllerConfig;
	public plugins: {
		[key: string]: BasePlugin;
	};
	public childrenList: Array<ChildProcess>;
	public bus!: Bus;

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

		this.plugins = {};
		this.childrenList = [];
	}

	public async load(
		plugins: PluginsObject,
		pluginOptions: PluginsOptions,
	): Promise<void> {
		this.logger.info('Loading controller');
		await this._setupBus();
		await this._loadPlugins(plugins, pluginOptions);

		this.logger.debug(this.bus.getEvents(), 'Bus listening to events');
		this.logger.debug(this.bus.getActions(), 'Bus ready for actions');
	}

	public async unloadPlugins(
		plugins = Object.keys(this.plugins),
	): Promise<void> {
		// To perform operations in sequence and not using bluebird

		for (const alias of plugins) {
			await this.plugins[alias].unload();
			delete this.plugins[alias];
		}
	}

	public async cleanup(_code?: number, reason?: string): Promise<void> {
		this.logger.info('Cleanup controller...');

		if (reason) {
			this.logger.error(`Reason: ${reason}`);
		}

		this.childrenList.forEach(child => child.kill());

		try {
			await this.bus.cleanup();
			await this.unloadPlugins();
			this.logger.info('Unload completed');
		} catch (err) {
			this.logger.error(err, 'Caused error during plugins cleanup');
		}
	}

	private async _setupBus(): Promise<void> {
		this.bus = new Bus(this.logger, this.config);

		await this.bus.setup();

		await this.channel.registerToBus(this.bus);

		// If log level is greater than info
		if (this.logger.level !== undefined && this.logger.level() < 30) {
			this.bus.subscribe('*', (event: EventInfoObject) => {
				this.logger.trace(`eventName: ${event.name},`, 'Monitor Bus Channel');
			});
		}
	}

	private async _loadPlugins(
		plugins: PluginsObject,
		pluginOptions: PluginsOptions,
	): Promise<void> {
		// To perform operations in sequence and not using bluebird
		for (const alias of Object.keys(plugins)) {
			const klass = plugins[alias];
			const options = pluginOptions[alias];

			if (options.loadAsChildProcess) {
				if (this.config.ipc.enabled) {
					await this._loadChildProcessPlugin(alias, klass, options);
				} else {
					this.logger.warn(
						`IPC is disabled. ${alias} will be loaded in-memory.`,
					);
					await this._loadInMemoryPlugin(alias, klass, options);
				}
			} else {
				await this._loadInMemoryPlugin(alias, klass, options);
			}
		}
	}

	private async _loadInMemoryPlugin(
		alias: string,
		Klass: InstantiablePlugin<BasePlugin>,
		options: PluginOptions,
	): Promise<void> {
		const pluginAlias = alias || Klass.alias;
		const { name, version } = Klass.info;

		const plugin: BasePlugin = new Klass(options);
		validatePluginSpec(plugin);

		this.logger.info(
			{ name, version, pluginAlias },
			'Loading in-memory plugin',
		);

		const channel = new InMemoryChannel(
			pluginAlias,
			plugin.events,
			plugin.actions,
		);

		await channel.registerToBus(this.bus);

		channel.publish(`${pluginAlias}:registeredToBus`);
		channel.publish(`${pluginAlias}:loading:started`);

		await plugin.load(channel);

		channel.publish(`${pluginAlias}:loading:finished`);

		this.plugins[pluginAlias] = plugin;

		this.logger.info({ name, version, pluginAlias }, 'Loaded in-memory plugin');
	}

	private async _loadChildProcessPlugin(
		alias: string,
		Klass: InstantiablePlugin<BasePlugin>,
		options: PluginOptions,
	): Promise<void> {
		const pluginAlias = alias || Klass.alias;
		const { name, version } = Klass.info;

		const plugin: BasePlugin = new Klass(options);
		validatePluginSpec(plugin);

		this.logger.info(
			{ name, version, pluginAlias },
			'Loading plugin as child process',
		);

		const program = path.resolve(__dirname, 'child_process_loader.js');

		const parameters = [Klass.info.name, Klass.name];

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

		// TODO: Analyze if we need to provide genesis block as options to plugins
		//  If yes then we should encode it to json with the issue https://github.com/LiskHQ/lisk-sdk/issues/5513
		const pluginOptions: Partial<PluginOptions> = objectsUtils.cloneDeep(
			options,
		);
		delete pluginOptions.genesisBlock;

		// TODO: Check which config and options are actually required to avoid sending large data
		const { config } = this;

		const child = childProcess.fork(program, parameters, forkedProcessOptions);

		// TODO: Check which config and options are actually required to avoid sending large data
		child.send({
			loadPlugin: true,
			config,
			pluginOptions,
		});

		this.childrenList.push(child);

		child.on('exit', (code, signal) => {
			this.logger.error(
				{ name, version, pluginAlias, code, signal },
				'Child process plugin exited',
			);
			// Exits the main process with a failure code
			process.exit(1);
		});

		await Promise.race([
			new Promise(resolve => {
				this.channel.once(`${pluginAlias}:loading:finished`, () => {
					this.logger.info(
						{ name, version, pluginAlias },
						'Child process plugin ready',
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
