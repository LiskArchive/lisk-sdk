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
import * as Config from '@oclif/config';
import * as liskClient from '@liskhq/lisk-client';
import { ConsoleCommand } from '../../../src/bootstrapping/commands/console';
import { getConfig } from '../../helpers/config';

jest.mock('@liskhq/lisk-client');
jest.mock('repl');

describe('hash-onion command', () => {
	let config: Config.IConfig;
	let stdout: string[];

	beforeEach(async () => {
		stdout = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest
			.spyOn(repl, 'start')
			.mockReturnValue(({ context: {}, on: jest.fn() } as unknown) as repl.REPLServer);
	});

	describe('console', () => {
		it('should create repl server', async () => {
			await ConsoleCommand.run([], config);
			expect(repl.start).toHaveBeenCalledWith({ prompt: `${config.pjson.name} > ` });
			expect(liskClient.apiClient.createWSClient).toHaveBeenCalledTimes(0);
			expect(liskClient.apiClient.createIPCClient).toHaveBeenCalledTimes(0);
		});
	});

	describe('console --api-ws=ws://localhost:8080/ws', () => {
		it('should create repl server with ws client', async () => {
			await ConsoleCommand.run(['--api-ws=ws://localhost:8080/ws'], config);
			expect(liskClient.apiClient.createWSClient).toHaveBeenCalledWith('ws://localhost:8080/ws');
			expect(liskClient.apiClient.createIPCClient).toHaveBeenCalledTimes(0);
		});
	});

	describe('console --api-ipc=~/.lisk/lisk-core', () => {
		it('should create repl server with ipc client', async () => {
			await ConsoleCommand.run(['--api-ipc=~/.lisk/lisk-core'], config);
			expect(liskClient.apiClient.createIPCClient).toHaveBeenCalledWith('~/.lisk/lisk-core');
			expect(liskClient.apiClient.createWSClient).toHaveBeenCalledTimes(0);
		});
	});
});
