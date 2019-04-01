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
import * as fsExtra from 'fs-extra';
import Listr from 'listr';
import BaseCommand from '../../base';
import { isCacheRunning, stopCache } from '../../utils/node/cache';
import { stopDatabase } from '../../utils/node/database';
import {
	describeApplication,
	Pm2Env,
	unRegisterApplication,
} from '../../utils/node/pm2';

interface Args {
	readonly name: string;
}

export default class UnInstallCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk installation directory name.',
			required: true,
		},
	];

	static description = 'UnInstall Lisk';

	static examples = ['node:uninstall mainnet_1.6'];

	async run(): Promise<void> {
		const { args } = this.parse(UnInstallCommand);
		const { name } = args as Args;
		const { pm2_env } = await describeApplication(name);
		const { pm_cwd: installDir, LISK_NETWORK: network } = pm2_env as Pm2Env;

		const tasks = new Listr([
			{
				title: `UnInstall Lisk ${network} Installed as ${name}`,
				task: () =>
					new Listr([
						{
							title: `Stop and UnRegister Lisk from PM2`,
							task: async () => {
								const isRunning = await isCacheRunning(installDir, network);
								if (isRunning) {
									await stopCache(installDir, network);
								}
								await stopDatabase(installDir, network);
								await unRegisterApplication(name);
							},
						},
						{
							title: `Remove Lisk ${network}`,
							task: () => {
								fsExtra.removeSync(installDir);
							},
						},
					]),
			},
		]);

		await tasks.run();
	}
}
