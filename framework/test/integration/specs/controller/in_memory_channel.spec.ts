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

import { resolve as pathResolve } from 'path';
import { homedir } from 'os';
import { InMemoryChannel } from '../../../../src/controller/channels';
import { Bus } from '../../../../src/controller/bus';
import { Event } from '../../../../src/controller/event';

const socketsDir = pathResolve(`${homedir()}/.lisk/devnet/tmp/sockets`);

const logger: any = {
	info: jest.fn(),
};

const config: any = {
	ipc: {
		enabled: false,
	},
	socketsPath: {
		root: socketsDir,
	},
};

const alpha = {
	moduleAlias: 'alphaAlias',
	events: ['alpha1', 'alpha2'],
	actions: {
		multiplyByTwo: {
			handler: (action: any) => action.params.val * 2,
			isPublic: true,
		},
		multiplyByThree: {
			handler: (action: any) => action.params.val * 3,
			isPublic: true,
		},
	},
};

const beta = {
	moduleAlias: 'betaAlias',
	events: ['beta1', 'beta2'],
	actions: {
		divideByTwo: {
			handler: (action: any) => action.params.val / 2,
			isPublic: true,
		},
		divideByThree: {
			handler: (action: any) => action.params.val / 3,
			isPublic: true,
		},
	},
};

describe('InMemoryChannel', () => {
	describe('after registering itself to the bus', () => {
		let inMemoryChannelAlpha: InMemoryChannel;
		let inMemoryChannelBeta: InMemoryChannel;
		let bus: Bus;

		beforeEach(async () => {
			// Arrange
			bus = new Bus(logger, config);

			inMemoryChannelAlpha = new InMemoryChannel(alpha.moduleAlias, alpha.events, alpha.actions);
			await inMemoryChannelAlpha.registerToBus(bus);

			inMemoryChannelBeta = new InMemoryChannel(beta.moduleAlias, beta.events, beta.actions);
			await inMemoryChannelBeta.registerToBus(bus);
		});

		describe('#subscribe', () => {
			it('should be able to subscribe to an event.', async () => {
				// Arrange
				const betaEventData = { data: '#DATA' };
				const eventName = beta.events[0];

				const donePromise = new Promise(resolve => {
					// Act
					inMemoryChannelAlpha.subscribe(`${beta.moduleAlias}:${eventName}`, data => {
						// Assert
						expect(Event.deserialize(data).data).toBe(betaEventData);
						resolve();
					});
				});

				inMemoryChannelBeta.publish(`${beta.moduleAlias}:${eventName}`, betaEventData);

				return donePromise;
			});

			it('should be able to subscribe to an event once.', async () => {
				// Arrange
				const betaEventData = { data: '#DATA' };
				const eventName = beta.events[0];
				const donePromise = new Promise(resolve => {
					// Act
					inMemoryChannelAlpha.once(`${beta.moduleAlias}:${eventName}`, data => {
						// Assert
						expect(Event.deserialize(data).data).toBe(betaEventData);
						resolve();
					});
				});

				inMemoryChannelBeta.publish(`${beta.moduleAlias}:${eventName}`, betaEventData);

				return donePromise;
			});

			it('should be able to subscribe to an unregistered event.', async () => {
				// Arrange
				const omegaEventName = 'omegaEventName';
				const omegaAlias = 'omegaAlias';
				const dummyData = { data: '#DATA' };
				const inMemoryChannelOmega = new InMemoryChannel(omegaAlias, [omegaEventName], {});

				const donePromise = new Promise(resolve => {
					// Act
					inMemoryChannelAlpha.subscribe(`${omegaAlias}:${omegaEventName}`, data => {
						// Assert
						expect(Event.deserialize(data).data).toBe(dummyData);
						resolve();
					});
				});

				await inMemoryChannelOmega.registerToBus(bus);

				inMemoryChannelOmega.publish(`${omegaAlias}:${omegaEventName}`, dummyData);

				return donePromise;
			});
		});

		describe('#publish', () => {
			it('should be able to publish an event.', async () => {
				// Arrange
				const alphaEventData = { data: '#DATA' };
				const eventName = alpha.events[0];

				const donePromise = new Promise(done => {
					// Act
					inMemoryChannelBeta.once(`${alpha.moduleAlias}:${eventName}`, data => {
						// Assert
						expect(Event.deserialize(data).data).toBe(alphaEventData);
						done();
					});
				});

				inMemoryChannelAlpha.publish(`${alpha.moduleAlias}:${eventName}`, alphaEventData);

				return donePromise;
			});
		});

		describe('#invoke', () => {
			it('should be able to invoke its own actions.', async () => {
				// Act && Assert
				await expect(
					inMemoryChannelAlpha.invoke<number>(`${alpha.moduleAlias}:multiplyByTwo`, { val: 2 }),
				).resolves.toBe(4);

				await expect(
					inMemoryChannelAlpha.invoke<number>(`${alpha.moduleAlias}:multiplyByThree`, {
						val: 4,
					}),
				).resolves.toBe(12);
			});

			it("should be able to invoke other channels' actions.", async () => {
				// Act && Assert
				await expect(
					inMemoryChannelAlpha.invoke<number>(`${beta.moduleAlias}:divideByTwo`, { val: 4 }),
				).resolves.toBe(2);

				await expect(
					inMemoryChannelAlpha.invoke<number>(`${beta.moduleAlias}:divideByThree`, { val: 9 }),
				).resolves.toBe(3);
			});

			it('should throw error when trying to invoke an invalid action.', async () => {
				// Arrange
				const invalidActionName = 'INVALID_ACTION_NAME';

				// Act && Assert
				await expect(
					inMemoryChannelAlpha.invoke(`${beta.moduleAlias}:${invalidActionName}`),
				).rejects.toThrow(
					`Action name "${beta.moduleAlias}:${invalidActionName}" must be a valid name with module name.`,
				);
			});
		});
	});
});
