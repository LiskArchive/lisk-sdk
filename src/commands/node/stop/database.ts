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
import { installDirectory } from '../../../utils/node/commons';
import { defaultInstallationPath } from '../../../utils/node/config';
import { stopDatabase } from '../../../utils/node/database';

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
		network: flagParser.string({
			...commonFlags.network,
			default: NETWORK.MAINNET,
			options: [NETWORK.MAINNET, NETWORK.TESTNET, NETWORK.BETANET],
		}),
		installationPath: flagParser.string({
			...commonFlags.installationPath,
			default: defaultInstallationPath,
		}),
		name: flagParser.string({
			...commonFlags.name,
			default: NETWORK.MAINNET,
		}),
		'no-snapshot': flagParser.boolean({
			...commonFlags.noSnapshot,
			default: false,
			allowNo: false,
		}),
	};

	async run(): Promise<void> {
		const { flags } = this.parse(DatabaseCommand);
		const { installationPath, name } = flags as Flags;
		const installDir = installDirectory(installationPath, name);

		const tasks = new Listr([
			{
				title: 'Stop Lisk Core Database',
				task: async () => stopDatabase(installDir),
			},
		]);

		await tasks.run();
	}
}
