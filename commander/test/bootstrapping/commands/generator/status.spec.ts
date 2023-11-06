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

import { BaseIPCClientCommand } from '../../../../src/bootstrapping/commands/base_ipc_client';
import * as appUtils from '../../../../src/utils/application';
import { StatusCommand } from '../../../../src/bootstrapping/commands/generator/status';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

describe('forging:status command', () => {
	const forgingInfoMock = {
		status: [
			{
				address: 'fake-address',
				enabled: true,
				height: 655,
				maxHeightPrevoted: 65,
				maxHeightGenerated: 456,
			},
		],
	};
	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;
	let invokeMock: jest.Mock;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		invokeMock = jest.fn().mockResolvedValue(forgingInfoMock);
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			invoke: invokeMock,
		} as never);
		jest.spyOn(BaseIPCClientCommand.prototype, 'printJSON');
	});

	describe('forging:status', () => {
		it('should throw an error when no arguments are provided.', async () => {
			await StatusCommand.run([], config);
			expect(invokeMock).toHaveBeenCalledTimes(1);
			expect(invokeMock).toHaveBeenCalledWith('generator_getStatus');
			expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledTimes(1);
			expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledWith({
				info: forgingInfoMock,
			});
		});
	});
});
