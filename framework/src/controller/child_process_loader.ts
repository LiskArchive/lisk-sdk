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

// Parameters passed by `child_process.fork(_, parameters)`

import { createLogger, Logger } from '../logger';
import { getEndpointHandlers } from '../endpoint';
import { BasePlugin } from '../plugins/base_plugin';
import { systemDirs } from '../system_dirs';
import { ApplicationConfigForPlugin, PluginConfig, SocketPaths } from '../types';
import { IPCChannel } from './channels';

type InstantiablePlugin<T extends BasePlugin = BasePlugin> = new () => T;
const modulePath: string = process.argv[2];
const moduleExportName: string = process.argv[3];
// eslint-disable-next-line import/no-dynamic-require,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-member-access
const Klass: InstantiablePlugin = require(modulePath)[moduleExportName];
let channel: IPCChannel;
let plugin: BasePlugin;
let logger: Logger;

const _loadPlugin = async (
	config: Record<string, unknown>,
	appConfig: ApplicationConfigForPlugin,
): Promise<void> => {
	plugin = new Klass();
	const pluginName = plugin.name;

	const dirs = systemDirs(appConfig.system.dataPath);
	logger = createLogger({
		logLevel: appConfig.system.logLevel,
		name: `plugin_${pluginName}`,
	});

	channel = new IPCChannel(
		logger,
		pluginName,
		plugin.events,
		plugin.endpoint ? getEndpointHandlers(plugin.endpoint) : {},
		Buffer.from(appConfig.genesis.chainID, 'hex'),
		{
			socketsPath: dirs.sockets,
		},
	);

	await channel.registerToBus();

	logger.debug({ plugin: pluginName }, 'Plugin is registered to bus');

	await plugin.init({ appConfig, config, logger });
	await plugin.load();

	logger.debug({ plugin: pluginName }, 'Plugin is successfully loaded');
	if (process.send) {
		process.send({ action: 'loaded' });
	}
};

const _unloadPlugin = async (code = 0) => {
	const pluginName = plugin.name;

	logger.debug({ plugin: pluginName }, 'Unloading plugin');
	try {
		await plugin.unload();
		logger.debug({ plugin: pluginName }, 'Successfully unloaded plugin');
		channel.cleanup();
		if (process.send) {
			process.send({ action: 'unloaded' });
		}
		process.exit(code);
	} catch (error) {
		logger.debug({ plugin: pluginName, err: error as Error }, 'Fail to unload plugin');
		channel.cleanup();
		if (process.send) {
			process.send({ action: 'unloadedWithError', err: error as Error });
		}
		process.exit(1);
	}
};

process.on(
	'message',
	({
		action,
		config,
		appConfig,
	}: {
		action: string;
		config: PluginConfig;
		appConfig: ApplicationConfigForPlugin;
	}) => {
		const internalWorker = async (): Promise<void> => {
			if (action === 'load') {
				await _loadPlugin(
					config as {
						[key: string]: unknown;
						rpc: SocketPaths;
					},
					appConfig,
				);
			} else if (action === 'unload') {
				await _unloadPlugin();
			} else {
				console.error(`Unknown child process plugin action: ${action}`);
			}
		};
		internalWorker().catch((err: Error) => {
			if (logger) {
				logger.error({ err }, 'Fail to handle message.');
				return;
			}
			console.error(err);
			process.exit(1);
		});
	},
);

// A rare case, if master process is disconnecting IPC then unload the plugin
process.on('disconnect', () => {
	const internalWorker = async (): Promise<void> => {
		await _unloadPlugin(1);
	};

	internalWorker().catch((err: Error) => err);
});

process.once('SIGINT', () => {
	// Do nothing and gave time to master process to cleanup properly
});

process.once('SIGTERM', () => {
	// Do nothing and gave time to master process to cleanup properly
});
