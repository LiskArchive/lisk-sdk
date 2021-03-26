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
import { mkdirSync, rmdirSync } from 'fs';
import { resolve as pathResolve } from 'path';
import { IPCChannel } from '../../../src/controller/channels';
import { IPCServer } from '../../../src/controller/ipc/ipc_server';

describe('IPCChannel', () => {
	// Arrange
	const socketsDir = pathResolve(`${homedir()}/.lisk/functional/ipc_channel_without_bus/sockets`);

	const config: any = {
		socketsPath: {
			root: socketsDir,
		},
	};

	const alpha = {
		moduleAlias: 'alphaAlias',
		events: ['alpha1', 'alpha2'],
		actions: {
			multiplyByTwo: {
				handler: (params: any) => params.val * 2,
			},
			multiplyByThree: {
				handler: (params: any) => params.val * 3,
			},
		},
	};

	const beta = {
		moduleAlias: 'betaAlias',
		events: ['beta1', 'beta2'],
		actions: {
			divideByTwo: {
				handler: (params: any) => params.val / 2,
			},
			divideByThree: {
				handler: (params: any) => params.val / 3,
			},
		},
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
			server.rpcServer.expose('myAction', cb => {
				cb(null, 'myData');
			});

			await server.start();

			server.subSocket.on('message', (eventName: string, eventValue: object) => {
				server.pubSocket.send(eventName, eventValue);
			});

			alphaChannel = new IPCChannel(alpha.moduleAlias, alpha.events, alpha.actions, config);

			betaChannel = new IPCChannel(beta.moduleAlias, beta.events, beta.actions, config);

			await alphaChannel.startAndListen();
			await betaChannel.startAndListen();
		});

		afterAll(async () => {
			server.stop();
			alphaChannel.cleanup();
			betaChannel.cleanup();

			rmdirSync(socketsDir);
		});

		describe('#subscribe', () => {
			it('should be able to subscribe to an event.', async () => {
				// Arrange
				const betaEventData = { data: '#DATA' };
				const eventName = beta.events[0];

				const donePromise = new Promise<void>(resolve => {
					// Act
					alphaChannel.subscribe(`${beta.moduleAlias}:${eventName}`, data => {
						// Assert
						expect(data).toEqual(betaEventData);
						resolve();
					});
				});

				betaChannel.publish(`${beta.moduleAlias}:${eventName}`, betaEventData);

				return donePromise;
			});

			it('should be able to subscribe to an event once.', async () => {
				// Arrange
				const betaEventData = { data: '#DATA' };
				const eventName = beta.events[0];
				const donePromise = new Promise<void>(resolve => {
					// Act
					alphaChannel.once(`${beta.moduleAlias}:${eventName}`, data => {
						// Assert
						expect(data).toEqual(betaEventData);
						resolve();
					});
				});

				betaChannel.publish(`${beta.moduleAlias}:${eventName}`, betaEventData);

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
					betaChannel.once(`${alpha.moduleAlias}:${eventName}`, data => {
						// Assert
						expect(data).toEqual(alphaEventData);
						done();
					});
				});

				alphaChannel.publish(`${alpha.moduleAlias}:${eventName}`, alphaEventData);

				return donePromise;
			});
		});
	});
});
