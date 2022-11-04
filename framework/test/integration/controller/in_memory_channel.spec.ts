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
import { resolve as pathResolve } from 'path';
import { InMemoryDatabase } from '@liskhq/lisk-db';
import { InMemoryChannel } from '../../../src/controller/channels';
import { Bus } from '../../../src/controller/bus';

describe('InMemoryChannel', () => {
	const logger: any = {
		info: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
	};

	const socketsDir = pathResolve(`${homedir()}/.lisk/integration/in_memory/sockets`);

	const config: any = {
		rpc: {
			modes: [],
			ipc: {
				path: socketsDir,
			},
		},
		genesis: {
			chainID: '10000000',
		},
	};

	const alpha = {
		moduleName: 'alphaName',
		events: ['alpha1', 'alpha2'],
		endpoints: {
			// eslint-disable-next-line @typescript-eslint/require-await
			multiplyByTwo: async (ctx: any): Promise<unknown> => ctx.params.val * 2,
			// eslint-disable-next-line @typescript-eslint/require-await
			multiplyByThree: async (ctx: any): Promise<unknown> => ctx.params.val * 3,
		},
	};

	const beta = {
		moduleName: 'betaName',
		events: ['beta1', 'beta2'],
		endpoints: {
			// eslint-disable-next-line @typescript-eslint/require-await
			divideByTwo: async (ctx: any): Promise<unknown> => ctx.params.val / 2,
			// eslint-disable-next-line @typescript-eslint/require-await
			divideByThree: async (ctx: any): Promise<unknown> => ctx.params.val / 3,
		},
	};

	describe('after registering itself to the bus', () => {
		let inMemoryChannelAlpha: InMemoryChannel;
		let inMemoryChannelBeta: InMemoryChannel;
		let bus: Bus;

		beforeEach(async () => {
			// Arrange
			bus = new Bus(config);

			inMemoryChannelAlpha = new InMemoryChannel(
				logger,
				new InMemoryDatabase() as any,
				new InMemoryDatabase() as any,
				alpha.moduleName,
				alpha.events,
				alpha.endpoints,
				config.genesis.chainID,
			);

			await inMemoryChannelAlpha.registerToBus(bus);

			inMemoryChannelBeta = new InMemoryChannel(
				logger,
				new InMemoryDatabase() as any,
				new InMemoryDatabase() as any,
				beta.moduleName,
				beta.events,
				beta.endpoints,
				config.genesis.chainID,
			);
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			await inMemoryChannelBeta.registerToBus(bus);
			await bus.start(logger);
		});

		describe('#subscribe', () => {
			it('should be able to subscribe to an event.', async () => {
				// Arrange
				const betaEventData = { data: '#DATA' };
				const eventName = beta.events[0];

				const donePromise = new Promise<void>(resolve => {
					// Act
					inMemoryChannelAlpha.subscribe(`${beta.moduleName}_${eventName}`, data => {
						// Assert
						expect(data).toBe(betaEventData);
						resolve();
					});
				});

				inMemoryChannelBeta.publish(`${beta.moduleName}_${eventName}`, betaEventData);

				return donePromise;
			});

			it('should be able to subscribe to an event once.', async () => {
				// Arrange
				const betaEventData = { data: '#DATA' };
				const eventName = beta.events[0];
				const donePromise = new Promise<void>(resolve => {
					// Act
					inMemoryChannelAlpha.once(`${beta.moduleName}_${eventName}`, data => {
						// Assert
						expect(data).toBe(betaEventData);
						resolve();
					});
				});

				inMemoryChannelBeta.publish(`${beta.moduleName}_${eventName}`, betaEventData);

				return donePromise;
			});

			it('should be able to subscribe to an unregistered event.', async () => {
				// Arrange
				const omegaEventName = 'omegaEventName';
				const omegaName = 'omegaName';
				const dummyData = { data: '#DATA' };
				const inMemoryChannelOmega = new InMemoryChannel(
					logger,
					new InMemoryDatabase() as any,
					new InMemoryDatabase() as any,
					omegaName,
					[omegaEventName],
					{},
					config.genesis.chainID,
				);

				const donePromise = new Promise<void>(resolve => {
					// Act
					inMemoryChannelAlpha.subscribe(`${omegaName}_${omegaEventName}`, data => {
						// Assert
						expect(data).toBe(dummyData);
						resolve();
					});
				});

				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				await inMemoryChannelOmega.registerToBus(bus);

				inMemoryChannelOmega.publish(`${omegaName}_${omegaEventName}`, dummyData);

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
					inMemoryChannelBeta.once(`${alpha.moduleName}_${eventName}`, data => {
						// Assert
						expect(data).toBe(alphaEventData);
						done();
					});
				});

				inMemoryChannelAlpha.publish(`${alpha.moduleName}_${eventName}`, alphaEventData);

				return donePromise;
			});
		});

		describe('#invoke', () => {
			it('should be able to invoke its own endpoints.', async () => {
				// Act && Assert
				await expect(
					inMemoryChannelAlpha.invoke<number>({
						context: {},
						methodName: `${alpha.moduleName}_multiplyByTwo`,
						params: { val: 2 },
					}),
				).resolves.toBe(4);

				await expect(
					inMemoryChannelAlpha.invoke<number>({
						context: {},
						methodName: `${alpha.moduleName}_multiplyByThree`,
						params: {
							val: 4,
						},
					}),
				).resolves.toBe(12);
			});

			it("should be able to invoke other channels' endpoints.", async () => {
				// Act && Assert
				await expect(
					inMemoryChannelAlpha.invoke<number>({
						context: {},
						methodName: `${beta.moduleName}_divideByTwo`,
						params: { val: 4 },
					}),
				).resolves.toBe(2);

				await expect(
					inMemoryChannelAlpha.invoke<number>({
						context: {},
						methodName: `${beta.moduleName}_divideByThree`,
						params: { val: 9 },
					}),
				).resolves.toBe(3);
			});

			it('should throw error when trying to invoke an invalid endpoint.', async () => {
				// Arrange
				const invalidEndpointName = 'getSomething';

				// Act && Assert
				await expect(
					inMemoryChannelAlpha.invoke({
						methodName: `${beta.moduleName}_${invalidEndpointName}`,
						context: {},
					}),
				).rejects.toThrow(
					`Request '${beta.moduleName}_${invalidEndpointName}' is not registered to bus.`,
				);
			});
		});
	});
});
