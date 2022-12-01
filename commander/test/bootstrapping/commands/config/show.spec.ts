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
import * as os from 'os';
import { when } from 'jest-when';
import { ShowCommand } from '../../../../src/bootstrapping/commands/config/show';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

describe('config:show command', () => {
	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(fs, 'readJSON').mockResolvedValue({
			system: {},
			network: { port: 3000 },
			logger: {
				consoleLogLevel: 'error',
			},
		} as never);
		jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true } as never);
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		jest.spyOn(fs, 'removeSync').mockReturnValue(null as never);
		jest.spyOn(fs, 'readdirSync').mockReturnValue(['mainnet'] as never);
		jest.spyOn(os, 'homedir').mockReturnValue('~');
	});

	describe('config:show', () => {
		it('should get the config from default path', async () => {
			await ShowCommand.run([], config);
			expect(JSON.parse(stdout[0]).network.port).toBe(3000);
		});
	});

	describe('config:show -d ./new-folder', () => {
		it('should throw an error if the data path does not contain config', async () => {
			when(fs.existsSync as jest.Mock)
				.calledWith('new-folder/config/config.json')
				.mockReturnValue(false);
			await expect(ShowCommand.run(['-d', './new-folder'], config)).rejects.toThrow(
				'does not contain valid config',
			);
		});
	});

	describe('config:show -d ./config', () => {
		it('should get the config from default path', async () => {
			await ShowCommand.run(['-d', './existing'], config);
			expect(fs.readJSON).toHaveBeenCalledWith('existing/config/config.json');
		});
	});

	describe('config:show -c ./custom-config.json', () => {
		const configPath = './custom-config.json';
		const customConfig = { network: { port: 9999 }, system: {} };

		it('should overwrite the config with provided custom config', async () => {
			when(fs.readJSON as jest.Mock)
				.calledWith(configPath)
				.mockResolvedValue(customConfig);
			await ShowCommand.run(['-c', configPath], config);
			expect(JSON.parse(stdout[0]).network.port).toBe(9999);
		});
	});
});
