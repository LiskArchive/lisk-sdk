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

export default class Run extends BaseCommand {
	static description = 'Run the application';

	static examples = ['$ lisk-sample-app run devnet'];

	static flags = {
		'config-dir': flags.string({
			char: 'c',
			env: 'LISK_CONFIG_DIR',
			description: 'Path to the config folder',
		}),
		seeds: flags.string({
			char: 's',
			description: 'list of seed nodes to use in ip:port format',
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
			description: 'name to print',
		}),
		// Boolean flags
		'enable-http-api': flags.boolean({ description: 'Enable HTTP API module' }),
	};

	static args = [{ name: 'label' }];

	public async run(): Promise<void> {
		const { flags: inputFlags } = this.parse(Run);
		const configPath =
			inputFlags['config-dir'] ?? path.join(this.config.configDir, 'default');
		const genesisBlock = await fs.readJSON(
			path.join(configPath, 'genesis_block.json'),
		);
		const config = await fs.readJSON(path.join(configPath, 'config.json'));
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
		try {
			await app.run();
		} catch (err) {
			this.error(err);
		}
	}
}
