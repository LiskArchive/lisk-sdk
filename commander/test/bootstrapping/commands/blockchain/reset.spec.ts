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
import * as inquirer from 'inquirer';
import { homedir } from 'os';
import { join } from 'path';

import * as appUtils from '../../../../src/utils/application';
import * as pathUtils from '../../../../src/utils/path';
import { ResetCommand } from '../../../../src/bootstrapping/commands/blockchain/reset';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

const defaultDataPath = join(homedir(), '.lisk', 'lisk-core');

describe('blockchain:reset', () => {
	const pid = 56869;

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(pathUtils, 'getBlockchainDBPath').mockReturnValue('path');
		jest.spyOn(appUtils, 'getPid').mockReturnValue(pid);
		jest.spyOn(inquirer, 'prompt').mockResolvedValue({ answer: false });
		jest.spyOn(fs, 'removeSync').mockReturnValue();
	});

	describe('when application is running', () => {
		beforeEach(() => {
			jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		});

		describe('when reset without flags', () => {
			it('should log error and return', async () => {
				await expect(ResetCommand.run([], config)).rejects.toThrow(
					`Can't reset db while running application. Application at data path ${defaultDataPath} is running with pid ${pid}.`,
				);
			});
		});

		describe('when reset with data-path', () => {
			it('should log error and return', async () => {
				await expect(ResetCommand.run(['--data-path=/my/app/'], config)).rejects.toThrow(
					`Can't reset db while running application. Application at data path /my/app/ is running with pid ${pid}.`,
				);
			});
		});

		describe('when starting with skip confirmation', () => {
			it('should log error and return', async () => {
				await expect(ResetCommand.run(['--yes'], config)).rejects.toThrow(
					`Can't reset db while running application. Application at data path ${defaultDataPath} is running with pid ${pid}.`,
				);
			});
		});
	});

	describe('when application is not running', () => {
		beforeEach(() => {
			jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(false);
		});

		describe('when reset without flag', () => {
			it('should create db object for "blockchain.db" for default data path', async () => {
				await ResetCommand.run([], config);
				expect(pathUtils.getBlockchainDBPath).toHaveBeenCalledTimes(1);
				expect(pathUtils.getBlockchainDBPath).toHaveBeenCalledWith(defaultDataPath);
			});

			it('should prompt user for confirmation', async () => {
				await ResetCommand.run([], config);
				expect(inquirer.prompt).toHaveBeenCalledTimes(1);
				expect(inquirer.prompt).toHaveBeenCalledWith([
					{
						name: 'answer',
						message: 'Are you sure you want to reset the db?',
						type: 'list',
						choices: ['yes', 'no'],
					},
				]);
			});

			it('should reset the blockchain db', async () => {
				await ResetCommand.run([], config);
				expect(fs.removeSync).toHaveBeenCalledTimes(3);
			});
		});

		describe('when reset with data-path', () => {
			beforeEach(() => {
				jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(false);
			});

			it('should create db object for "blockchain.db" for given data path', async () => {
				await ResetCommand.run(['--data-path=/my/app/'], config);
				expect(pathUtils.getBlockchainDBPath).toHaveBeenCalledTimes(1);
				expect(pathUtils.getBlockchainDBPath).toHaveBeenCalledWith('/my/app/');
			});

			it('should prompt user for confirmation', async () => {
				await ResetCommand.run(['--data-path=/my/app/'], config);
				expect(inquirer.prompt).toHaveBeenCalledTimes(1);
				expect(inquirer.prompt).toHaveBeenCalledWith([
					{
						name: 'answer',
						message: 'Are you sure you want to reset the db?',
						type: 'list',
						choices: ['yes', 'no'],
					},
				]);
			});

			it('should reset the blockchain db', async () => {
				await ResetCommand.run(['--data-path=/my/app/'], config);
				expect(fs.removeSync).toHaveBeenCalledTimes(3);
			});
		});

		describe('when skipping confirmation prompt', () => {
			beforeEach(() => {
				jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(false);
			});

			it('should create db object for "blockchain.db"', async () => {
				await ResetCommand.run(['--yes'], config);
				expect(pathUtils.getBlockchainDBPath).toHaveBeenCalledTimes(1);
			});

			it('should reset the blockchain db', async () => {
				await ResetCommand.run(['--yes'], config);
				expect(fs.removeSync).toHaveBeenCalledTimes(3);
			});
		});
	});
});
