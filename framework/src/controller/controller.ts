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

import * as childProcess from 'child_process';
import { ChildProcess } from 'child_process';
import * as path from 'path';
import { Logger } from '../logger';
import { BasePlugin, getPluginExportPath, InstantiablePlugin } from '../plugins/base_plugin';
import { systemDirs } from '../system_dirs';
import { PluginOptions, PluginOptionsWithApplicationConfig, RPCConfig } from '../types';
import { Bus } from './bus';
import { BaseChannel } from './channels';
import { InMemoryChannel } from './channels/in_memory_channel';
import * as JSONRPC from './jsonrpc';

export interface ControllerOptions {
	readonly appLabel: string;
	readonly config: {
		readonly rootPath: string;
		readonly rpc: RPCConfig;
	};
	readonly logger: Logger;
	readonly channel: InMemoryChannel;
}

interface ControllerConfig {
	readonly dataPath: string;
	readonly dirs: {
		readonly dataPath: string;
		readonly data: string;
		readonly tmp: string;
		readonly logs: string;
		readonly sockets: string;
		readonly pids: string;
	};
	rpc: RPCConfig;
}

interface PluginsObject {
	readonly [key: string]: InstantiablePlugin;
}

export class Controller {
	public readonly logger: Logger;
	public readonly appLabel: string;
	public readonly channel: InMemoryChannel;
	public readonly config: ControllerConfig;
	public bus!: Bus;

	private readonly _childProcesses: Record<string, ChildProcess>;
	private readonly _inMemoryPlugins: Record<string, { plugin: BasePlugin; channel: BaseChannel }>;

	public constructor(options: ControllerOptions) {
		this.logger = options.logger;
		this.appLabel = options.appLabel;
		this.channel = options.channel;
		this.logger.info('Initializing controller');

		const dirs = systemDirs(this.appLabel, options.config.rootPath);
		this.config = {
			dataPath: dirs.dataPath,
			dirs: {
				...dirs,
			},
			rpc: options.config.rpc,
		};

		this._inMemoryPlugins = {};
		this._childProcesses = {};
	}

	public async load(): Promise<void> {
		this.logger.info('Loading controller');
		await this._setupBus();
	}

	public async loadPlugins(
		plugins: PluginsObject,
		pluginOptions: { [key: string]: PluginOptionsWithApplicationConfig },
	): Promise<void> {
		if (!this.bus) {
			throw new Error('Controller bus is not initialized. Plugins can not be loaded.');
		}

		for (const name of Object.keys(plugins)) {
			const klass = plugins[name];
			const options = pluginOptions[name];

			if (options.loadAsChildProcess && this.config.rpc.enable) {
				await this._loadChildProcessPlugin(name, klass, options);
			} else {
				await this._loadInMemoryPlugin(name, klass, options);
			}
		}
	}

	public async unloadPlugins(plugins: string[] = []): Promise<void> {
		const pluginsToUnload =
			plugins.length > 0
				? plugins
				: [...Object.keys(this._inMemoryPlugins), ...Object.keys(this._childProcesses)];

		let hasError = false;

		for (const name of pluginsToUnload) {
			try {
				// Unload in-memory plugins
				if (this._inMemoryPlugins[name]) {
					await this._unloadInMemoryPlugin(name);

					// Unload child process plugins
				} else if (this._childProcesses[name]) {
					await this._unloadChildProcessPlugin(name);
				} else {
					throw new Error(`Unknown plugin "${name}" was asked to unload.`);
				}
			} catch (error) {
				this.logger.error(error);
				hasError = true;
			}
		}

		if (hasError) {
			throw new Error('Unload Plugins failed');
		}
	}

	public async cleanup(_code?: number, reason?: string): Promise<void> {
		this.logger.info('Controller cleanup started');

		if (reason) {
			this.logger.debug(`Reason: ${reason}`);
		}

		try {
			this.logger.debug('Plugins cleanup started');
			await this.unloadPlugins();
			this.logger.debug('Plugins cleanup completed');

			this.logger.debug('Bus cleanup started');
			await this.bus.cleanup();
			this.logger.debug('Bus cleanup completed');

			this.logger.info('Controller cleanup completed');
		} catch (err) {
			this.logger.error(err, 'Controller cleanup failed');
		}
	}

	private async _setupBus(): Promise<void> {
		this.bus = new Bus(this.logger, { rpc: this.config.rpc });

		await this.bus.setup();

		await this.channel.registerToBus(this.bus);

		this.bus.subscribe('*', (event: JSONRPC.NotificationRequest) => {
			this.logger.error(`eventName: ${event.method},`, 'Monitor Bus Channel');
		});
	}

	private async _loadInMemoryPlugin(
		name: string,
		Klass: InstantiablePlugin,
		options: PluginOptionsWithApplicationConfig,
	): Promise<void> {
		const pluginAlias = name || Klass.name;

		const plugin: BasePlugin = new Klass(options);

		this.logger.info(name, 'Loading in-memory plugin');

		const channel = new InMemoryChannel(pluginAlias, plugin.events, plugin.actions);

		await channel.registerToBus(this.bus);

		channel.publish(`${pluginAlias}:registeredToBus`);
		channel.publish(`${pluginAlias}:loading:started`);

		const context = { options, channel, config: {}};

		await plugin.init(context);
		await plugin.load(channel);

		channel.publish(`${pluginAlias}:loading:finished`);

		this._inMemoryPlugins[pluginAlias] = { plugin, channel };

		this.logger.info(name, 'Loaded in-memory plugin');
	}

	private async _loadChildProcessPlugin(
		name: string,
		Klass: InstantiablePlugin,
		options: PluginOptions,
	): Promise<void> {
		const pluginAlias = name || Klass.name;

		this.logger.info(name, 'Loading child-process plugin');

		const program = path.resolve(__dirname, 'child_process_loader');

		const parameters = [getPluginExportPath(Klass) as string, Klass.name];

		// Avoid child processes and the main process sharing the same debugging ports causing a conflict
		const forkedProcessOptions: { execArgv: string[] | undefined } = {
			execArgv: undefined,
		};
		const maxPort = 20000;
		const minPort = 10000;
		if (process.env.NODE_DEBUG) {
			forkedProcessOptions.execArgv = [
				`--inspect=${Math.floor(Math.random() * (maxPort - minPort) + minPort)}`,
			];
		}

		const child = childProcess.fork(program, parameters, forkedProcessOptions);

		child.send({
			action: 'load',
			config: this.config,
			options,
		});

		this._childProcesses[pluginAlias] = child;

		child.on('exit', (code, signal) => {
			// If child process exited with error
			if (code !== null && code !== undefined && code !== 0) {
				this.logger.error(
					{ name, code, signal: signal ?? '' },
					'Child process plugin exited',
				);
			}
		});

		child.on('error', error => {
			this.logger.error(error, `Child process for "${pluginAlias}" faced error.`);
		});

		await Promise.race([
			new Promise<void>(resolve => {
				this.channel.once(`${pluginAlias}:loading:finished`, () => {
					this.logger.info({ name }, 'Loaded child-process plugin');
					resolve();
				});
			}),
			new Promise((_, reject) => {
				setTimeout(() => {
					reject(new Error('Child process plugin loading timeout'));
				}, 2000);
			}),
		]);
	}

	private async _unloadInMemoryPlugin(name: string): Promise<void> {
		this._inMemoryPlugins[name].channel.publish(`${name}:unloading:started`);
		try {
			await this._inMemoryPlugins[name].plugin.unload();
			this._inMemoryPlugins[name].channel.publish(`${name}:unloading:finished`);
		} catch (error) {
			this._inMemoryPlugins[name].channel.publish(`${name}:unloading:error`, error);
		} finally {
			delete this._inMemoryPlugins[name];
		}
	}

	private async _unloadChildProcessPlugin(name: string): Promise<void> {
		if (!this._childProcesses[name].connected) {
			this._childProcesses[name].kill('SIGTERM');
			delete this._childProcesses[name];
			throw new Error('Child process is not connected any more.');
		}

		this._childProcesses[name].send({
			action: 'unload',
		});

		await Promise.race([
			new Promise<void>(resolve => {
				this.channel.once(`${name}:unloading:finished`, () => {
					this.logger.info(`Child process plugin "${name}" unloaded`);
					delete this._childProcesses[name];
					resolve();
				});
			}),
			new Promise((_, reject) => {
				this.channel.once(`${name}:unloading:error`, data => {
					this.logger.info(`Child process plugin "${name}" unloaded with error`);
					this.logger.error(data ?? {}, 'Unloading plugin error.');
					delete this._childProcesses[name];
					reject(data);
				});
			}),
			new Promise((_, reject) => {
				setTimeout(() => {
					this._childProcesses[name].kill('SIGTERM');
					delete this._childProcesses[name];
					reject(new Error('Child process plugin unload timeout'));
				}, 2000);
			}),
		]);
	}
}
