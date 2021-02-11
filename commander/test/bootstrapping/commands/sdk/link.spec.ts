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
import { join } from 'path';
import { when } from 'jest-when';
import * as Config from '@oclif/config';
import { LinkCommand } from '../../../../src/bootstrapping/commands/sdk/link';
import { getConfig } from '../../../helpers/config';

describe('sdk:link command', () => {
	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(fs, 'removeSync').mockReturnValue();
		jest.spyOn(fs, 'symlink').mockResolvedValue();
	});

	describe('sdk:link', () => {
		it('should throw an error when target folder is missing', async () => {
			await expect(LinkCommand.run([], config)).rejects.toThrow(
				'Missing 1 required arg:\ntargetSDKFolder  The path to the lisk SDK folder\nSee more help with --help',
			);
		});
	});

	describe('sdk:link /path/does/not/exist', () => {
		it('should throw an error when target folder is missing', async () => {
			jest.spyOn(fs, 'pathExistsSync');
			when(fs.pathExistsSync as jest.Mock)
				.calledWith('/path/does/not/exist')
				.mockReturnValue(false);
			await expect(LinkCommand.run(['/path/does/not/exist'], config)).rejects.toThrow(
				"Path '/path/does/not/exist' does not exist or access denied.",
			);
		});
	});

	describe('sdk:link /path/exists', () => {
		const fakeSDKPath = '/path/exists';
		const targetSDKPath = join(__dirname, '../../../../', 'node_modules', 'lisk-sdk');

		it('should call file system functions with correct parameters', async () => {
			jest.spyOn(fs, 'pathExistsSync').mockReturnValue(true);
			when(fs.pathExistsSync as jest.Mock)
				.calledWith(fakeSDKPath)
				.mockReturnValue(true);
			await LinkCommand.run([fakeSDKPath], config);
			expect(fs.pathExistsSync).toHaveBeenCalledWith(fakeSDKPath);
			expect(fs.removeSync).toHaveBeenCalledWith(targetSDKPath);
			expect(fs.symlink).toHaveBeenCalledWith(fakeSDKPath, targetSDKPath);
			expect(stdout[0]).toContain(`Linked '/path/exists' to '${targetSDKPath}'`);
		});
	});

	describe('sdk:link ../lisk-sdk/sdk', () => {
		const fakeSDKPath = '../lisk-sdk/sdk';
		const targetSDKPath = join(process.cwd(), 'node_modules', 'lisk-sdk');

		it('should call file system functions with correct parameters', async () => {
			jest.spyOn(fs, 'pathExistsSync').mockReturnValue(true);
			when(fs.pathExistsSync as jest.Mock)
				.calledWith(fakeSDKPath)
				.mockReturnValue(true);
			await LinkCommand.run([fakeSDKPath], config);
			expect(fs.pathExistsSync).toHaveBeenCalledWith(fakeSDKPath);
			expect(fs.removeSync).toHaveBeenCalledWith(targetSDKPath);
			expect(fs.symlink).toHaveBeenCalledWith(join('../', fakeSDKPath), targetSDKPath);
			expect(stdout[0]).toContain(`Linked '../lisk-sdk/sdk' to '${targetSDKPath}'`);
		});
	});
});
