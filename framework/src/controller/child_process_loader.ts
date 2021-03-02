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

import { BasePlugin, InstantiablePlugin } from '../plugins/base_plugin';
import { PluginOptionsWithAppConfig, SocketPaths } from '../types';
import { IPCChannel } from './channels';

const modulePath: string = process.argv[2];
const moduleExportName: string = process.argv[3];
// eslint-disable-next-line import/no-dynamic-require,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-member-access
const Klass: InstantiablePlugin = require(modulePath)[moduleExportName];
let channel: IPCChannel;
let plugin: BasePlugin;

const _loadPlugin = async (
	config: {
		[key: string]: unknown;
		socketsPath: SocketPaths;
	},
	pluginOptions: PluginOptionsWithAppConfig,
): Promise<void> => {
	const pluginAlias = Klass.alias;
	plugin = new Klass(pluginOptions);

	channel = new IPCChannel(pluginAlias, plugin.events, plugin.actions, {
		socketsPath: config.socketsPath,
	});

	await channel.registerToBus();

	channel.publish(`${pluginAlias}:registeredToBus`);
	channel.publish(`${pluginAlias}:loading:started`);

	await plugin.init(channel);
	await plugin.load(channel);

	channel.publish(`${pluginAlias}:loading:finished`);
};

const _unloadPlugin = async (code = 0) => {
	const pluginAlias = Klass.alias;

	channel.publish(`${pluginAlias}:unloading:started`);
	try {
		await plugin.unload();
		channel.publish(`${pluginAlias}:unloading:finished`);
		channel.cleanup();
		process.exit(code);
	} catch (error) {
		channel.publish(`${pluginAlias}:unloading:error`, error);
		channel.cleanup();
		process.exit(1);
	}
};

process.on(
	'message',
	({
		action,
		config,
		options,
	}: {
		action: string;
		config: Record<string, unknown>;
		options: PluginOptionsWithAppConfig;
	}) => {
		const internalWorker = async (): Promise<void> => {
			if (action === 'load') {
				await _loadPlugin(
					config as {
						[key: string]: unknown;
						socketsPath: SocketPaths;
					},
					options,
				);
			} else if (action === 'unload') {
				await _unloadPlugin();
			} else {
				console.error(`Unknown child process plugin action: ${action}`);
			}
		};
		internalWorker().catch((err: Error) => err);
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
