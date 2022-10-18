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

import { Command } from '@oclif/core';
import { join } from 'path';
import * as tar from 'tar';
import { flagsWithParser } from '../../../utils/flags';
import { getDefaultPath, getFullPath } from '../../../utils/path';

export class ExportCommand extends Command {
	static description = 'Export to <FILE>.';

	static examples = [
		'blockchain:export',
		'blockchain:export --data-path ./data --output ./my/path/',
	];

	static flags = {
		'data-path': flagsWithParser.dataPath,
		output: flagsWithParser.output,
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(ExportCommand);
		const dataPath = flags['data-path']
			? flags['data-path']
			: getDefaultPath(this.config.pjson.name);
		const inputPath = join(dataPath, 'data');
		const exportPath = flags.output ? flags.output : process.cwd();

		this.log('Exporting blockchain:');
		this.log(`   ${getFullPath(inputPath)}`);
		const filePath = join(exportPath, 'blockchain.db.tar.gz');
		await tar.create(
			{
				gzip: true,
				file: filePath,
				cwd: inputPath,
			},
			['state.db', 'blockchain.db'],
		);

		this.log('Export completed:');
		this.log(`   ${filePath}`);
	}
}
