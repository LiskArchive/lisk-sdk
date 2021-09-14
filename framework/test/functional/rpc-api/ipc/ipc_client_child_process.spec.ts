/*
 * Copyright © 2020 Lisk Foundation
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
 */

import { createIPCClient } from '@liskhq/lisk-api-client';
import { Application } from '../../../../src';
import { closeApplication, createApplicationWithHelloPlugin } from '../../utils/application';

// Skipped because from the test, currently child process cannot be initialized
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('plugin in child process', () => {
	const label = 'ipc-child-process';
	let app: Application;
	let client: any;
	let helloMessage: any;

	beforeAll(async () => {
		// Load plugin in child process
		app = await createApplicationWithHelloPlugin({
			label,
			pluginChildProcess: true,
			rpcConfig: { modes: ['ipc'] },
		});
		client = await createIPCClient(`${app.config.rootPath}/${label}/`);
		client.subscribe('hello_greet', (message: any) => {
			helloMessage = message;
		});
	});

	afterAll(async () => {
		await client.disconnect();
		await closeApplication(app);
	});

	it('should be able to get data from plugin action `hello_callGreet`', async () => {
		// Act
		const data = await client.invoke('hello_callGreet');
		// Assert
		expect(data).toEqual({
			greet: 'hi, how are you?',
		});
	});

	it('should throw an error when action fails due to missing argument', async () => {
		// Assert
		await expect(client.invoke('app_getBlocksFromId')).rejects.toThrow('Peer not found: undefined');
	});

	it('should throw an error on invalid action fails due to invalid argument', async () => {
		// Assert
		await expect(
			client.invoke('app_getAccount', { address: 'randomString*&&^%^' }),
		).rejects.toThrow('Specified key accounts:address: does not exist');
	});

	it('should be able to get data from plugin `hello_greet` event by calling action that returns undefined', async () => {
		// Act
		const data = await client.invoke('hello_publishGreetEvent');
		// Assert
		expect(data).toBeUndefined();
		expect(helloMessage.data).toEqual({ message: 'hello event' });
		expect(helloMessage.module).toEqual('hello');
		expect(helloMessage.name).toEqual('greet');
	});

	it('should return undefined when void action `hello_blankAction` is called', async () => {
		// Act
		const data = await client.invoke('hello_publishGreetEvent');

		// Assert
		expect(data).toBeUndefined();
	});

	it('should throw an error on invalid action `hello_greetings`', async () => {
		// Assert
		await expect(client.invoke('hello_greetings')).rejects.toThrow(
			"Action 'hello_greetings' is not registered to bus",
		);
	});
});
