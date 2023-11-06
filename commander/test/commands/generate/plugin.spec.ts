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

import BaseBootstrapCommand from '../../../src/base_bootstrap_command';
import PluginCommand from '../../../src/commands/generate/plugin';
import { getConfig } from '../../helpers/config';
import { Awaited } from '../../types';

describe('generate:plugin command', () => {
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

	describe('generate:plugin', () => {
		it('should throw an error when all arg is not provided', async () => {
			await expect(PluginCommand.run([], config)).rejects.toThrow('Missing 1 required arg');
		});
	});

	describe('generate:plugin invalidName', () => {
		it('should throw an error when module name is invalid', async () => {
			await expect(PluginCommand.run(['http$5'], config)).rejects.toThrow('Invalid plugin name');
		});
	});

	describe('generate:plugin should check app directory', () => {
		it('should throw error if cwd is not a lisk app directory', async () => {
			jest.spyOn<any, any>(BaseBootstrapCommand.prototype, '_isLiskAppDir').mockReturnValue(false);
			jest.spyOn(process, 'cwd').mockReturnValue('/my/dir');

			await expect(PluginCommand.run(['httpPlugin'], config)).rejects.toThrow(
				'You can run this command only in lisk app directory. Run "lisk init --help" command for more details.',
			);
			expect(BaseBootstrapCommand.prototype['_isLiskAppDir']).toHaveBeenCalledWith('/my/dir');
		});

		it('should not throw error if cwd is a lisk app directory', async () => {
			jest.spyOn<any, any>(BaseBootstrapCommand.prototype, '_isLiskAppDir').mockReturnValue(true);
			jest
				.spyOn<any, any>(BaseBootstrapCommand.prototype, '_runBootstrapCommand')
				.mockResolvedValue(null as never);
			jest.spyOn(process, 'cwd').mockReturnValue('/my/dir');

			await expect(PluginCommand.run(['httpPlugin'], config)).resolves.toBeNull();
			expect(BaseBootstrapCommand.prototype['_isLiskAppDir']).toHaveBeenCalledWith('/my/dir');
			expect(BaseBootstrapCommand.prototype['_runBootstrapCommand']).toHaveBeenCalledWith(
				'lisk:generate:plugin',
				{ name: 'httpPlugin' },
			);
		});

		it('should not throw error if cwd is not lisk app directory and --standalone was provided', async () => {
			jest.spyOn<any, any>(BaseBootstrapCommand.prototype, '_isLiskAppDir');
			jest
				.spyOn<any, any>(BaseBootstrapCommand.prototype, '_runBootstrapCommand')
				.mockResolvedValue(null as never);

			await expect(
				PluginCommand.run(['httpPlugin', '--standalone', '--output', '/my/dir'], config),
			).resolves.toBeNull();
			expect(BaseBootstrapCommand.prototype['_isLiskAppDir']).not.toHaveBeenCalled();
			expect(BaseBootstrapCommand.prototype['_runBootstrapCommand']).toHaveBeenCalledWith(
				'lisk:init:plugin',
				{
					name: 'httpPlugin',
					projectPath: '/my/dir',
				},
			);
		});
	});
});
