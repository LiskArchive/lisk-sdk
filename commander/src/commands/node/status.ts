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
import {
	describeApplication,
	listApplication,
	Pm2Env,
} from '../../utils/node/pm2';

interface Args {
	readonly name: string;
}

export default class StatusCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk Core installation directory name.',
			required: false,
		},
	];

	static description = 'Show the status of a Lisk Core instances.';

	static examples = ['node:status', 'node:status mainnet-latest'];

	async run(): Promise<void> {
		const { args } = this.parse(StatusCommand);
		const { name } = args as Args;

		if (name) {
			const { pm2_env, monit } = await describeApplication(name);
			const {
				status,
				pm_uptime,
				pm_cwd: installationPath,
				version,
				LISK_NETWORK: network,
				LISK_DB_PORT: dbPort,
				LISK_REDIS_PORT: redisPort,
				LISK_HTTP_PORT: httpPort,
				LISK_WS_PORT: wsPort,
			} = pm2_env as Pm2Env;

			// tslint:disable-next-line:no-console
			console.table({
				status,
				network,
				version,
				httpPort,
				wsPort,
				dbPort,
				redisPort,
				installationPath,
				uptime: new Date(pm_uptime).toLocaleString(),
				...monit,
			});
		} else {
			const apps = await listApplication();
			const instances = apps
				.map(app => {
					const { name: instanceName, pm2_env, monit } = app;
					const {
						status,
						version,
						pm_uptime,
						LISK_NETWORK: network,
					} = pm2_env as Pm2Env;

					return {
						name: instanceName,
						status,
						uptime: new Date(pm_uptime).toLocaleString(),
						network,
						version,
						...monit,
					};
				})
				.filter(app => app.network);

			if (!instances.length) {
				this.log(
					'Lisk Core instances not available, use lisk node:install --help',
				);
			} else {
				// tslint:disable-next-line:no-console
				console.table(instances);
			}
		}
	}
}
