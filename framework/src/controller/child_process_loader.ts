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

import { ChildProcessChannel } from './channels';
import { SocketPaths } from './types';

const modulePath: string = process.argv[2];
// eslint-disable-next-line import/no-dynamic-require
const Klass = require(modulePath);

const _loadModule = async (config: object, moduleOptions: object) => {
	const module = new Klass(moduleOptions);
	const moduleAlias = module.constructor.alias;

	const channel = new ChildProcessChannel(
		moduleAlias,
		module.events,
		module.actions,
	);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await channel.registerToBus((config as any).socketsPath as SocketPaths);

	channel.publish(`${moduleAlias}:registeredToBus`);
	channel.publish(`${moduleAlias}:loading:started`);

	await module.load(channel);

	channel.publish(`${moduleAlias}:loading:finished`);
};

// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on('message', async ({ loadModule, config, moduleOptions }) => {
	if (loadModule) {
		await _loadModule(config, moduleOptions);
	}
});

// TODO: Removed after https://github.com/LiskHQ/lisk/issues/3210 is fixed
process.on('disconnect', () => {
	process.exit();
});
