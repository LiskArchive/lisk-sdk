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
import { installDirectory } from '../../utils/node/commons';
import { defaultInstallationPath } from '../../utils/node/config';
import { unRegisterApplication } from '../../utils/node/pm2';
import StopCommand from './stop';

interface Flags {
	readonly installationPath: string;
	readonly name: string;
	readonly network: NETWORK;
}

export default class UnInstallCommand extends BaseCommand {
	static description = 'UnInstall Lisk Core';

	static examples = [
		'node:uninstall',
		'node:uninstall --network=testnet --name=testnet_1.5',
		'node:uninstall --installation-path=/opt/lisk/lisk-testnet --network=testnet',
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
		const { installationPath, name, network } = flags as Flags;

		const tasks = new Listr([
			{
				title: `UnInstall Lisk Core ${network} Installed as ${name}`,
				task: () =>
					new Listr([
						{
							title: 'Stop Services',
							skip: () => true,
							task: async () =>
								StopCommand.run([
									'--network',
									network,
									'--installationPath',
									installationPath,
									'--name',
									name,
								]),
						},
						{
							title: 'Remove Process and Directory',
							task: async () => {
								const installDir = installDirectory(installationPath, name);

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
