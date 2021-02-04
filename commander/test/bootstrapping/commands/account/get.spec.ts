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
import { when } from 'jest-when';
import * as fs from 'fs-extra';
import * as apiClient from '@liskhq/lisk-api-client';
import * as Config from '@oclif/config';

import { getConfig } from '../../../helpers/config';
import { BaseIPCClientCommand } from '../../../../src/bootstrapping/commands/base_ipc_client';
import * as appUtils from '../../../../src/utils/application';
import { GetCommand } from '../../../../src/bootstrapping/commands/account/get';

describe('account:get command', () => {
	const queryResult = {
		address: '',
	};
	const address = 'c3ab2ac23512d9bf62b02775e22cf80df814eb1b';
	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;
	let getMock: jest.Mock;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		getMock = jest.fn();
		when(getMock)
			.mockResolvedValue(
				'0a14c3ab2ac23512d9bf62b02775e22cf80df814eb1b10001800220208002a3a0a190a0a67656e657369735f38361800200028003080a094a58d1d121d0a14c3ab2ac23512d9bf62b02775e22cf80df814eb1b1080a094a58d1d',
			)
			.calledWith(Buffer.from('1234', 'hex'))
			.mockRejectedValue(new Error('unknown address'));
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			schemas: {
				account: {
					$id: 'dummy',
					type: 'object',
					properties: { address: { dataType: 'bytes' } },
				},
			},
			account: {
				get: getMock,
				toJSON: jest.fn().mockReturnValue(queryResult),
			},
		} as never);
		jest.spyOn(BaseIPCClientCommand.prototype, 'printJSON');
	});

	describe('account:get', () => {
		it('should throw an error when arg is not provided', async () => {
			await expect(GetCommand.run([], config)).rejects.toThrow('Missing 1 required arg');
		});
	});

	describe('account:get address', () => {
		it('should get an account info and display as an object', async () => {
			await GetCommand.run([address], config);
			expect(getMock).toHaveBeenCalledTimes(1);
			expect(getMock).toHaveBeenCalledWith(Buffer.from(address, 'hex'));
			expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledWith(queryResult);
		});
	});

	describe('account:get unknown_address', () => {
		it('should throw an error when unknown address is specified', async () => {
			await expect(GetCommand.run(['1234'], config)).rejects.toThrow('unknown address');
		});
	});
});
