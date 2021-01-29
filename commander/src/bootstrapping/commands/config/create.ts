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
import { defaultConfig } from '../../../utils/config';

export class CreateCommand extends Command {
	static description = 'Creates network configuration file.';
	static examples = [
		'generate:network-config --network-name mydir',
		'generate:network-config --network-name mydir --label alpha-sdk-app',
		'generate:network-config --network-name mydir --label alpha-sdk-app --community-identifier sdk',
	];

	static flags = {
		'network-name': flagParser.string({
			char: 'n',
			description: 'Name of the network directory where the config file is saved',
			default: '',
		}),
		label: flagParser.string({
			char: 'l',
			description: 'App Label',
			default: 'alpha-sdk-app',
		}),
		'community-identifier': flagParser.string({
			char: 'i',
			description: 'Community Identifier',
			default: 'sdk',
		}),
	};

	async run(): Promise<void> {
		const {
			flags: { 'network-name': networkName, label, 'community-identifier': communityIdentifier },
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		} = this.parse(CreateCommand);

		// validate folder name to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /^([a-z]+)(([A-Z]([a-z]+))+)$/;
		if (regexCamelCase.test(networkName) || regexWhitespace.test(networkName)) {
			this.error('Invalid name');
		}

		// determine proper path
		const configPath = join(process.cwd(), networkName);
		const filePath = join(configPath, 'config');

		defaultConfig.label = label;
		defaultConfig.genesisConfig.communityIdentifier = communityIdentifier;

		// check for existing file at given location & ask the user before overwriting
		if (fs.existsSync(filePath)) {
			const userResponse = await inquirer.prompt({
				type: 'confirm',
				name: 'confirm',
				message: 'A config file already exists at the given location. Do you want to overwrite it?',
			});
			if (!userResponse.confirm) {
				this.error('Operation cancelled, config file already present at the desired location');
			} else {
				fs.writeJSONSync(resolve(configPath, 'config.json'), defaultConfig, { spaces: '' });
			}
		} else {
			fs.mkdirSync(configPath, { recursive: true });
			fs.writeJSONSync(resolve(configPath, 'config.json'), defaultConfig, { spaces: '' });
		}
	}
}
