/*
 * LiskHQ/lisk-sdk
 * Copyright © 2020 Lisk Foundation
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
import { flags } from '@oclif/command';
import * as fs from 'fs-extra';
import * as path from 'path';

import { createApp } from '../app';
import { BaseCommand } from '../base';
import {
	CONFIG_FILE_NAME,
	DEFAULT_FOLDER_NAME,
	GENESIS_FILE_NAME,
} from '../utils/constants';

export default class Run extends BaseCommand {
	static description = 'Run the application';

	static examples = [
		'$ lisk-sample-app run',
		'$ lisk-sample-app run -l debug -d lisk_dev',
	];

	static flags = {
		'config-dir': flags.string({
			char: 'c',
			env: 'LISK_CONFIG_DIR',
			description: 'Path to the config folder',
		}),
		seeds: flags.string({
			char: 's',
			description: 'List of seed nodes to use in ip:port format',
		}),
		port: flags.string({
			char: 'p',
			env: 'LISK_PORT',
			description: 'WSPort to use',
		}),
		database: flags.string({ char: 'd', description: 'Database name to use' }),
		'console-log-level': flags.string({
			char: 'l',
			env: 'LISK_CONSOLE_LOG_LEVEL',
			description: 'Log level to print to print',
			options: ['fatal', 'error', 'info', 'debug', 'trace'],
		}),
		// Boolean flags
		'enable-http-api': flags.boolean({ description: 'Enable HTTP API module' }),
	};

	static args = [{ name: 'label' }];

	public async run(): Promise<void> {
		const { args, flags: inputFlags } = this.parse(Run);
		const configDir = inputFlags['config-dir'] ?? this.config.configDir;
		const label = args.label ?? DEFAULT_FOLDER_NAME;
		const configPath = path.join(configDir, label);
		const configExists = await fs.pathExists(configPath);
		if (!configExists) {
			throw new Error(`Path: ${configPath} does not exist.`);
		}

		const genesisBlock = await fs.readJSON(
			path.join(configPath, GENESIS_FILE_NAME),
		);
		const config = await fs.readJSON(path.join(configPath, CONFIG_FILE_NAME));
		if (inputFlags['console-log-level']) {
			config.components.logger.consoleLogLevel =
				inputFlags['console-log-level'];
		}
		if (inputFlags.port) {
			config.app.network.wsPort = parseInt(inputFlags.port, 10);
		}
		if (inputFlags.database) {
			config.components.storage.database = inputFlags.database;
		}
		const app = createApp(genesisBlock, config);
		this.log(`Starting application using ${configPath}`);
		try {
			await app.run();
		} catch (err) {
			this.error(err);
		}
	}
}
