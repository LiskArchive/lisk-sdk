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

'use strict';

const InMemoryChannel = require('../../../../../src/controller/channels/in_memory_channel');
const Bus = require('../../../../../src/controller/bus');
const Event = require('../../../../../src/controller/event');

const logger = {
	info: jest.fn(),
};

const config = {
	ipc: {
		enabled: false,
	},
};

const alpha = {
	moduleAlias: 'alphaAlias',
	events: ['alpha1', 'alpha2'].map(
		event => new Event(`${'alphaAlias'}:${event}`),
	),
	actions: {
		multiplyByTwo: {
			handler: action => action.params * 2,
			isPublic: true,
		},
		multiplyByThree: {
			handler: action => action.params * 3,
			isPublic: true,
		},
	},
};

const beta = {
	moduleAlias: 'betaAlias',
	events: ['beta1', 'beta2'].map(
		event => new Event(`${alpha.moduleAlias}:${event}`),
	),
	actions: {
		divideByTwo: {
			handler: action => action.params / 2,
			isPublic: true,
		},
		divideByThree: {
			handler: action => action.params / 3,
			isPublic: true,
		},
	},
};

describe('InMemoryChannel', () => {
	describe('after registering itself to the bus', () => {
		let inMemoryChannelAlpha;
		let inMemoryChannelBeta;
		let bus;

		beforeEach(async () => {
			// Arrange
			bus = new Bus(
				{
					wildcard: true,
					delimiter: ':',
					maxListeners: 1000,
				},
				logger,
				config,
			);

			inMemoryChannelAlpha = new InMemoryChannel(
				alpha.moduleAlias,
				alpha.events,
				alpha.actions,
			);
			await inMemoryChannelAlpha.registerToBus(bus);

			inMemoryChannelBeta = new InMemoryChannel(
				beta.moduleAlias,
				beta.events,
				beta.actions,
			);
			await inMemoryChannelBeta.registerToBus(bus);
		});

		describe('#subscribe', () => {
			it('should be able to subscribe to an event.', () => {
				// Arrange
				const betaEventData = '#DATA';
				const eventName = beta.events[0].key();

				const donePromise = new Promise(resolve => {
					// Act
					inMemoryChannelAlpha.subscribe(
						`${beta.moduleAlias}:${eventName}`,
						data => {
							// Assert
							expect(Event.deserialize(data).data).toBe(betaEventData);
							resolve();
						},
					);
				});

				inMemoryChannelBeta.publish(
					`${beta.moduleAlias}:${eventName}`,
					betaEventData,
				);

				return donePromise;
			});

			it('should be able to subscribe to an event once.', () => {
				// Arrange
				const betaEventData = '#DATA';
				const eventName = beta.events[0].key();

				const donePromise = new Promise(resolve => {
					// Act
					inMemoryChannelAlpha.once(
						`${beta.moduleAlias}:${eventName}`,
						data => {
							// Assert
							expect(Event.deserialize(data).data).toBe(betaEventData);
							resolve();
						},
					);
				});

				inMemoryChannelBeta.publish(
					`${beta.moduleAlias}:${eventName}`,
					betaEventData,
				);

				return donePromise;
			});

			it('should be able to subscribe to an unregistered event.', async () => {
				// Arrange
				const omegaEventName = 'omegaEventName';
				const omegaAlias = 'omegaAlias';
				const dummyData = '#DATA';
				const inMemoryChannelOmega = new InMemoryChannel(
					omegaAlias,
					[omegaEventName],
					{},
				);

				const donePromise = new Promise(resolve => {
					// Act
					inMemoryChannelAlpha.subscribe(
						`${omegaAlias}:${omegaEventName}`,
						data => {
							// Assert
							expect(Event.deserialize(data).data).toBe(dummyData);
							resolve();
						},
					);
				});

				await inMemoryChannelOmega.registerToBus(bus);

				inMemoryChannelOmega.publish(
					`${omegaAlias}:${omegaEventName}`,
					dummyData,
				);

				return donePromise;
			});
		});

		describe('#publish', () => {
			it('should be able to publish an event.', () => {
				// Arrange
				const alphaEventData = '#DATA';
				const eventName = alpha.events[0].key();

				const donePromise = new Promise(done => {
					// Act
					inMemoryChannelBeta.once(
						`${alpha.moduleAlias}:${eventName}`,
						data => {
							// Assert
							expect(Event.deserialize(data).data).toBe(alphaEventData);
							done();
						},
					);
				});

				inMemoryChannelAlpha.publish(
					`${alpha.moduleAlias}:${eventName}`,
					alphaEventData,
				);

				return donePromise;
			});
		});

		describe('#invoke', () => {
			it('should be able to invoke its own actions.', async () => {
				// Act && Assert
				await expect(
					inMemoryChannelAlpha.invoke(`${alpha.moduleAlias}:multiplyByTwo`, 2),
				).resolves.toBe(4);

				await expect(
					inMemoryChannelAlpha.invoke(
						`${alpha.moduleAlias}:multiplyByThree`,
						4,
					),
				).resolves.toBe(12);
			});

			it("should be able to invoke other channels' actions.", async () => {
				// Act && Assert
				await expect(
					inMemoryChannelAlpha.invoke(`${beta.moduleAlias}:divideByTwo`, 4),
				).resolves.toBe(2);

				await expect(
					inMemoryChannelAlpha.invoke(`${beta.moduleAlias}:divideByThree`, 9),
				).resolves.toBe(3);
			});

			it('should throw error when trying to invoke an invalid action.', async () => {
				// Arrange
				const invalidActionName = 'INVALID_ACTION_NAME';

				// Act && Assert
				await expect(
					inMemoryChannelAlpha.invoke(
						`${beta.moduleAlias}:${invalidActionName}`,
					),
				).rejects.toThrow(
					`Action name "${beta.moduleAlias}:${invalidActionName}" must be a valid name with module name.`,
				);
			});
		});
	});
});
