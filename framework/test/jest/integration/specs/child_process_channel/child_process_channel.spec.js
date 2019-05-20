/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const child_process = require('child_process');
const ChildProcessChannel = require('../../../../../src/controller/channels/child_process_channel');
// const InMemoryChannel = require('../../../../../src/controller/channels/in_memory_channel');
const Bus = require('../../../../../src/controller/bus');
const Event = require('../../../../../src/controller/event');
const { betaChannelConfig, socketsPath } = require('./child_process_helper');

jest.unmock('pm2-axon');

const alpha = {
	moduleAlias: 'alphaAlias',
	events: ['alpha1', 'alpha2'],
	actions: {
		multiplyByTwo: {
			handler: async action => action.params * 2,
			isPublic: true,
		},
		multiplyByThree: {
			handler: async action => action.params * 3,
			isPublic: true,
		},
	},
};

describe('ChildProcessChannel', () => {
	describe('after registering itself to the bus', () => {
		let childProcessChannelAlpha;
		let channelBetaProcess;
		let bus;

		beforeEach(async () => {
			// Arrange

			// 1. Create bus
			bus = new Bus(
				{
					wildcard: true,
					delimiter: ':',
					maxListeners: 1000,
				},
				console,
				{ socketsPath, ipc: { enabled: true } }
			);

			await bus.setup();

			// Register Alpha Channel to the Bus
			childProcessChannelAlpha = new ChildProcessChannel(
				alpha.moduleAlias,
				alpha.events,
				alpha.actions
			);

			await childProcessChannelAlpha.registerToBus(bus);

			// 2. Fork Child Process
			channelBetaProcess = child_process.fork(
				`${__dirname}/beta_channel_child_process.js`,
				[],
				{
					silent: true,
				}
			);

			return new Promise((resolve, reject) => {
				channelBetaProcess.once('message', m => {
					console.log('beforeEachChild', m);
					if (m.child === 'ready') {
						resolve();
					}
				});
				// fail after 1 seconds,
				// if we don't hear from the child process
				setTimeout(() => reject(Error('timeout')), 1000);
			});
		});

		afterEach(async () => {
			channelBetaProcess.kill();
			// await childProcessChannelAlpha.cleanup();
			await bus.cleanup();
		});

		describe('#subscribe', () => {
			it('should be able to subscribe to an event.', done => {
				// Arrange
				const eventName = `${betaChannelConfig.moduleAlias}:${'beta1'}`;
				const betaEventData = '#DATA';

				// Act
				childProcessChannelAlpha.subscribe(eventName, data => {
					// Assert
					console.log('subscribeData', data);
					expect(Event.deserialize(data).data).toBe(betaEventData);
					done();
				});

				setTimeout(() => {
					channelBetaProcess.send({
						method: 'publish',
						eventName,
						eventData: betaEventData,
					});
				}, 1000);

				channelBetaProcess.on('message', m => {
					console.log('mmm', m);
				});
			});
		});
	});
});
