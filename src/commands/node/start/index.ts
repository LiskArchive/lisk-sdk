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
import { startApplication } from '../../../utils/node/pm2';
import CacheCommand, { Flags } from './cache';
import DatabaseCommand from './database';

export default class StartCommand extends BaseCommand {
	static description = 'Start Lisk Core';

	static examples = [
		'node:start',
		'node:start --no-snapshot',
		'node:start --network=testnet',
		'node:start --installation-path=/opt/lisk/lisk-testnet --network=testnet',
	];

	static flags = {
		...BaseCommand.flags,
		network: flagParser.string({
			...commonFlags.network,
			options: [NETWORK.MAINNET, NETWORK.TESTNET, NETWORK.BETANET],
		}),
		installationPath: flagParser.string({
			...commonFlags.installationPath,
		}),
		name: flagParser.string({
			...commonFlags.name,
		}),
	};

	async run(): Promise<void> {
		const { flags } = this.parse(StartCommand);
		const { network, installationPath, name } = flags as Flags;

		const tasks = new Listr([
			{
				title: 'Start Lisk Core',
				task: () =>
					new Listr([
						{
							title: 'Cache',
							task: async () =>
								CacheCommand.run([
									'--network',
									network,
									'--installationPath',
									installationPath,
									'--name',
									name,
								]),
						},
						{
							title: 'Database',
							task: async () =>
								DatabaseCommand.run([
									'--network',
									network,
									'--installationPath',
									installationPath,
									'--name',
									name,
								]),
						},
						{
							title: 'Lisk Core',
							task: async () =>
								startApplication(installationPath, name),
						},
					]),
			},
		]);
		await tasks.run();
	}
}
