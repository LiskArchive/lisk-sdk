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

import { REPLServer, start } from 'repl';
import { Command, Flags as flagParser } from '@oclif/core';
import * as apiClient from '@liskhq/lisk-api-client';
import * as lisk from '@liskhq/lisk-client';

interface ConsoleFlags {
	readonly 'api-ipc'?: string;
	readonly 'api-ws'?: string;
}

export class ConsoleCommand extends Command {
	static description = 'Lisk interactive REPL session to run commands.';

	static examples = [
		'console',
		'console --api-ws=ws://localhost:8080',
		'console --api-ipc=/path/to/server',
	];

	static flags = {
		'api-ipc': flagParser.string({
			description: 'Enable api-client with IPC communication.',
			exclusive: ['api-ws'],
		}),
		'api-ws': flagParser.string({
			description: 'Enable api-client with Websocket communication.',
			exclusive: ['api-ipc'],
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(ConsoleCommand);

		this.log('Entering Lisk REPL: type `Ctrl+C` or `.exit` to exit');

		const options = { prompt: `${this.config.pjson.name} > ` };
		const replServer = start(options);
		await this.initREPLContext(replServer, flags);

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		replServer.on('reset', async () => {
			this.log('Initializing repl context after reset!');
			await this.initREPLContext(replServer, flags);
		});
		replServer.on('exit', () => {
			this.log('Received "exit" event from lisk!');
			process.exit();
		});
	}

	async initREPLContext(replServer: REPLServer, flags: ConsoleFlags): Promise<void> {
		Object.defineProperty(replServer.context, 'lisk', {
			enumerable: true,
			value: lisk,
		});
		if (flags['api-ipc']) {
			const ipcClient = await apiClient.createIPCClient(flags['api-ipc']);
			Object.defineProperty(replServer.context, 'client', {
				enumerable: true,
				value: ipcClient,
			});
		}

		if (flags['api-ws']) {
			const wsClient = await apiClient.createWSClient(flags['api-ws']);
			Object.defineProperty(replServer.context, 'client', {
				enumerable: true,
				value: wsClient,
			});
		}
	}
}
