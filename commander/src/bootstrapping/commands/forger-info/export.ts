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

import * as tar from 'tar';
import { join } from 'path';
import { Command, flags as flagParser } from '@oclif/command';
import { getDefaultPath, getFullPath, getForgerDBPath } from '../../../utils/path';

export abstract class ExportCommand extends Command {
	static description = 'Export to <FILE>.';

	static examples = [
		'forger-info:export',
		'forger-info:export --data-path ./data --output ./my/path/',
	];

	static flags = {
		'data-path': flagParser.string({
			char: 'd',
			description:
				'Directory path to specify where node data is stored. Environment variable "LISK_DATA_PATH" can also be used.',
			env: 'LISK_DATA_PATH',
		}),
		output: flagParser.string({
			char: 'o',
			description: 'The output directory. Default will set to current working directory.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = this.parse(ExportCommand);
		const dataPath = flags['data-path'] ? flags['data-path'] : getDefaultPath();
		const forgerDataPath = getForgerDBPath(dataPath);
		const exportPath = flags.output ? flags.output : process.cwd();

		this.log('Exporting ForgerInfo:');
		this.log(`   ${getFullPath(forgerDataPath)}`);
		const filePath = join(exportPath, 'forger.db.tar.gz');
		await tar.create(
			{
				gzip: true,
				file: filePath,
				cwd: join(dataPath, 'data'),
			},
			['forger.db'],
		);

		this.log('Export completed:');
		this.log(`   ${filePath}`);
	}
}
