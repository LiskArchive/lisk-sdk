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
import BaseCommand from '../../../base';
import { NETWORK } from '../../../utils/constants';
import { flags as commonFlags } from '../../../utils/flags';
import { isCacheRunning, stopCache } from '../../../utils/node/cache';
import { isCacheEnabled } from '../../../utils/node/config';
import { describeApplication, Pm2Env } from '../../../utils/node/pm2';

export interface Flags {
	readonly name: string;
	readonly network: NETWORK;
}

export default class CacheCommand extends BaseCommand {
	static description = 'Stop Lisk Core Cache';

	static examples = [
		'node:stop:cache --name=mainnet_1.6',
		'node:stop:cache --network=testnet --name=testnet_1.6',
	];

	static flags = {
		...BaseCommand.flags,
		network: flagParser.string({
			...commonFlags.network,
			default: NETWORK.MAINNET,
			options: [NETWORK.MAINNET, NETWORK.TESTNET, NETWORK.BETANET],
		}),
		name: flagParser.string({
			...commonFlags.name,
			default: NETWORK.MAINNET,
		}),
	};

	async run(): Promise<void> {
		const { flags } = this.parse(CacheCommand);
		const { network, name } = flags as Flags;
		const { pm2_env } = await describeApplication(name);
		const { pm_cwd: installDir } = pm2_env as Pm2Env;

		const tasks = new Listr([
			{
				title: 'Stop Lisk Core Cache',
				skip: () => !isCacheEnabled(installDir, network),
				task: async () => {
					const isRunning = await isCacheRunning(installDir, network);
					if (isRunning) {
						await stopCache(installDir, network);
					}
				},
			},
		]);

		await tasks.run();
	}
}
