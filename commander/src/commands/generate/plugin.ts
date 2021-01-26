/*
 * LiskHQ/lisk-commander
 * Copyright © 2021 Lisk Foundation
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

import BaseBootstrapCommand from '../../base_bootstrap_command';

export default class PluginCommand extends BaseBootstrapCommand {
	static description = 'Creates custom plugin.';
	static examples = ['generate:plugin my-plugin'];

	static args = [
		{
			name: 'alias',
			description: 'Alias of the plugin.',
			required: true,
		},
	];

	static flags = {
		...BaseBootstrapCommand.flags,
	};

	async run(): Promise<void> {
		const {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			args: { alias },
		} = this.parse(PluginCommand);

		// validate folder name to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /^([a-z]+)(([A-Z]([a-z]+))+)$/;
		if (regexCamelCase.test(alias) || regexWhitespace.test(alias)) {
			this.error('Invalid plugin alias');
		}

		return this._runBootstrapCommand('lisk:generate:plugin', {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			alias,
		});
	}
}
