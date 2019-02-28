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
import { NETWORK } from '../../../utils/constants';
import { installDirectory } from '../../../utils/node/commons';
import { stopDatabase } from '../../../utils/node/database';
import InstallCommand from '../install';

export interface Flags {
	readonly installationPath: string;
	readonly name: string;
	readonly network: NETWORK;
	readonly 'no-snapshot': boolean;
}

export default class DatabaseCommand extends BaseCommand {
	static description = 'Stop Lisk Core Database';

	static examples = [
		'node:stop:database',
		'node:stop:database --no-snapshot',
		'node:stop:database --network=testnet',
		'node:stop:database --installation-path=/opt/lisk/lisk-testnet --network=testnet',
	];

	static flags = {
		...BaseCommand.flags,
		network: InstallCommand.flags.network,
		installationPath: InstallCommand.flags.installationPath,
		name: InstallCommand.flags.name,
		'no-snapshot': InstallCommand.flags['no-snapshot'],
	};

	async run(): Promise<void> {
		const { flags } = this.parse(DatabaseCommand);
		const { installationPath, name } = flags as Flags;
		const installDir = installDirectory(installationPath, name);

		const tasks = new Listr.default([
			{
				title: 'Stop Lisk Core Database',
				task: async () => stopDatabase(installDir),
			},
		]);

		await tasks.run();
	}
}
