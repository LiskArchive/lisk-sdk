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
import { DB_KEY_ACCOUNTS_ADDRESS, concatDBKeys } from '@liskhq/lisk-chain';
import { createIPCClient } from '@liskhq/lisk-api-client';
import {
	closeApplication,
	waitNBlocks,
	createApplicationWithHelloPlugin,
} from '../../utils/application';
import { Application } from '../../../../src';
import { APP_EVENT_BLOCK_NEW } from '../../../../src/constants';

describe('method client ipc mode', () => {
	const label = 'client-ipc-in-memory';
	let app: Application;
	let client: any;
	let helloMessage: any;
	let newBlockEvent: any[];

	beforeAll(async () => {
		newBlockEvent = [];
		app = await createApplicationWithHelloPlugin({
			label,
			pluginChildProcess: false,
			rpcConfig: { modes: ['ipc'] },
		});

		const dataPath = `${app.config.rootPath}/${label}`;

		client = await createIPCClient(dataPath);

		client.subscribe(APP_EVENT_BLOCK_NEW, (blockEvent: any) => {
			newBlockEvent.push(blockEvent);
		});

		client.subscribe('hello_greet', (message: any) => {
			helloMessage = message;
		});
	});

	afterAll(async () => {
		await client.disconnect();
		await closeApplication(app);
	});

	describe('application actions', () => {
		it('should return getNetworkStats', async () => {
			// Arrange
			const defaultNetworkStats = {
				incoming: { count: 0, connects: 0, disconnects: 0 },
				outgoing: { count: 1, connects: 1, disconnects: 0 },
				banning: { bannedPeers: {}, count: 0 },
				totalErrors: 0,
				totalPeersDiscovered: 0,
				totalRemovedPeers: 0,
				totalMessagesReceived: { postNodeInfo: 1 },
				totalRequestsReceived: {},
			};
			// Act
			const netStats = await client.node.getNetworkStats();
			// Assert
			expect(Object.keys(netStats)).toContainValues(Object.keys(defaultNetworkStats));
		});

		it('should invoke getNodeInfo action', async () => {
			// Act
			const nodeInfo = await client.invoke('app_getNodeInfo');

			// Assert
			expect(nodeInfo.version).toEqual(app.config.version);
			expect(nodeInfo.networkVersion).toEqual(app.config.networkVersion);
		});

		it('should return block by height', async () => {
			// Arrange
			await waitNBlocks(app, 2);
			// Act
			const block = await client.block.getByHeight(1);
			// Assert
			expect(block.header.height).toBe(1);
		});

		it('should throw an error when action fails due to missing argument', async () => {
			// Assert
			await expect(client.invoke('app_getAccount')).rejects.toThrow(
				'The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received undefined',
			);
		});

		it('should throw an error on invalid action fails due to invalid argument', async () => {
			// Assert
			await expect(
				client.invoke('app_getAccount', { address: 'randomString*&&^%^' }),
			).rejects.toThrow(
				`Specified key ${concatDBKeys(DB_KEY_ACCOUNTS_ADDRESS, Buffer.alloc(0)).toString(
					'hex',
				)} does not exist`,
			);
		});

		it('should return a list of registered endpoints', async () => {
			const actions = await await client.invoke('app_getRegisteredEndpoints');
			expect(actions).toBeArray();
			expect(actions).toContain('app_getConnectedPeers');
			expect(actions).toContain('pos_getAllValidators');
			expect(actions).toContain('hello_callGreet');
		});
	});

	describe('application events', () => {
		it('should listen to new block events', async () => {
			// We need to wait for 1 extra block
			// 	as the event handler of subscribe need to finish before we go for expectations
			await waitNBlocks(app, 2);

			// Assert
			expect(newBlockEvent.length).toBeGreaterThan(0);
			expect(newBlockEvent[0]).toHaveProperty('block');
		});
		it('should return a list of registered events', async () => {
			const events = await await client.invoke('app_getRegisteredEvents');
			expect(events).toBeArray();
			expect(events).toContain('app_ready');
			expect(events).toContain('token_registeredToBus');
			expect(events).toContain('hello_greet');
		});
	});

	describe('module actions', () => {
		it('should return all the validators', async () => {
			// Act
			const validators = await client.invoke('pos_getAllValidators');
			// Assert
			expect(validators).toHaveLength(103);
		});

		it('should throw an error on invalid action', async () => {
			// Assert
			await expect(client.invoke('token_getAllValidators')).rejects.toThrow(
				"Action 'token_getAllValidators' is not registered to bus",
			);
		});
	});

	describe('plugin actions', () => {
		it('should be able to get data from plugin action', async () => {
			// Act
			const data = await client.invoke('hello_callGreet');

			// Assert
			expect(data).toEqual({
				greet: 'hi, how are you?',
			});
		});

		it('should be able to get data from plugin `hello_greet` event by calling action that returns undefined', async () => {
			// Act
			const data = await client.invoke('hello_publishGreetEvent');

			// Assert
			expect(data).toBeUndefined();
			expect(helloMessage).toEqual({ message: 'hello event' });
		});

		it('should return undefined when void action `hello_blankAction` is called', async () => {
			// Act
			const data = await client.invoke('hello_publishGreetEvent');

			// Assert
			expect(data).toBeUndefined();
		});

		it('should throw an error on invalid action `hello_randomEventName`', async () => {
			// Assert
			await expect(client.invoke('hello_randomEventName')).rejects.toThrow(
				"Action 'hello_randomEventName' is not registered to bus",
			);
		});
	});
});
