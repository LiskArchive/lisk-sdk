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
import Command, { flags as flagParser } from '@oclif/command';
import * as liskClient from '@liskhq/lisk-client';

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
		const { flags } = this.parse(ConsoleCommand);

		this.log('Entering Lisk REPL: type `Ctrl+C` or `.exit` to exit');

		const replServer = repl.start('lisk > ');
		for (const element in liskClient) {
			// @ts-ignore
			replServer.context[element] = liskClient[element];
		}

		if (flags['api-ipc']) {
			const ipcClient = await liskClient.apiClient.createIPCClient(flags['api-ipc']);
			replServer.context.client = ipcClient;
		}

		if (flags['api-ws']) {
			const wsClient = await liskClient.apiClient.createWSClient(flags['api-ws']);
			replServer.context.client = wsClient;
		}

		replServer.on('exit', () => {
			this.log('Received "exit" event from lisk!');
			process.exit();
		});
	}
}
