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
		const instances = apps
			.map(app => {
				const { name, pm2_env, monit } = app;
				const {
					status,
					version,
					pm_uptime,
					LISK_NETWORK: network,
				} = pm2_env as Pm2Env;

				return {
					name,
					status,
					uptime: new Date(pm_uptime).toLocaleString(),
					network,
					version,
					...monit,
				};
			})
			.filter(app => app.network);

		if (!instances.length) {
			return this.log(
				'Lisk Core instances not available, use lisk node:install --help',
			);
		}
		// tslint:disable-next-line:no-console
		console.table(instances);
	}
}
