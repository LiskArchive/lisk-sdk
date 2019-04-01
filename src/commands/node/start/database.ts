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
import { startDatabase } from '../../../utils/node/database';
import { describeApplication, Pm2Env } from '../../../utils/node/pm2';

interface Args {
	readonly name: string;
}

export default class DatabaseCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk installation directory name.',
			required: true,
		},
	];

	static description = 'Start Lisk Database';

	static examples = ['node:start:database mainnet_1.6'];

	async run(): Promise<void> {
		const { args } = this.parse(DatabaseCommand);
		const { name } = args as Args;
		const { pm2_env } = await describeApplication(name);
		const { pm_cwd: installDir, LISK_NETWORK: network } = pm2_env as Pm2Env;

		const tasks = new Listr([
			{
				title: 'Start Lisk Database',
				task: async () => startDatabase(installDir, network),
			},
		]);

		await tasks.run();
	}
}
