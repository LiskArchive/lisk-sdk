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
import { Webhooks } from '../../src/webhooks';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Webhook', () => {
	let webHook: Webhooks;
	let defaultHeaders: any;

	beforeEach(() => {
		defaultHeaders = {
			'Content-Type': 'application/json',
			'User-Agent': 'LISK/Test',
		};
		webHook = new Webhooks(defaultHeaders, [
			{
				url: 'https://webhook.service.fake',
				events: [
					'forger:node:start',
					'forger:app:shutdown',
					'forger:block:created',
					'forger:block:missed',
				],
			},
		]);
	});

	afterEach(() => {
		mockedAxios.post.mockClear();
	});

	it('Should post event to webhook', async () => {
		mockedAxios.post.mockResolvedValue({
			data: { success: true },
			status: 200,
			statusText: 'OK',
			headers: { 'content-type': 'application/json; charset=utf-8' },
		} as any);

		const eventData = {
			event: 'forger:node:start',
			timestamp: Date.now(),
			payload: { reason: 'broken', address: '0x123131' },
		};
		const targetURL = 'https://webhook.service.fake';
		await webHook.execute(eventData, targetURL);
		const [requestArgs] = mockedAxios.post.mock.calls;

		expect(requestArgs).toEqual([targetURL, eventData, { headers: defaultHeaders }]);
	});

	it('Should not call execute if event is cconfigured', async () => {
		(webHook as any)['registeredEvents'] = [
			{
				url: 'https://webhook.service.fake',
				events: ['forger:block:created'],
			},
		];

		await webHook.handleEvent({
			event: 'forger:block:created',
			timestamp: Date.now(),
			payload: { reward: '0', forgerAddress: '0x13231', height: 1 },
		});

		const expectedCallArgs = [
			'https://webhook.service.fake',
			{
				event: 'forger:block:created',
				payload: { reward: '0', forgerAddress: '0x13231', height: 1 },
			},
			{
				headers: { 'Content-Type': 'application/json', 'User-Agent': 'LISK/Test' },
			},
		];

		const [httpCallArgs] = mockedAxios.post.mock.calls;

		expect(httpCallArgs).toMatchObject(expectedCallArgs);
	});

	it('Should not call execute if event is not cconfigured', async () => {
		(webHook as any)['registeredEvents'] = [
			{
				url: 'https://webhook.service.fake',
				events: ['forger:node:start', 'forger:app:shutdown', 'forger:block:missed'],
			},
		];

		await webHook.handleEvent({
			event: 'forger:block:created',
			timestamp: Date.now(),
			payload: { reward: '0', forgerAddress: '0x13231', height: 1 },
		});

		expect(mockedAxios.post.mock.calls).toHaveLength(0);
	});
});
