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
import CommandCommand from '../../../src/commands/generate/command';
import { getConfig } from '../../helpers/config';
import { Awaited } from '../../types';

describe('generate:command command', () => {
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

	describe('generate:command', () => {
		it('should throw an error when all arg is not provided', async () => {
			await expect(CommandCommand.run([], config)).rejects.toThrow('Missing 2 required arg');
		});

		it('should throw an error when a arg is not provided', async () => {
			await expect(CommandCommand.run(['nft'], config)).rejects.toThrow('Missing 1 required arg');
		});
	});

	describe('generate:command should check app directory', () => {
		it('should throw error if cwd is not a lisk app directory', async () => {
			jest.spyOn<any, any>(BaseBootstrapCommand.prototype, '_isLiskAppDir').mockReturnValue(false);
			jest.spyOn(process, 'cwd').mockReturnValue('/my/dir');

			await expect(CommandCommand.run(['nft', 'register'], config)).rejects.toThrow(
				'You can run this command only in lisk app directory. Run "lisk init --help" command for more details.',
			);
			expect(BaseBootstrapCommand.prototype['_isLiskAppDir']).toHaveBeenCalledWith('/my/dir');
		});

		it('should not throw error if cwd is a lisk app directory', async () => {
			jest.spyOn<any, any>(BaseBootstrapCommand.prototype, '_isLiskAppDir').mockReturnValue(true);
			jest.spyOn(process, 'cwd').mockReturnValue('/my/dir');
			jest
				.spyOn<any, any>(BaseBootstrapCommand.prototype, '_runBootstrapCommand')
				.mockResolvedValue(null as never);

			await expect(CommandCommand.run(['nft', 'register'], config)).resolves.toBeNull();
			expect(BaseBootstrapCommand.prototype['_isLiskAppDir']).toHaveBeenCalledWith('/my/dir');
			expect(BaseBootstrapCommand.prototype['_runBootstrapCommand']).toHaveBeenCalledWith(
				'lisk:generate:command',
				{
					moduleName: 'nft',
					commandName: 'register',
				},
			);
		});
	});
});
