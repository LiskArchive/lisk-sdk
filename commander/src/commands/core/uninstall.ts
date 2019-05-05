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
import { describeApplication } from '../../utils/core/pm2';
import StopCommand from './stop';

interface Args {
	readonly name: string;
}

export default class UnInstallCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk Core installation directory name.',
			required: true,
		},
	];

	static flags = {
		json: flagParser.boolean({
			...BaseCommand.flags.json,
			hidden: true,
		}),
		pretty: flagParser.boolean({
			...BaseCommand.flags.pretty,
			hidden: true,
		}),
	};

	static description = 'Uninstall an instance of Lisk Core.';

	static examples = ['core:uninstall mainnet-latest'];

	async run(): Promise<void> {
		const { args } = this.parse(UnInstallCommand);
		const { name } = args as Args;
		const { installationPath, network } = await describeApplication(name);

		try {
			// tslint:disable-next-line await-promise
			await StopCommand.run([name]);

			const tasks = new Listr([
				{
					title: `Uninstall Lisk Core ${network} instance Installed as ${name}`,
					task: async () => {
						fsExtra.removeSync(installationPath);
					},
				},
			]);

			await tasks.run();
		} catch (error) {
			this.error(error);
		}
	}
}
