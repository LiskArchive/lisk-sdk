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

import { homedir } from 'os';
import { removeSync, mkdirSync } from 'fs-extra';
import { resolve as pathResolve } from 'path';
import { IPCChannel } from '../../../src/controller/channels';
import { IPCServer } from '../../../src/controller/ipc/ipc_server';
import { EndpointHandlers } from '../../../src/types';

// TODO: ZeroMQ tests are unstable with jest https://github.com/zeromq/zeromq.js/issues/416
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('IPCChannelWithoutBus', () => {
	// Arrange
	const logger: any = {
		info: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
	};
	const socketsDir = pathResolve(`${homedir()}/.lisk/integration/ipc_channel_without_bus/sockets`);

	const config: any = {
		socketsPath: socketsDir,
		genesisConfig: {
			chainID: '10000000',
		},
	};

	const alpha = {
		namespace: 'alphaName',
		logger,
		events: ['alpha1', 'alpha2'],
		endpoints: {
			multiplyByTwo: (params: any) => params.val * 2,
			multiplyByThree: (params: any) => params.val * 3,
		} as unknown as EndpointHandlers,
	};

	const beta = {
		namespace: 'betaName',
		logger,
		events: ['beta1', 'beta2'],
		endpoints: {
			divideByTwo: (params: any) => params.val / 2,
			divideByThree: (params: any) => params.val / 3,
			withError: (params: any) => {
				if (params.val === 1) {
					throw new Error('Invalid request');
				}
				return 0;
			},
		} as unknown as EndpointHandlers,
	};

	describe('Communication without registering to bus', () => {
		let alphaChannel: IPCChannel;
		let betaChannel: IPCChannel;
		let server: IPCServer;

		beforeAll(async () => {
			mkdirSync(socketsDir, { recursive: true });

			// Arrange
			server = new IPCServer({
				socketsDir,
				name: 'bus',
			});

			const listenForRPC = async () => {
				for await (const [_action] of server.rpcServer) {
					await server.rpcServer.send('myData');
				}
			};

			await server.start();

			const listenForEvents = async () => {
				for await (const [eventName, eventValue] of server.subSocket) {
					await server.pubSocket.send([eventName, eventValue]);
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			Promise.all<void>([listenForRPC(), listenForEvents()]).catch(_ => ({}));

			alphaChannel = new IPCChannel(
				alpha.logger,
				alpha.namespace,
				alpha.events,
				alpha.endpoints,
				config,
				config.genesisConfig.chainID,
			);

			betaChannel = new IPCChannel(
				beta.logger,
				beta.namespace,
				beta.events,
				beta.endpoints,
				config,
				config.genesisConfig.chainID,
			);

			await alphaChannel.startAndListen();
			await betaChannel.startAndListen();
		});

		afterAll(() => {
			server.stop();
			alphaChannel.cleanup();
			betaChannel.cleanup();

			removeSync(socketsDir);
		});

		describe('#subscribe', () => {
			it('should be able to subscribe to an event.', async () => {
				// Arrange
				const betaEventData = { data: '#DATA' };
				const eventName = beta.events[0];

				const donePromise = new Promise<void>(resolve => {
					// Act
					alphaChannel.subscribe(`${beta.namespace}_${eventName}`, data => {
						// Assert
						expect(data).toEqual(betaEventData);
						resolve();
					});
				});

				betaChannel.publish(`${beta.namespace}_${eventName}`, betaEventData);

				return donePromise;
			});

			it('should be able to subscribe to an event once.', async () => {
				// Arrange
				const betaEventData = { data: '#DATA' };
				const eventName = beta.events[0];
				const donePromise = new Promise<void>(resolve => {
					// Act
					alphaChannel.once(`${beta.namespace}_${eventName}`, data => {
						// Assert
						expect(data).toEqual(betaEventData);
						resolve();
					});
				});

				betaChannel.publish(`${beta.namespace}_${eventName}`, betaEventData);

				return donePromise;
			});
		});

		describe('#publish', () => {
			it('should be able to publish an event.', async () => {
				// Arrange
				const alphaEventData = { data: '#DATA' };
				const eventName = alpha.events[0];

				const donePromise = new Promise<void>(done => {
					// Act
					betaChannel.once(`${alpha.namespace}_${eventName}`, data => {
						// Assert
						expect(data).toEqual(alphaEventData);
						done();
					});
				});

				alphaChannel.publish(`${alpha.namespace}_${eventName}`, alphaEventData);

				return donePromise;
			});
		});
	});
});
