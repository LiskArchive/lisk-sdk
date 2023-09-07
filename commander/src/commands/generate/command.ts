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

interface CommandCommandArgs {
	moduleName: string;
	commandName: string;
}

export default class CommandCommand extends BaseBootstrapCommand {
	static description = 'Creates an command skeleton for the given module name and comand name.';
	static examples = ['generate:command moduleName commandName', 'generate:command nft transfer'];
	static args = [
		{
			name: 'moduleName',
			description: 'Module name.',
			required: true,
		},
		{
			name: 'commandName',
			description: 'Asset name.',
			required: true,
		},
	];

	async run(): Promise<void> {
		const { args } = await this.parse(CommandCommand);
		const { moduleName, commandName } = args as CommandCommandArgs;

		// validate folder name to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /[a-z]+((\d)|([A-Z0-9][a-z0-9]+))*([A-Z])?/;
		const regexAlphabets = /[^A-Za-z]/;

		if (
			!regexCamelCase.test(moduleName) ||
			regexWhitespace.test(moduleName) ||
			regexAlphabets.test(moduleName)
		) {
			this.error('Invalid module name');
		}

		if (
			!regexCamelCase.test(commandName) ||
			regexWhitespace.test(commandName) ||
			regexAlphabets.test(commandName)
		) {
			this.error('Invalid command name');
		}

		if (!this._isLiskAppDir(process.cwd())) {
			this.error(
				'You can run this command only in lisk app directory. Run "lisk init --help" command for more details.',
			);
		}

		this.log(
			`Creating command skeleton with command name "${commandName}" for module "${moduleName}"`,
		);

		return this._runBootstrapCommand('lisk:generate:command', {
			moduleName,
			commandName,
		});
	}
}
