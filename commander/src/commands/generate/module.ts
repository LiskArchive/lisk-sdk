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

export default class ModuleCommand extends BaseBootstrapCommand {
	static description = 'Creates a module skeleton for the given name and id.';
	static examples = ['generate:module nft 5000'];
	static args = [
		{
			name: 'moduleName',
			description: 'Module name.',
			required: true,
		},
	];

	async run(): Promise<void> {
		const {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			args: { moduleName },
		} = await this.parse(ModuleCommand);

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

		if (!this._isLiskAppDir(process.cwd())) {
			this.error(
				'You can run this command only in lisk app directory. Run "lisk init --help" command for more details.',
			);
		}

		this.log(`Creating module skeleton with module name "${moduleName as string}"`);
		return this._runBootstrapCommand('lisk:generate:module', {
			moduleName: moduleName as string,
		});
	}
}
