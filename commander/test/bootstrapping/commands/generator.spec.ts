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

describe('generator enable/disable', () => {
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
		invokeMock = jest.fn();
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			invoke: invokeMock,
		} as never);
		jest.spyOn(inquirer, 'prompt').mockResolvedValue({ password: 'promptPassword' });
	});

	describe('generator:enable', () => {
		it('should throw an error when arg is not provided', async () => {
			await expect(EnableCommand.run([], config)).rejects.toThrow('Missing 1 required arg');
		});

		it('should throw an error when height, max-height-generated and max-height-prevoted arg is not provided', async () => {
			await expect(
				EnableCommand.run(['myAddress', '--password=my-password'], config),
			).rejects.toThrow(
				'The height, max-height-generated and max-height-prevoted values must be greater than or equal to 0',
			);
		});

		it('should throw an error when arg max-height-generated and max-height-prevoted is not provided', async () => {
			await expect(
				EnableCommand.run(['myAddress', '--height=10', '--password=my-password'], config),
			).rejects.toThrow(
				'The height, max-height-generated and max-height-prevoted values must be greater than or equal to 0',
			);
		});

		it('should throw an error when arg height and use-status-value is provided together', async () => {
			await expect(
				EnableCommand.run(
					['myAddress', '--height=10', '--use-status-value', '--password=my-password'],
					config,
				),
			).rejects.toThrow('--use-status-value=true cannot also be provided when using --height');
		});

		describe('when invoked with password', () => {
			it('should invoke action with given address and password', async () => {
				await EnableCommand.run(
					[
						'myAddress',
						'--height=10',
						'--max-height-generated=10',
						'--max-height-prevoted=1',
						'--password=my-password',
					],
					config,
				);
				expect(invokeMock).toHaveBeenCalledWith('generator_updateStatus', {
					address: 'myAddress',
					enable: true,
					password: 'my-password',
					height: 10,
					maxHeightGenerated: 10,
					maxHeightPrevoted: 1,
				});
			});

			it('should invoke action with given address and password with the response of generator status when --use-status-value is specified', async () => {
				when(invokeMock)
					.calledWith('generator_getStatus')
					.mockResolvedValue({
						status: [
							{
								address: 'myAddress',
								height: 210,
								maxHeightGenerated: 11,
								maxHeightPrevoted: 12,
							},
						],
					});

				await EnableCommand.run(
					['myAddress', '--use-status-value', '--password=my-password'],
					config,
				);
				expect(invokeMock).toHaveBeenCalledWith('generator_updateStatus', {
					address: 'myAddress',
					enable: true,
					password: 'my-password',
					height: 210,
					maxHeightGenerated: 11,
					maxHeightPrevoted: 12,
				});
			});
		});

		describe('when invoked without password', () => {
			it('should prompt user for password', async () => {
				await EnableCommand.run(
					['myAddress', '--height=10', '--max-height-generated=10', '--max-height-prevoted=1'],
					config,
				);
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
				await EnableCommand.run(
					['myAddress', '--height=10', '--max-height-generated=10', '--max-height-prevoted=1'],
					config,
				);
				expect(invokeMock).toHaveBeenCalledWith('generator_updateStatus', {
					address: 'myAddress',
					enable: true,
					password: 'promptPassword',
					height: 10,
					maxHeightGenerated: 10,
					maxHeightPrevoted: 1,
				});
			});
		});

		describe('when use-status-value is used', () => {
			it('should invoke action with given address and user provided password', async () => {
				invokeMock.mockResolvedValue({
					status: [
						{ address: 'myAddress', height: 20, maxHeightGenerated: 3, maxHeightPrevoted: 4 },
					],
				});

				await EnableCommand.run(
					['myAddress', '--use-status-value', '--password=my-password'],
					config,
				);

				expect(invokeMock).toHaveBeenCalledWith('generator_updateStatus', {
					address: 'myAddress',
					enable: true,
					password: 'my-password',
					height: 20,
					maxHeightGenerated: 3,
					maxHeightPrevoted: 4,
				});
				expect(stdout[0]).toMatch('Enabled block generation for myAddress');
			});
		});

		describe('when action is successful', () => {
			it('should invoke action with given address and user provided password', async () => {
				await EnableCommand.run(
					[
						'myAddress',
						'--height=10',
						'--max-height-generated=10',
						'--max-height-prevoted=1',
						'--password=my-password',
					],
					config,
				);
				expect(stdout[0]).toMatch('Enabled block generation for myAddress');
			});
		});

		describe('when action fail', () => {
			it('should log the error returned', async () => {
				when(invokeMock)
					.calledWith('generator_updateStatus', {
						address: 'myFailedEnabledAddress',
						enable: true,
						password: 'my-password',
						height: 10,
						maxHeightGenerated: 10,
						maxHeightPrevoted: 1,
					})
					.mockRejectedValue(new Error('Custom Error'));
				await expect(
					EnableCommand.run(
						[
							'myFailedEnabledAddress',
							'--height=10',
							'--max-height-generated=10',
							'--max-height-prevoted=1',
							'--password=my-password',
						],
						config,
					),
				).rejects.toThrow('Custom Error');
			});
		});
	});

	describe('generator:disable', () => {
		it('should throw an error when arg is not provided', async () => {
			await expect(DisableCommand.run([], config)).rejects.toThrow('Missing 1 required arg');
		});

		describe('when invoked with password', () => {
			it('should invoke action with given address and password', async () => {
				await DisableCommand.run(['myAddress', '--password=my-password'], config);
				expect(invokeMock).toHaveBeenCalledWith('generator_updateStatus', {
					address: 'myAddress',
					enable: false,
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
				expect(invokeMock).toHaveBeenCalledWith('generator_updateStatus', {
					address: 'myAddress',
					enable: false,
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
				expect(stdout[0]).toMatch('Disabled block generation');
			});
		});

		describe('when action fail', () => {
			it('should log the error returned', async () => {
				when(invokeMock)
					.calledWith('generator_updateStatus', {
						address: 'myFailedDisabledAddress',
						enable: false,
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
