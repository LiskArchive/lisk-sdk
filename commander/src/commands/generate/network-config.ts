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
import { Command, flags as flagParser } from '@oclif/command';
import fs from 'fs-extra';
import { join, resolve } from 'path';
import inquirer from 'inquirer';
import { defaultConfig } from '../../utils/config';

export default class NetworkConfigCommand extends Command {
	static description = 'Creates network configuration file.';
	static examples = [
		'generate:network-config mydir',
		'generate:network-config mydir --label alpha-sdk-app',
		'generate:network-config mydir --label alpha-sdk-app --identifier Lisk',
	];
	static args = [
		{
			name: 'dirName',
			description: 'Directory where the config file is saved.',
			required: true,
		},
	];

	static flags = {
		label: flagParser.string({
			char: 'l',
			description: 'App Label',
			default: 'alpha-sdk-app',
		}),
		identifier: flagParser.string({
			char: 'i',
			description: 'Community Identifier',
			default: 'sdk',
		}),
	};

	async run(): Promise<void> {
		const {
			flags: { label, identifier },
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			args: { dirName },
		} = this.parse(NetworkConfigCommand);

		// validate dirName to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /^([a-z]+)(([A-Z]([a-z]+))+)$/;
		if (regexCamelCase.test(dirName) || regexWhitespace.test(dirName)) {
			this.error('Invalid name');
		}

		// determine proper path
		const configPath = join(__dirname, '../../config', dirName);

		defaultConfig.label = label;
		defaultConfig.genesisConfig.communityIdentifier = identifier;
		// defaultConfig.version = get label from package.json of the app created

		// check for existing file at dirName & warn the user of overwriting
		if (fs.existsSync(configPath)) {
			const userResponse = await inquirer.prompt({
				type: 'confirm',
				name: 'confirm',
				message:
					'A config file already exists at the given location. Do you want to overwrite it ?',
			});
			if (!userResponse.confirm) {
				this.error('Aborting');
			} else {
				fs.writeJSONSync(resolve(configPath, 'config.json'), JSON.stringify(defaultConfig));
			}
		} else {
			fs.mkdirSync(configPath, { recursive: true });
			// write config in config.json at the proper path
			fs.writeJSONSync(resolve(configPath, 'config.json'), JSON.stringify(defaultConfig));
		}
	}
}
