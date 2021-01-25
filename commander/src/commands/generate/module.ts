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
import fs from 'fs-extra';
import { join } from 'path';
import inquirer from 'inquirer';
import BaseBootstrapCommand from '../../base_bootstrap_command';

export default class ModuleCommand extends BaseBootstrapCommand {
	static description = 'Creates a module skeleton for the given name and id.';
	static examples = ['generate:module moduleName moduleID', 'generate:module nft 5'];
	static args = [
		{
			name: 'moduleName',
			description: 'Module name.',
			required: true,
		},
		{
			name: 'moduleID',
			description: 'Module Id.',
			required: true,
		},
	];

	async run(): Promise<void> {
		const {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			args: { moduleName, moduleID },
		} = this.parse(ModuleCommand);

		// validate folder name to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /^([a-z]+)(([A-Z]([a-z]+))+)$/;
		if (regexCamelCase.test(moduleName) || regexWhitespace.test(moduleName)) {
			this.error('Invalid name');
		}

		// determine proper path
		const modulePath = join(process.cwd(), './src/modules', moduleName);

		// check for existing file at moduleName & ask the user before overwriting
		if (fs.existsSync(modulePath)) {
			const userResponse = await inquirer.prompt({
				type: 'confirm',
				name: 'confirm',
				message:
					'A module file with the given name already exists at the given location. Do you want to overwrite it?',
			});
			if (!userResponse.confirm) {
				return this.error(
					'Operation cancelled, module file with the given name already present at the desired location',
				);
			}

			return this._runBootstrapCommand('lisk:generate:module', {
				moduleName: moduleName as string,
				moduleID: moduleID as string,
			});
		}

		return this._runBootstrapCommand('lisk:generate:module', {
			moduleName: moduleName as string,
			moduleID: moduleID as string,
		});
	}
}
