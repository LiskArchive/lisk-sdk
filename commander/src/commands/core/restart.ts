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
import BaseCommand from '../../base';
import StartCommand from './start';
import StopCommand from './stop';

interface Args {
	readonly name: string;
}

export default class RestartCommand extends BaseCommand {
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

	static description = 'Restart Lisk Core instance.';

	static examples = ['core:restart mainnet-latest'];

	async run(): Promise<void> {
		const { args } = this.parse(RestartCommand);
		const { name } = args as Args;

		try {
			// tslint:disable-next-line await-promise
			await StopCommand.run([name]);
			// tslint:disable-next-line await-promise
			await StartCommand.run([name]);
		} catch (error) {
			this.error(error);
		}
	}
}
