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
import * as fsExtra from 'fs-extra';
import Listr from 'listr';
import BaseCommand from '../../base';
import { NETWORK } from '../../utils/constants';
import { flags as commonFlags } from '../../utils/flags';
import { defaultInstallationPath } from '../../utils/node/config';
import {
	describeApplication,
	Pm2Env,
	unRegisterApplication,
} from '../../utils/node/pm2';
import StopCommand from './stop';

interface Flags {
	readonly installationPath: string;
	readonly name: string;
	readonly network: NETWORK;
}

export default class UnInstallCommand extends BaseCommand {
	static description = 'UnInstall Lisk Core';

	static examples = [
		'node:uninstall --name=mainnet_1.6',
		'node:uninstall --network=testnet --name=testnet_1.6',
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
	};

	async run(): Promise<void> {
		const { flags } = this.parse(UnInstallCommand);
		const { network, name } = flags as Flags;
		const { pm2_env } = await describeApplication(name);
		const { pm_cwd: installDir } = pm2_env as Pm2Env;

		const tasks = new Listr([
			{
				title: `UnInstall Lisk Core ${network} Installed as ${name}`,
				task: () =>
					new Listr([
						{
							title: 'Stop Services',
							task: async () =>
								StopCommand.run(['--network', network, '--name', name]),
						},
						{
							title: 'Remove Process and Directory',
							task: async () => {
								await unRegisterApplication(name);
								fsExtra.removeSync(installDir);
							},
						},
					]),
			},
		]);

		await tasks.run();
	}
}
