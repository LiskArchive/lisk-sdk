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
	static description = 'Creates custom plugin as a standalone package with dependencies.';
	static examples = ['init:plugin my-plugin', 'init:plugin my-plugin ./path'];

	static args = [
		{
			name: 'alias',
			description: 'Alias of the plugin.',
			required: true,
		},
		{
			name: 'path',
			description: 'Path to create the plugin.',
			default: process.env.INIT_CWD ?? process.cwd(),
		},
	];

	static flags = {
		...BaseBootstrapCommand.flags,
	};

	async run(): Promise<void> {
		const {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			args: { alias, path },
		} = this.parse(PluginCommand);

		// validate folder name to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /^([a-z]+)(([A-Z]([a-z]+))+)$/;
		if (regexCamelCase.test(alias) || regexWhitespace.test(alias)) {
			this.error('Invalid plugin alias');
		}

		return this._runBootstrapCommand('lisk:init:plugin', {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			alias,
			projectPath: path ?? process.env.INIT_CWD ?? process.cwd(),
		});
	}
}
