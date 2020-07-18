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
import axios from 'axios';

import { Application } from 'lisk-framework';

import { closeApplication, createApplication, waitNBlocks } from '../utils/application';
import { ForgerPlugin } from '../../src';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

mockedAxios.post.mockResolvedValue({
	data: { success: true },
	status: 200,
	statusText: 'OK',
	headers: { 'content-type': 'application/json; charset=utf-8' },
} as any);

describe('Forger Plugin webhooks', () => {
	let app: Application;
	//	let accountNonce = 0;

	beforeAll(async () => {
		app = await createApplication('event_track_webhook', {
			clearDB: true,
			consoleLogLevel: 'error',
			appConfig: {
				plugins: {
					forger: {
						webhook: [
							{
								url: 'http://fake.host',
								events: [
									'forger:node:start',
									'forger:node:stop',
									'forger:block:created',
									'forger:block:missed',
								],
							},
						],
					},
				},
			},
		});
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('App start', () => {
		it('should call webhook forger:node:start', () => {
			// Arrange
			const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
			forgerPluginInstance._webhooks.headers['User-Agent'] = 'LISK/TEST/UA';
			const expectedCallArgs = [
				'http://fake.host',
				{
					event: 'forger:node:start',
					payload: { reason: 'Node started' },
				},
				{ headers: { 'User-Agent': 'LISK/TEST/UA' } },
			];

			const [appStartEventArgs] = mockedAxios.post.mock.calls;

			// Assert
			expect(appStartEventArgs).toMatchObject(expectedCallArgs);
		});
	});

	describe('New Block', () => {
		it('should call webhook forger:block:created', async () => {
			// Arrange
			const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
			forgerPluginInstance._webhooks.headers['User-Agent'] = 'LISK/TEST/UA';
			const expectedCallArgs = [
				'http://fake.host',
				{
					event: 'forger:block:created',
					payload: {
						reward: '0',
						forgerAddress: 'DSw3fpNraMcAZmE7EMD9rVN/kNo=',
						height: 2,
					},
				},
				{ headers: { 'User-Agent': 'LISK/TEST/UA' } },
			];
			await waitNBlocks(app, 1);

			const [, , , forgerBlockCreatedArgs] = mockedAxios.post.mock.calls;

			// Assert
			expect(forgerBlockCreatedArgs).toMatchObject(expectedCallArgs);
		});
	});

	describe('Missed Block', () => {
		it('should call webhook forger:block:missed', () => {
			// Arrange
			const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
			forgerPluginInstance._webhooks.headers['User-Agent'] = 'LISK/TEST/UA';
			const expectedCallArgs = [
				'http://fake.host',
				{
					event: 'forger:block:missed',
					payload: {
						missedBlocksByAddress: {
							'CtpqL2yPiRdpNm/Jqm/Z8frLNs8=': 1,
							'CQP0xctZmnkorvJ+MU6YKR0eOIg=': 1,
						},
						height: 1,
					},
				},
				{ headers: { 'User-Agent': 'LISK/TEST/UA' } },
			];

			const [, , forgerBlockMissedArgs] = mockedAxios.post.mock.calls;
			// Assert
			expect(forgerBlockMissedArgs).toMatchObject(expectedCallArgs);
		});
	});
});
