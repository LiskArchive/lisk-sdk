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

import { createWSClient } from '@liskhq/lisk-api-client';
import { Application } from '../../../../src';
import { closeApplication, createApplicationWithHelloPlugin } from '../../utils/application';

describe('plugin in child process', () => {
	let appWithPlugin: Application;
	let clientForPlugin: any;
	let helloMessage: any;

	beforeAll(async () => {
		// Load plugin in child process
		appWithPlugin = await createApplicationWithHelloPlugin({
			label: 'client-plugin-child-process',
			pluginChildProcess: true,
		});
		clientForPlugin = await createWSClient('ws://localhost:8080/ws');
		clientForPlugin.subscribe('hello:greet', (message: any) => {
			helloMessage = message;
		});
	});

	afterAll(async () => {
		await clientForPlugin.disconnect();
		await closeApplication(appWithPlugin);
	});

	it('should be able to get data from plugin action `hello:callGreet`', async () => {
		// Act
		const data = await clientForPlugin.invoke('hello:callGreet');
		// Assert
		expect(data).toEqual({
			greet: 'hi, how are you?',
		});
	});

	it('should be able to get data from plugin `hello:greet` event', async () => {
		// Act
		const data = await clientForPlugin.invoke('hello:publishGreetEvent');
		// Assert
		expect(data).toEqual('invoked');
		expect(helloMessage.data).toEqual({ message: 'hello event' });
		expect(helloMessage.module).toEqual('hello');
		expect(helloMessage.name).toEqual('greet');
	});
});
