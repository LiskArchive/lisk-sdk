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
import * as Listr from 'listr';
import BaseCommand from '../../../base';
import InstallCommand from '../install';
import * as CacheCommand from './cache';
import * as DatabaseCommand from './database';

export default class StopCommand extends BaseCommand {
	static description = 'Stop Lisk Core';

	static examples = [
		'node:stop',
		'node:stop --no-snapshot',
		'node:stop --network=testnet',
		'node:stop --installation-path=/opt/lisk/lisk-testnet --network=testnet',
	];

	static flags = {
		...BaseCommand.flags,
		network: InstallCommand.flags.network,
		installationPath: InstallCommand.flags.installationPath,
		name: InstallCommand.flags.name,
	};

	async run(): Promise<void> {
		const { flags } = this.parse(StopCommand);
		const { network, installationPath, name } = flags as CacheCommand.Flags;

		const tasks = new Listr.default([
			{
				title: 'Stop Lisk Core',
				task: () =>
					new Listr.default([
						{
							title: 'Cache',
							task: async () =>
								CacheCommand.default.run([
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
								DatabaseCommand.default.run([
									'--network',
									network,
									'--installationPath',
									installationPath,
									'--name',
									name,
								]),
						},
					]),
			},
		]);

		await tasks.run();
	}
}
