/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import Listr from 'listr';
import BaseCommand from '../../../base';
import { isCacheRunning, startCache } from '../../../utils/node/cache';
import { isCacheEnabled } from '../../../utils/node/config';
import { describeApplication, Pm2Env } from '../../../utils/node/pm2';

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

	static description = 'Start the cache server.';

	static examples = ['node:start:cache mainnet-latest'];

	async run(): Promise<void> {
		const { args } = this.parse(CacheCommand);
		const { name } = args as Args;
		const { pm2_env } = await describeApplication(name);
		const { pm_cwd: installDir, LISK_NETWORK: network } = pm2_env as Pm2Env;

		const tasks = new Listr([
			{
				title: 'Start the cache server',
				skip: () => !isCacheEnabled(installDir, network),
				task: async () => {
					const isRunning = await isCacheRunning(installDir, network);
					if (!isRunning) {
						await startCache(installDir, network);
					}
				},
			},
		]);

		await tasks.run();
	}
}
