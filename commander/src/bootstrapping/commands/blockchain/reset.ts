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
import * as fs from 'fs-extra';
import { Command, Flags as flagParser } from '@oclif/core';
import * as inquirer from 'inquirer';
import {
	getDefaultPath,
	getBlockchainDBPath,
	getStateDBPath,
	getModuleDBPath,
} from '../../../utils/path';
import { flagsWithParser } from '../../../utils/flags';
import { getPid, isApplicationRunning } from '../../../utils/application';

export class ResetCommand extends Command {
	static description = 'Reset the blockchain data.';

	static examples = [
		'blockchain:reset',
		'blockchain:reset --data-path ./lisk',
		'blockchain:reset --yes',
	];

	static flags = {
		'data-path': flagsWithParser.dataPath,
		yes: flagParser.boolean({
			char: 'y',
			description: 'Skip confirmation prompt.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(ResetCommand);
		const dataPath = flags['data-path']
			? flags['data-path']
			: getDefaultPath(this.config.pjson.name);
		const skipPrompt = flags.yes ?? false;

		if (isApplicationRunning(dataPath)) {
			const errorMessage = `Can't reset db while running application. Application at data path ${dataPath} is running with pid ${getPid(
				dataPath,
			)}.`;

			this.error(errorMessage);
		}

		if (!skipPrompt) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const { answer } = await inquirer.prompt([
				{
					name: 'answer',
					message: 'Are you sure you want to reset the db?',
					type: 'list',
					choices: ['yes', 'no'],
				},
			]);

			if (answer === 'no') {
				return;
			}
		}

		// Remove blockchain, state and module dbs
		// Generator and node dbs will not be cleared
		// We manually remove the dbs vs. using db.clear as clear is not implemented yet in state and module dbs (blockchain db for consistency)
		fs.removeSync(getBlockchainDBPath(dataPath));
		fs.removeSync(getStateDBPath(dataPath));
		fs.removeSync(getModuleDBPath(dataPath));

		this.log('Blockchain data has been reset.');
	}
}
