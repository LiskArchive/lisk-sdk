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
import * as childProcess from 'child_process';
import BaseCommand from '../../base';
import { getNetworkConfig } from '../../utils/node/config';
import { describeApplication, Pm2Env } from '../../utils/node/pm2';

interface Args {
	readonly name: string;
}

export default class LogsCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk Core installation directory name.',
			required: true,
		},
	];

	static description = 'Stream logs of a Lisk Core instance.';

	static examples = ['node:logs mainnet-latest'];

	async run(): Promise<void> {
		const { args } = this.parse(LogsCommand);
		const { name } = args as Args;

		const { pm2_env } = await describeApplication(name);
		const { pm_cwd: installDir, LISK_NETWORK: network } = pm2_env as Pm2Env;
		const { logFileName } = getNetworkConfig(installDir, network);
		const fileName = `${installDir}/${logFileName}`;

		const tail = childProcess.spawn('tail', ['-f', fileName]);
		const { stderr, stdout } = tail;

		stdout.on('data', data => {
			this.log(data.toString('utf-8').replace(/\n/, ''));
		});

		stderr.on('data', data => {
			this.log(data.message);
		});

		tail.on('close', () => {
			tail.removeAllListeners();
		});

		tail.on('error', err => {
			this.log(`Failed to process logs for ${name} with error: ${err.message}`);
			tail.removeAllListeners();
		});
	}
}
