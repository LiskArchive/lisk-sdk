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
import { isCacheRunning, stopCache } from '../../utils/core/cache';
import { stopDatabase } from '../../utils/core/database';
import {
	describeApplication,
	unRegisterApplication,
} from '../../utils/core/pm2';

interface Args {
	readonly name: string;
}

export default class UnInstallCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk Core installation directory name.',
			required: true,
		},
	];

	static description = 'Uninstall an instance of Lisk Core.';

	static examples = ['node:uninstall mainnet-latest'];

	async run(): Promise<void> {
		const { args } = this.parse(UnInstallCommand);
		const { name } = args as Args;
		const { installationPath, network } = await describeApplication(name);

		const tasks = new Listr([
			{
				title: `Uninstall Lisk Core ${network} instance Installed as ${name}`,
				task: () =>
					new Listr([
						{
							title: `Stop and Unregister Lisk Core from PM2`,
							task: async () => {
								const isRunning = await isCacheRunning(installationPath, name);
								if (isRunning) {
									await stopCache(installationPath, network, name);
								}
								await stopDatabase(installationPath, name);
								await unRegisterApplication(name);
							},
						},
						{
							title: `Remove Lisk Core ${network}`,
							task: () => {
								fsExtra.removeSync(installationPath);
							},
						},
					]),
			},
		]);

		await tasks.run();
	}
}
