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
import { homedir } from 'os';
import { join } from 'path';
import * as Config from '@oclif/config';
import { ExportCommand } from '../../../../src/bootstrapping/commands/forger-info/export';
import { getConfig } from '../../../helpers/config';

describe('forger-info:export', () => {
	const defaultDataPath = join(homedir(), '.lisk', 'lisk-core');

	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(tar, 'create').mockResolvedValue(true as never);
	});

	describe('when starting without flag', () => {
		it('should compress "forger.db" for default data path', async () => {
			await ExportCommand.run([], config);
			expect(tar.create).toHaveBeenCalledTimes(1);
			expect(tar.create).toHaveBeenCalledWith(
				{
					cwd: join(defaultDataPath, 'data'),
					file: join(process.cwd(), 'forger.db.tar.gz'),
					gzip: true,
				},
				['forger.db'],
			);
		});
	});

	describe('when starting with particular data-path', () => {
		it('should compress "forger.db" for given data path', async () => {
			await ExportCommand.run(['--data-path=/my/app/'], config);
			expect(tar.create).toHaveBeenCalledTimes(1);
			expect(tar.create).toHaveBeenCalledWith(
				{
					cwd: join('/my/app/', 'data'),
					file: join(process.cwd(), 'forger.db.tar.gz'),
					gzip: true,
				},
				['forger.db'],
			);
		});
	});

	describe('when starting with particular export path', () => {
		it('should compress "forger.db" for given data path', async () => {
			await ExportCommand.run(['--output=/my/dir/'], config);
			expect(tar.create).toHaveBeenCalledTimes(1);
			expect(tar.create).toHaveBeenCalledWith(
				{
					cwd: join(defaultDataPath, 'data'),
					file: join('/my/dir/', 'forger.db.tar.gz'),
					gzip: true,
				},
				['forger.db'],
			);
		});
	});
});
