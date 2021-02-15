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
import { homedir } from 'os';
import * as path from 'path';
import * as Config from '@oclif/config';
import { getForgerDBPath } from '../../../../src/utils/path';
import * as downloadUtils from '../../../../src/utils/download';
import { ImportCommand } from '../../../../src/bootstrapping/commands/forger-info/import';
import { getConfig } from '../../../helpers/config';

describe('forger-info:import', () => {
	const defaultDataPath = path.join(homedir(), '.lisk', 'lisk-core');
	const defaultForgerDBPath = getForgerDBPath(defaultDataPath);
	const pathToForgerGzip = '/path/to/forger.db.tar.gz';

	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(fs, 'existsSync').mockReturnValue(false);
		jest.spyOn(fs, 'removeSync').mockReturnValue(undefined);
		jest.spyOn(path, 'extname').mockReturnValue('.gz');
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue(undefined);
		jest.spyOn(downloadUtils, 'extract').mockResolvedValue(undefined);
	});

	describe('when importing with no path argument', () => {
		it('should throw an error when no arguments are provided.', async () => {
			await expect(ImportCommand.run([], config)).rejects.toThrow('Missing 1 required arg:');
		});
	});

	describe('when importing with no existing forger data', () => {
		it('should import "forger.db" from given path', async () => {
			await ImportCommand.run([pathToForgerGzip], config);
			expect(fs.existsSync).toHaveBeenCalledTimes(1);
			expect(fs.existsSync).toHaveBeenCalledWith(defaultForgerDBPath);
			expect(fs.ensureDirSync).toHaveBeenCalledTimes(1);
			expect(fs.ensureDirSync).toHaveBeenCalledWith(defaultForgerDBPath);
			expect(downloadUtils.extract).toHaveBeenCalledTimes(1);
			expect(downloadUtils.extract).toHaveBeenCalledWith(
				path.dirname(pathToForgerGzip),
				'forger.db.tar.gz',
				defaultForgerDBPath,
			);
		});
	});

	describe('when importing with --data-path flag', () => {
		const dataPath = getForgerDBPath('/my/app/');
		it('should import "forger.db" to given data-path', async () => {
			await ImportCommand.run([pathToForgerGzip, '--data-path=/my/app/'], config);
			expect(fs.existsSync).toHaveBeenCalledTimes(1);
			expect(fs.existsSync).toHaveBeenCalledWith(dataPath);
			expect(fs.ensureDirSync).toHaveBeenCalledTimes(1);
			expect(fs.ensureDirSync).toHaveBeenCalledWith(dataPath);
			expect(downloadUtils.extract).toHaveBeenCalledTimes(1);
			expect(downloadUtils.extract).toHaveBeenCalledWith(
				path.dirname(pathToForgerGzip),
				'forger.db.tar.gz',
				dataPath,
			);
		});
	});

	describe('when importing with existing forger data', () => {
		beforeEach(() => {
			(fs.existsSync as jest.Mock).mockReturnValue(true);
		});

		describe('when importing without --force flag', () => {
			it('should log error and return', async () => {
				await expect(ImportCommand.run([pathToForgerGzip], config)).rejects.toThrow(
					`Forger data already exists at ${defaultDataPath}. Use --force flag to overwrite`,
				);
			});
		});

		describe('when importing with --force flag', () => {
			it('should import "forger.db" to given data-path', async () => {
				await ImportCommand.run([pathToForgerGzip, '--force'], config);
				expect(fs.ensureDirSync).toHaveBeenCalledTimes(1);
				expect(fs.ensureDirSync).toHaveBeenCalledWith(defaultForgerDBPath);
				expect(downloadUtils.extract).toHaveBeenCalledTimes(1);
				expect(fs.removeSync).toHaveBeenCalledWith(defaultForgerDBPath);
				expect(downloadUtils.extract).toHaveBeenCalledWith(
					path.dirname(pathToForgerGzip),
					'forger.db.tar.gz',
					defaultForgerDBPath,
				);
			});
		});
	});
});
