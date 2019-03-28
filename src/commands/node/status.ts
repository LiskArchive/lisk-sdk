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
import BaseCommand from '../../base';
import { describeApplication, Pm2Env } from '../../utils/node/pm2';

interface Args {
	readonly name: string;
}

export default class StatusCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk installation directory name.',
			required: true,
		},
	];

	static description = 'Show status of a Lisk instance';

	static examples = ['node:status testnet-1.6'];

	async run(): Promise<void> {
		const { args } = this.parse(StatusCommand);
		const { name } = args as Args;

		const { pm2_env, monit } = await describeApplication(name);
		const {
			status,
			pm_uptime,
			unstable_restarts,
			pm_cwd: installationPath,
			LISK_NETWORK: network,
			version,
		} = pm2_env as Pm2Env;

		this.print({
			status,
			network,
			version,
			installationPath,
			uptime: new Date(pm_uptime).toISOString(),
			restart_count: unstable_restarts,
			...monit,
		});
	}
}
