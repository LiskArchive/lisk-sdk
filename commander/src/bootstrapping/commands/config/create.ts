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
import { Command, Flags as flagParser } from '@oclif/core';
import { homedir } from 'os';
import * as fs from 'fs-extra';
import { join, resolve } from 'path';
import * as inquirer from 'inquirer';
import { isHexString } from '@liskhq/lisk-validator';
import { defaultConfig } from '../../../utils/config';
import { handleOutputFlag } from '../../../utils/output';

export class CreateCommand extends Command {
	static description = 'Creates network configuration file.';
	static examples = [
		'config:create --output mydir',
		'config:create --output mydir --label beta-sdk-app',
		'config:create --output mydir --label beta-sdk-app --community-identifier sdk',
	];

	static flags = {
		output: flagParser.string({
			char: 'o',
			description: 'Directory where the config file is saved',
			default: process.cwd(),
		}),
		label: flagParser.string({
			char: 'l',
			description: 'App Label',
			default: 'beta-sdk-app',
		}),
		'chain-id': flagParser.string({
			char: 'i',
			description: 'ChainID in hex format. For example, Lisk mainnet mainchain is 00000000',
			required: true,
		}),
	};

	async run(): Promise<void> {
		const {
			flags: { output, label, 'chain-id': chainID },
		} = await this.parse(CreateCommand);

		// validate folder name to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /^([a-z]+)(([A-Z]([a-z]+))+)$/;
		if (regexCamelCase.test(output) || regexWhitespace.test(output)) {
			this.error('Invalid name');
		}

		if (!isHexString(chainID) || chainID.length !== 8) {
			this.error('Invalid chain ID format. ChainID must be in hex format with 8 characters');
		}

		// determine proper path
		const configPath = resolve(output);
		const filePath = join(configPath, 'config');

		defaultConfig.system.dataPath = join(homedir(), '.lisk', label);
		(defaultConfig.genesis as Record<string, unknown>).chainID = chainID;

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
				const res = await handleOutputFlag(configPath, defaultConfig, 'config', 'config.json');
				this.log(res);
			}
		} else {
			fs.mkdirSync(configPath, { recursive: true });

			const res = await handleOutputFlag(configPath, defaultConfig, 'config', 'config.json');
			this.log(res);
		}
	}
}
