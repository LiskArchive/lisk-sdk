/*
 * Copyright © 2022 Lisk Foundation
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

import { getConfig } from '../../../helpers/config';
import { BaseIPCClientCommand } from '../../../../src/bootstrapping/commands/base_ipc_client';
import * as appUtils from '../../../../src/utils/application';
import { MetadataCommand } from '../../../../src/bootstrapping/commands/node/metadata';
import { Awaited } from '../../../types';

describe('node:metadata command', () => {
	const queryResult = {
		modules: [
			{
				name: 'token',
				id: 2,
				assets: [],
				endpoints: [
					{
						name: 'getBalance',
						request: {
							$id: 'schemaId',
							type: 'object',
							properties: {
								data: {
									type: 'string',
								},
							},
						},
						response: {
							$id: 'schemaId',
							type: 'object',
							properties: {
								data: {
									type: 'string',
								},
							},
						},
					},
				],
				commands: [
					{
						id: 0,
						name: 'transfer',
						params: {
							$id: 'schemaId',
							type: 'object',
							properties: {
								data: {
									type: 'string',
								},
							},
						},
					},
				],
				events: [],
			},
		],
	};

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;
	let getMock: jest.Mock;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		jest.spyOn(BaseIPCClientCommand.prototype, 'printJSON').mockReturnValue(queryResult as never);
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		getMock = jest.fn().mockResolvedValue(queryResult);
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			invoke: getMock,
		} as never);
	});

	describe('node:metadata', () => {
		it('should get node metadata and display as an object', async () => {
			await MetadataCommand.run([], config);
			expect(getMock).toHaveBeenCalledTimes(1);
			expect(getMock).toHaveBeenCalledWith('node_getMetadata');
			expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledTimes(1);
			expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledWith(queryResult);
		});
	});
});
