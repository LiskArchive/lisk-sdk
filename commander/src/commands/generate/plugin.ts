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
import { flags as flagParser } from '@oclif/command';
import BaseBootstrapCommand from '../../base_bootstrap_command';

export default class PluginCommand extends BaseBootstrapCommand {
	static description = 'Creates custom plugin.';
	static examples = [
		'generate:plugin myPlugin',
		'generate:plugin myPlugin --standalone --output ./my_plugin',
	];

	static args = [
		{
			name: 'alias',
			description: 'Alias of the plugin.',
			required: true,
		},
	];

	static flags = {
		...BaseBootstrapCommand.flags,
		standalone: flagParser.boolean({
			description: 'Create a standalone plugin package.',
		}),
		output: flagParser.string({
			description: 'Path to create the plugin.',
			char: 'o',
			dependsOn: ['standalone'],
		}),
		registry: flagParser.string({
			description: 'URL of a registry to download dependencies from.',
			dependsOn: ['standalone'],
		}),
	};

	async run(): Promise<void> {
		const {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			args: { alias },
			flags: { standalone, output, registry },
		} = this.parse(PluginCommand);

		// validate folder name to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /[a-z]+((\d)|([A-Z0-9][a-z0-9]+))*([A-Z])?/;
		const regexAlphabets = /[^A-Za-z]/;
		if (!regexCamelCase.test(alias) || regexWhitespace.test(alias) || regexAlphabets.test(alias)) {
			this.error('Invalid plugin alias');
		}
		if (standalone) {
			return this._runBootstrapCommand('lisk:init:plugin', {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				alias,
				projectPath: output ?? process.env.INIT_CWD ?? process.cwd(),
				registry,
			});
		}

		if (!this._isLiskAppDir(process.cwd())) {
			this.error(
				'You can run this command only in lisk app directory. Run "lisk init --help" command for more details.',
			);
		}

		return this._runBootstrapCommand('lisk:generate:plugin', {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			alias,
		});
	}
}
