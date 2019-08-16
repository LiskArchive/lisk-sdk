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
import BaseCommand from '../../base';
import { describeApplication, listApplication } from '../../utils/core/pm2';

interface Args {
	readonly name: string;
}

export default class StatusCommand extends BaseCommand {
	static flags = {
		json: flagParser.boolean({
			hidden: true,
		}),
		pretty: flagParser.boolean({
			hidden: true,
		}),
	};

	static args = [
		{
			name: 'name',
			description: 'Lisk Core installation directory name.',
			required: false,
		},
	];

	static description = 'Show the status of a Lisk Core instances.';

	static examples = ['core:status', 'core:status mainnet-latest'];

	async run(): Promise<void> {
		const { args } = this.parse(StatusCommand);
		const { name } = args as Args;

		if (name) {
			const instance = await describeApplication(name);

			if (!instance) {
				throw new Error(
					`Lisk Core instance: ${name} doesn't exists, Please install using lisk core:install --help`,
				);
			}
			this.print(instance);
		} else {
			const instances = await listApplication();

			if (!instances.length) {
				this.print({
					message:
						'Lisk Core instances not available, Please install using lisk core:install --help',
				});
			} else {
				const toDisplay = [
					'name',
					'status',
					'network',
					'version',
					'started_at',
					'cpu',
					'memory',
				];
				const filtered = instances.map(instance =>
					Object.keys(instance).reduce(
						(newObj, key) =>
							toDisplay.includes(key)
								? {
										...newObj,
										[key]: instance[key],
								  }
								: newObj,
						{},
					),
				);
				this.print(filtered);
			}
		}
	}
}
