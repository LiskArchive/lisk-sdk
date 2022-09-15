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
import * as apiClient from '@liskhq/lisk-api-client';
import * as appUtils from '../../../../src/utils/application';
import { getConfig } from '../../../helpers/config';
import { BaseIPCClientCommand, InvokeCommand } from '../../../../src';
import { Awaited } from '../../../types';

describe('endpoint:invoke command', () => {
	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;
	let invokeMock: jest.Mock;
	const invokeMockResolvedValue = { result: 'Invoke Response ' };

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		invokeMock = jest.fn().mockResolvedValue(invokeMockResolvedValue);
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			invoke: invokeMock,
		} as never);
		jest.spyOn(BaseIPCClientCommand.prototype, 'printJSON');
	});

	it('should prioritise -f flag and throw error if provided file does not exist', async () => {
		jest.spyOn(fs, 'existsSync').mockReturnValue(false);
		await expect(
			InvokeCommand.run(
				[
					'consensus_getBFTParameters',
					'{"height": 2}',
					'-d  ~/.lisk/dpos-mainchain',
					'-f ./input.json',
				],
				config,
			),
		).rejects.toThrow('./input.json does not exist');
	});

	it('should call invoke with the provided action', async () => {
		await InvokeCommand.run(['consensus_getBFTParameters', '-d  ~/.lisk/dpos-mainchain'], config);

		expect(invokeMock).toBeCalledTimes(1);
		expect(invokeMock).toBeCalledWith('consensus_getBFTParameters');
	});

	it('should call invoke the provided action with parameters if provided', async () => {
		await InvokeCommand.run(
			['consensus_getBFTParameters', '{"height": 2}', '-d  ~/.lisk/dpos-mainchain'],
			config,
		);

		expect(invokeMock).toBeCalledTimes(1);
		expect(invokeMock).toBeCalledWith('consensus_getBFTParameters', JSON.parse('{"height": 2}'));
	});

	it('should call printJSON with the result of client.invoke', async () => {
		await InvokeCommand.run(
			['consensus_getBFTParameters', '{"height": 2}', '-d  ~/.lisk/dpos-mainchain'],
			config,
		);

		expect(BaseIPCClientCommand.prototype.printJSON).toBeCalledTimes(1);
		expect(BaseIPCClientCommand.prototype.printJSON).lastCalledWith(invokeMockResolvedValue);
	});
});
