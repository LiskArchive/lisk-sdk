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

import { BaseCommand } from '../../base';
import { CONFIG_FILE_NAME, DEFAULT_FOLDER_NAME } from '../../utils/constants';

export default class Show extends BaseCommand {
	static description = 'describe the command here';

	static examples = ['$ lisk-sample-app config:show label'];

	static flags = {
		'config-dir': flags.string({
			char: 'c',
			description: 'Path to the config folder',
		}),
	};

	static args = [{ name: 'label' }];

	public async run(): Promise<void> {
		const { args, flags: flagsInput } = this.parse(Show);
		const configDir = flagsInput['config-dir']
			? path.join(__dirname, flagsInput['config-dir'])
			: this.config.configDir;
		const label = args.label ?? DEFAULT_FOLDER_NAME;
		const configPath = path.join(configDir, label, CONFIG_FILE_NAME);
		const config = await fs.readJSON(configPath);
		this.log(`Showing config from: ${configPath}`);
		this.log(JSON.stringify(config, undefined, '  '));
	}
}
