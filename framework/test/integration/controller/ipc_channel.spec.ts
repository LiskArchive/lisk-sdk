/*
 * Copyright © 2019 Lisk Foundation
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
import { IPCChannel, InMemoryChannel } from '../../../src/controller/channels';
import { Bus } from '../../../src/controller/bus';
import { IPCServer } from '../../../src/controller/ipc/ipc_server';
import { EndpointHandlers } from '../../../src';

// TODO: ZeroMQ tests are unstable with jest https://github.com/zeromq/zeromq.js/issues/416
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('IPCChannel', () => {
	// Arrange
	const logger: any = {
		info: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
	};

	const socketsDir = pathResolve(`${homedir()}/.lisk/integration/ipc_channel/sockets`);

	const config: any = {
		socketsPath: socketsDir,
		rpc: {
			modes: [''],
			ipc: {
				path: socketsDir,
			},
		},
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
		events: ['beta1', 'beta2', 'beta3'],
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

	describe('after registering itself to the bus', () => {
		let alphaChannel: IPCChannel;
		let betaChannel: IPCChannel;
		let bus: Bus;

		beforeAll(async () => {
			mkdirSync(socketsDir, { recursive: true });

			const internalIPCServer = new IPCServer({
				socketsDir,
				name: 'bus',
				externalSocket: false,
			});

			config['internalIPCServer'] = internalIPCServer;
			// Arrange
			bus = new Bus(config);

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

			await bus.start(logger);
			await alphaChannel.registerToBus();
			await betaChannel.registerToBus();
		});

		afterAll(async () => {
			alphaChannel.cleanup();
			betaChannel.cleanup();
			await bus.cleanup();

			removeSync(socketsDir);
		});

		describe('#subscribe', () => {
			it('should be able to subscribe to an event.', async () => {
				// Arrange
				const betaEventData = { data: '#DATA' };
				const eventName = beta.events[0];
				let message = '';
				// Act
				const listen = async () => {
					return new Promise<void>(resolve => {
						alphaChannel.subscribe(`${beta.namespace}_${eventName}`, data => {
							message = data;
							resolve();
						});

						betaChannel.publish(`${beta.namespace}_${eventName}`, betaEventData);
					});
				};

				await listen();
				// Assert
				expect(message).toEqual(betaEventData);
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

			it('should be able to subscribe to an unregistered event.', async () => {
				// Arrange
				const omegaEventName = 'omegaEventName';
				const omegaName = 'omegaName';
				const dummyData = { data: '#DATA' };
				const inMemoryChannelOmega = new InMemoryChannel(
					logger,
					{} as any,
					{} as any,
					omegaName,
					[omegaEventName],
					{},
					config.genesisConfig.chainID,
				);

				const donePromise = new Promise<void>(resolve => {
					// Act
					alphaChannel.subscribe(`${omegaName}_${omegaEventName}`, data => {
						// Assert
						expect(data).toEqual(dummyData);
						resolve();
					});
				});

				await inMemoryChannelOmega.registerToBus(bus);

				inMemoryChannelOmega.publish(`${omegaName}_${omegaEventName}`, dummyData);

				return donePromise;
			});
		});

		describe('#unsubscribe', () => {
			it('should be able to unsubscribe to an event.', async () => {
				// Arrange
				const betaEventData = { data: '#DATA' };
				const eventName = beta.events[2];
				let messageCount = 0;
				const wait = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
				// Act
				const listenPromise = new Promise<void>(resolve => {
					alphaChannel.subscribe(`${beta.namespace}_${eventName}`, _ => {
						messageCount += 1;
					});
					setTimeout(() => {
						expect(messageCount).toEqual(1);
						resolve();
					}, 200);
				});

				betaChannel.publish(`${beta.namespace}_${eventName}`, betaEventData);
				await wait(25);
				// Now unsubscribe from the event and publish it again
				alphaChannel.unsubscribe(`${beta.namespace}_${eventName}`, _ => {});
				await wait(25);
				betaChannel.publish(`${beta.namespace}_${eventName}`, betaEventData);

				// Assert
				return listenPromise;
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

		describe('#invoke', () => {
			it('should be able to invoke its own actions.', async () => {
				// Act && Assert
				await expect(
					alphaChannel.invoke<number>({
						context: {},
						methodName: `${alpha.namespace}_multiplyByTwo`,
						params: { val: 2 },
					}),
				).resolves.toBe(4);

				await expect(
					alphaChannel.invoke<number>({
						context: {},
						methodName: `${alpha.namespace}_multiplyByThree`,
						params: { val: 4 },
					}),
				).resolves.toBe(12);
			});

			it("should be able to invoke other channels' actions.", async () => {
				// Act && Assert
				await expect(
					alphaChannel.invoke<number>({
						context: {},
						methodName: `${beta.namespace}:divideByTwo`,
						params: { val: 4 },
					}),
				).resolves.toEqual(2);

				await expect(
					alphaChannel.invoke<number>({
						context: {},
						methodName: `${beta.namespace}:divideByThree`,
						params: { val: 9 },
					}),
				).resolves.toEqual(3);
			});

			it('should throw error when trying to invoke an invalid action.', async () => {
				// Arrange
				const invalidActionName = 'INVALID_ACTION_NAME';

				// Act && Assert
				await expect(
					alphaChannel.invoke({
						context: {},
						methodName: `${beta.namespace}_${invalidActionName}`,
						params: { val: 2 },
					}),
				).rejects.toThrow(
					`Action name "${beta.namespace}_${invalidActionName}" must be a valid name with module name and action name.`,
				);
			});

			// eslint-disable-next-line jest/no-disabled-tests
			it.skip('should be rejected with error', async () => {
				await expect(
					await alphaChannel.invoke({
						context: {},
						methodName: `${beta.namespace}:withError`,
						params: { val: 1 },
					}),
				).rejects.toThrow('Invalid Request');
			});
		});
	});
});
