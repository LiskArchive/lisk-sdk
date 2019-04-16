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
import { listApplication, Pm2Env } from '../../utils/node/pm2';

export default class ListCommand extends BaseCommand {
	static description = 'List all instances of Lisk Core.';

	static examples = ['node:list'];

	static flags = {
		...BaseCommand.flags,
	};

	async run(): Promise<void> {
		const apps = await listApplication();
		this.print(
			apps.map(app => {
				const { name, pm2_env, monit } = app;
				const {
					status,
					LISK_NETWORK: network,
					version,
					LISK_DB_PORT: dbPort,
					LISK_REDIS_PORT: redisPort,
				} = pm2_env as Pm2Env;

				return {
					name,
					network,
					version,
					status,
					dbPort,
					redisPort,
					...monit,
				};
			}),
		);
	}
}
