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
import { flags as flagParser } from '@oclif/command';
import Listr from 'listr';
import BaseCommand from '../../base';
import { NETWORK } from '../../utils/constants';
import { flags as commonFlags } from '../../utils/flags';
import { describeApplication, Pm2Env } from '../../utils/node/pm2';

interface Flags {
	readonly name: string;
}

export default class StatusCommand extends BaseCommand {
	static description = 'Lisk Core Instance Status';

	static examples = ['node:status --name=testnet-1.6'];

	static flags = {
		...BaseCommand.flags,
		name: flagParser.string({
			...commonFlags.name,
			default: NETWORK.MAINNET,
		}),
	};

	async run(): Promise<void> {
		const { flags } = this.parse(StatusCommand);
		const { name } = flags as Flags;

		const tasks = new Listr([
			{
				title: 'Lisk Core Instance Status',
				task: async () => {
					const appInfo = await describeApplication(name);
					const {
						status,
						pm_uptime,
						unstable_restarts,
					} = appInfo.pm2_env as Pm2Env;

					this.print({
						status,
						uptime: new Date(pm_uptime).toISOString(),
						restart_count: unstable_restarts,
					});
				},
			},
		]);

		await tasks.run();
	}
}
