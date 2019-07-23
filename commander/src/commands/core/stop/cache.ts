/*
 * LiskHQ/lisk-commander
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
 *
 */
import { flags as flagParser } from '@oclif/command';
import Listr from 'listr';
import BaseCommand from '../../../base';
import {
	isCacheEnabled,
	isCacheRunning,
	stopCache,
} from '../../../utils/core/cache';
import {
	describeApplication,
	PM2ProcessInstance,
} from '../../../utils/core/pm2';

interface Args {
	readonly name: string;
}

export default class CacheCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk Core installation directory name.',
			required: true,
		},
	];

	static flags = {
		json: flagParser.boolean({
			...BaseCommand.flags.json,
			hidden: true,
		}),
		pretty: flagParser.boolean({
			...BaseCommand.flags.pretty,
			hidden: true,
		}),
	};

	static description = 'Stop the cache server.';

	static examples = ['core:stop:cache mainnet-latest'];

	async run(): Promise<void> {
		const { args } = this.parse(CacheCommand);
		const { name } = args as Args;
		const instance = await describeApplication(name);

		if (!instance) {
			this.log(
				`Lisk Core instance: ${name} doesn't exists, Please install using lisk core:install`,
			);

			return;
		}

		const { installationPath, network } = instance as PM2ProcessInstance;

		const tasks = new Listr([
			{
				title: 'Stop the cache server',
				skip: async () => !(await isCacheEnabled(installationPath, network)),
				task: async () => {
					const isRunning = await isCacheRunning(installationPath, name);
					if (isRunning) {
						await stopCache(installationPath, network, name);
					}
				},
			},
		]);

		await tasks.run();
	}
}
