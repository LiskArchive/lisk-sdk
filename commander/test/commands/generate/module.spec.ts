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

import * as Config from '@oclif/config';
import { getConfig } from '../../helpers/config';
import ModuleCommand from '../../../src/commands/generate/module';

describe('generate:module command', () => {
	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
	});

	describe('generate:module', () => {
		it('should throw an error when all arg is not provided', async () => {
			await expect(ModuleCommand.run([], config)).rejects.toThrow('Missing 2 required arg');
		});

		it('should throw an error when a arg is not provided', async () => {
			await expect(ModuleCommand.run(['nft'], config)).rejects.toThrow('Missing 1 required arg');
		});
	});

	describe('generate:module invalidModuleName invalidModuleID', () => {
		it('should throw an error when module name is invalid', async () => {
			await expect(ModuleCommand.run(['nft$5', '1001'], config)).rejects.toThrow(
				'Invalid module name',
			);
		});

		it('should throw an error when module ID is invalid', async () => {
			await expect(ModuleCommand.run(['nft', '5r'], config)).rejects.toThrow('Invalid module ID');
		});
	});
});
