/*
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
import * as utils from '@liskhq/lisk-utils';
import { Command } from '@oclif/command';
import * as fs from 'fs-extra';
import { ApplicationConfig } from 'lisk-framework';
import { flagsWithParser } from '../../../utils/flags';
import { getConfigDirs, getConfigFilesPath, getDefaultPath } from '../../../utils/path';

export class ShowCommand extends Command {
	static description = 'Show application config.';

	static examples = [
		'config:show',
		'config:show --pretty',
		'config:show --config ./custom-config.json --data-path ./data',
	];

	static flags = {
		'data-path': flagsWithParser.dataPath,
		config: flagsWithParser.config,
		pretty: flagsWithParser.pretty,
	};

	async run(): Promise<void> {
		const { flags } = this.parse(ShowCommand);
		const dataPath = flags['data-path']
			? flags['data-path']
			: getDefaultPath(this.config.pjson.name);

		// Validate dataPath/config if config for other network exists, throw error and exit unless overwrite-config is specified
		const configDir = getConfigDirs(dataPath);
		// If config file exist, do not copy unless overwrite-config is specified
		if (configDir.length !== 1) {
			this.error(`Folder in ${dataPath} does not contain valid config`);
		}
		// Read network genesis block and config from the folder
		const { configFilePath } = getConfigFilesPath(dataPath);
		// Get config from network config or config specified
		let config = (await fs.readJSON(configFilePath)) as ApplicationConfig;

		if (flags.config) {
			const customConfig = (await fs.readJSON(flags.config)) as ApplicationConfig;
			config = utils.objects.mergeDeep({}, config, customConfig) as ApplicationConfig;
		}

		config.system.dataPath = dataPath;

		if (flags.pretty) {
			this.log(JSON.stringify(config, undefined, '  '));
		} else {
			this.log(JSON.stringify(config));
		}
	}
}
