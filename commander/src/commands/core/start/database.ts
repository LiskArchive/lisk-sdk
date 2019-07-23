/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import { startDatabase } from '../../../utils/core/database';
import {
	describeApplication,
	PM2ProcessInstance,
} from '../../../utils/core/pm2';

interface Args {
	readonly name: string;
}

export default class DatabaseCommand extends BaseCommand {
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

	static description = 'Start the database server.';

	static examples = ['core:start:database mainnet-latest'];

	async run(): Promise<void> {
		const { args } = this.parse(DatabaseCommand);
		const { name } = args as Args;
		const instance = await describeApplication(name);

		if (!instance) {
			this.log(
				`Lisk Core instance: ${name} doesn't exists, Please install using lisk core:install`,
			);

			return;
		}

		const { installationPath } = instance as PM2ProcessInstance;

		const tasks = new Listr([
			{
				title: 'Start the database server',
				task: async () => startDatabase(installationPath, name),
			},
		]);

		await tasks.run();
	}
}
