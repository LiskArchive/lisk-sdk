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
import { configurator } from 'lisk-sdk';
import * as path from 'path';

import { BaseCommand } from '../../base';
import { CONFIG_FILE_NAME, DEFAULT_FOLDER_NAME } from '../../utils/constants';

export default class Show extends BaseCommand {
	static description = 'describe the command here';

	static examples = ['$ lisk-sample-app config:generate'];

	static flags = {
		'config-dir': flags.string({
			char: 'c',
			description: 'Path to the config folder',
		}),
		output: flags.boolean({ char: 'o', description: 'Output to file' }),
		force: flags.boolean({ char: 'f', description: 'Overwrite the file' }),
		dev: flags.boolean({ description: 'Use development setting' }),
	};

	static args = [{ name: 'label' }];

	public async run(): Promise<void> {
		const { args, flags: flagsInput } = this.parse(Show);
		// tslint:disable-next-line no-let
		let originalConfig = {};
		if (flagsInput.dev) {
			const devConfig = await fs.readJSON(
				path.join(__dirname, '../../../config/config.json'),
			);
			originalConfig = devConfig;
		}
		const config = configurator.getConfig(originalConfig, {
			failOnInvalidArg: false,
		});
		if (!flagsInput.output) {
			this.log(JSON.stringify(config, undefined, '\t'));

			return;
		}
		const configDir = flagsInput['config-dir'] ?? this.config.configDir;
		const label = args.label ?? DEFAULT_FOLDER_NAME;
		const outputFile = path.join(configDir, label, CONFIG_FILE_NAME);
		const fileAlreadyExist = await fs.pathExists(outputFile);
		if (fileAlreadyExist && !flagsInput.force) {
			throw new Error(`File path ${outputFile} already exists`);
		}
		await fs.ensureDir(path.join(configDir, label));
		await fs.writeJSON(outputFile, config);
		this.log(`Successfully saved generated config to ${outputFile}`);
	}
}
