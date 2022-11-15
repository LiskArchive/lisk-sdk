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

import * as inquirer from 'inquirer';
import * as apiClient from '@liskhq/lisk-api-client';
import { when } from 'jest-when';
import * as appUtils from '../../../src/utils/application';
import { EnableCommand } from '../../../src/bootstrapping/commands/generator/enable';
import { DisableCommand } from '../../../src/bootstrapping/commands/generator/disable';
import { getConfig } from '../../helpers/config';
import { Awaited } from '../../types';

describe('forging', () => {
	const actionResult = 'Status updated.';
	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;
	let invokeMock: jest.Mock;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		invokeMock = jest.fn().mockResolvedValue({ address: 'actionAddress', forging: true });
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			invoke: invokeMock,
		} as never);
		jest.spyOn(inquirer, 'prompt').mockResolvedValue({ password: 'promptPassword' });
	});

	describe('forging:enable', () => {
		it('should throw an error when arg is not provided', async () => {
			await expect(EnableCommand.run([], config)).rejects.toThrow('Missing 4 required arg');
		});

		it('should throw an error when height, maxHeightGenerated and maxHeightPrevoted arg is not provided', async () => {
			await expect(
				EnableCommand.run(['myAddress', '--password=my-password'], config),
			).rejects.toThrow('Missing 3 required arg');
		});

		it('should throw an error when arg maxHeightGenerated and maxHeightPrevoted  is not provided', async () => {
			await expect(
				EnableCommand.run(['myAddress', '10', '--password=my-password'], config),
			).rejects.toThrow('Missing 2 required arg');
		});

		it('should throw an error when arg maxHeightPrevoted is not provided', async () => {
			await expect(
				EnableCommand.run(['myAddress', '100', '100', '--password=my-password'], config),
			).rejects.toThrow('Missing 1 required arg');
		});

		describe('when invoked with password', () => {
			it('should invoke action with given address and password', async () => {
				await EnableCommand.run(['myAddress', '10', '10', '1', '--password=my-password'], config);
				expect(invokeMock).toHaveBeenCalledWith('generator_setStatus', {
					address: 'myAddress',
					enabled: true,
					password: 'my-password',
					height: 10,
					maxHeightGenerated: 10,
					maxHeightPrevoted: 1,
				});
			});
		});

		describe('when invoked without password', () => {
			it('should prompt user for password', async () => {
				await EnableCommand.run(['myAddress', '10', '10', '1'], config);
				expect(inquirer.prompt).toHaveBeenCalledTimes(1);
				expect(inquirer.prompt).toHaveBeenCalledWith([
					{
						type: 'password',
						message: 'Enter password to decrypt the encrypted passphrase: ',
						name: 'password',
						mask: '*',
					},
				]);
			});

			it('should invoke action with given address and password', async () => {
				await EnableCommand.run(['myAddress', '10', '10', '1'], config);
				expect(invokeMock).toHaveBeenCalledWith('generator_setStatus', {
					address: 'myAddress',
					enabled: true,
					password: 'promptPassword',
					height: 10,
					maxHeightGenerated: 10,
					maxHeightPrevoted: 1,
				});
			});
		});

		describe('when action is successful', () => {
			it('should invoke action with given address and user provided password', async () => {
				await EnableCommand.run(['myAddress', '10', '10', '1', '--password=my-password'], config);
				expect(stdout[0]).toMatch(actionResult);
			});
		});

		describe('when action fail', () => {
			it('should log the error returned', async () => {
				when(invokeMock)
					.calledWith('generator_setStatus', {
						address: 'myFailedEnabledAddress',
						enabled: true,
						password: 'my-password',
						height: 10,
						maxHeightGenerated: 10,
						maxHeightPrevoted: 1,
					})
					.mockRejectedValue(new Error('Custom Error'));
				await expect(
					EnableCommand.run(
						['myFailedEnabledAddress', '10', '10', '1', '--password=my-password'],
						config,
					),
				).rejects.toThrow('Custom Error');
			});
		});
	});

	describe('forging:disable', () => {
		it('should throw an error when arg is not provided', async () => {
			await expect(DisableCommand.run([], config)).rejects.toThrow('Missing 1 required arg');
		});

		describe('when invoked with password', () => {
			it('should invoke action with given address and password', async () => {
				await DisableCommand.run(['myAddress', '--password=my-password'], config);
				expect(invokeMock).toHaveBeenCalledWith('generator_setStatus', {
					address: 'myAddress',
					enabled: false,
					password: 'my-password',
					height: 0,
					maxHeightGenerated: 0,
					maxHeightPrevoted: 0,
				});
			});
		});

		describe('when invoked without password', () => {
			it('should prompt user for password', async () => {
				await DisableCommand.run(['myAddress'], config);
				expect(inquirer.prompt).toHaveBeenCalledTimes(1);
				expect(inquirer.prompt).toHaveBeenCalledWith([
					{
						type: 'password',
						message: 'Enter password to decrypt the encrypted passphrase: ',
						name: 'password',
						mask: '*',
					},
				]);
			});

			it('should invoke action with given address and password', async () => {
				await DisableCommand.run(['myAddress'], config);
				expect(invokeMock).toHaveBeenCalledWith('generator_setStatus', {
					address: 'myAddress',
					enabled: false,
					password: 'promptPassword',
					height: 0,
					maxHeightGenerated: 0,
					maxHeightPrevoted: 0,
				});
			});
		});

		describe('when action is successful', () => {
			it('should invoke action with given address and user provided password', async () => {
				await DisableCommand.run(['myAddress', '--password=my-password'], config);
				expect(stdout[0]).toMatch(actionResult);
			});
		});

		describe('when action fail', () => {
			it('should log the error returned', async () => {
				when(invokeMock)
					.calledWith('generator_setStatus', {
						address: 'myFailedDisabledAddress',
						enabled: false,
						password: 'my-password',
						height: 0,
						maxHeightGenerated: 0,
						maxHeightPrevoted: 0,
					})
					.mockRejectedValue(new Error('Custom Error'));
				await expect(
					DisableCommand.run(['myFailedDisabledAddress', '--password=my-password'], config),
				).rejects.toThrow('Custom Error');
			});
		});
	});
});
