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

import { IPCChannel } from './channels';
import { InstantiablePlugin, BasePlugin } from '../plugins/base_plugin';
import { SocketPaths } from './types';
import { PluginOptions } from '../types';

const modulePath: string = process.argv[2];
const moduleExportName: string = process.argv[3];
// eslint-disable-next-line import/no-dynamic-require,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-member-access
const Klass: InstantiablePlugin<BasePlugin> = require(modulePath)[
	moduleExportName
];

const _loadPlugin = async (
	config: {
		[key: string]: unknown;
		socketsPath: SocketPaths;
	},
	pluginOptions: PluginOptions,
): Promise<void> => {
	const pluginAlias = Klass.alias;
	const plugin: BasePlugin = new Klass(pluginOptions);

	const channel = new IPCChannel(pluginAlias, plugin.events, plugin.actions, {
		socketsPath: config.socketsPath,
	});

	await channel.registerToBus();

	channel.publish(`${pluginAlias}:registeredToBus`);
	channel.publish(`${pluginAlias}:loading:started`);

	await plugin.init(channel);
	await plugin.load(channel);

	channel.publish(`${pluginAlias}:loading:finished`);
};

process.on('message', ({ loadPlugin, config, moduleOptions }) => {
	const internalWorker = async (): Promise<void> => {
		if (loadPlugin) {
			await _loadPlugin(config, moduleOptions);
		}
	};
	internalWorker().catch((err: Error) => err);
});

// TODO: Removed after https://github.com/LiskHQ/lisk/issues/3210 is fixed
process.on('disconnect', () => {
	process.exit();
});
