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

import * as repl from 'repl';
import * as apiClient from '@liskhq/lisk-api-client';
import { ConsoleCommand } from '../../../src/bootstrapping/commands/console';
import { getConfig } from '../../helpers/config';
import { Awaited } from '../../types';

jest.mock('repl');

describe('hash-onion command', () => {
	let config: Awaited<ReturnType<typeof getConfig>>;
	let stdout: string[];

	beforeEach(async () => {
		stdout = [];
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValueOnce({} as never);
		jest.spyOn(apiClient, 'createWSClient').mockResolvedValueOnce({} as never);
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest
			.spyOn(repl, 'start')
			.mockReturnValue({ context: {}, on: jest.fn() } as unknown as repl.REPLServer);
	});

	describe('console', () => {
		it('should create repl server', async () => {
			await ConsoleCommand.run([], config);
			expect(repl.start).toHaveBeenCalledWith({ prompt: `${config.pjson.name} > ` });
			expect(apiClient.createWSClient).toHaveBeenCalledTimes(0);
			expect(apiClient.createIPCClient).toHaveBeenCalledTimes(0);
		});
	});

	describe('console --api-ws=ws://localhost:8080/ws', () => {
		it('should create repl server with ws client', async () => {
			await ConsoleCommand.run(['--api-ws=ws://localhost:8080/ws'], config);
			expect(apiClient.createWSClient).toHaveBeenCalledWith('ws://localhost:8080/ws');
			expect(apiClient.createIPCClient).toHaveBeenCalledTimes(0);
		});
	});

	describe('console --api-ipc=~/.lisk/lisk-core', () => {
		it('should create repl server with ipc client', async () => {
			await ConsoleCommand.run(['--api-ipc=~/.lisk/lisk-core'], config);
			expect(apiClient.createIPCClient).toHaveBeenCalledWith('~/.lisk/lisk-core');
			expect(apiClient.createWSClient).toHaveBeenCalledTimes(0);
		});
	});
});
