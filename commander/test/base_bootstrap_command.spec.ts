/*
 * LiskHQ/lisk-commander
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
import { Config } from '@oclif/core';
import * as fs from 'fs';
import BaseBootstrapCommand from '../src/base_bootstrap_command';
import { getConfig } from './helpers/config';
import { Awaited } from './types';

class MyCommand extends BaseBootstrapCommand {
	run(): PromiseLike<any> {
		throw new Error('Method not implemented.');
	}
}

describe('base_bootstrap_command command', () => {
	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
	});

	describe('_isLiskAppDir', () => {
		it('should to check .liskrc.json file', async () => {
			jest.spyOn(fs, 'existsSync').mockReturnValue(true);
			new MyCommand([], (config as unknown) as Config)['_isLiskAppDir']('/my/dir');

			expect(fs.existsSync).toHaveBeenCalledWith('/my/dir/.liskrc.json');
		});
	});
});
