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
import { Application } from 'lisk-framework';
import axios from 'axios';
import { when } from 'jest-when';
import { createApplication, closeApplication, getURL, callNetwork } from './utils/application';

const peers = [
	{
		ipAddress: '1.1.1.1',
		port: 1001,
		networkId: 'networkId',
		networVersion: '1.1',
		nonce: 'nonce1',
	},
	{
		ipAddress: '1.1.1.2',
		port: 1002,
		networkId: 'networkId',
		networVersion: '1.1',
		nonce: 'nonce2',
	},
	{
		ipAddress: '1.1.1.3',
		port: 1003,
		networkId: 'networkId',
		networVersion: '1.1',
		nonce: 'nonce3',
	},
];

describe('Peers endpoint', () => {
	let app: Application;

	beforeAll(async () => {
		app = await createApplication('peers');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('/api/peers', () => {
		it('should respond with all connected peers', async () => {
			// Arrange
			app['_channel'].invoke = jest.fn();
			// Mock channel invoke only when app:getConnectedPeers is called
			when(app['_channel'].invoke)
				.calledWith('app:getConnectedPeers')
				.mockResolvedValue(peers as never);

			// Act
			const { response, status } = await callNetwork(axios.get(getURL('/api/peers')));

			// Assert
			expect(response).toEqual(peers);
			expect(status).toBe(200);
		});

		it('should respond with all disconnected peers when all query parameters are passed', async () => {
			// Arrange
			app['_channel'].invoke = jest.fn();
			// Mock channel invoke only when app:getDisconnectedPeers is called
			when(app['_channel'].invoke)
				.calledWith('app:getDisconnectedPeers')
				.mockResolvedValue(peers as never);

			// Act
			const { response, status } = await callNetwork(
				axios.get(getURL('/api/peers?state=disconnected&limit=100&offset=2')),
			);

			// Assert
			expect(response).toEqual(peers.slice(2, peers.length));
			expect(status).toBe(200);
		});

		it('should respond with 400 and error message when passed incorrect state value', async () => {
			const { response, status } = await callNetwork(axios.get(getURL('/api/peers?state=xxx')));
			// Assert
			expect(status).toBe(400);
			expect(response).toEqual({
				errors: [
					{
						message:
							'Lisk validator found 1 error[s]:\nshould be equal to one of the allowed values',
					},
				],
			});
		});

		it('should respond with 400 and error message when passed incorrect limit value', async () => {
			const { response, status } = await callNetwork(axios.get(getURL('/api/peers?limit=123xy')));
			// Assert
			expect(status).toBe(400);
			expect(response).toEqual({
				errors: [
					{
						message:
							'Lisk validator found 1 error[s]:\nProperty \'.limit\' should match format "uint64"',
					},
				],
			});
		});

		it('should respond with 400 and error message when passed incorrect offset value', async () => {
			// Act
			const { response, status } = await callNetwork(axios.get(getURL('/api/peers?offset=123xy')));
			// Assert
			expect(status).toBe(400);
			expect(response).toEqual({
				errors: [
					{
						message:
							'Lisk validator found 1 error[s]:\nProperty \'.offset\' should match format "uint64"',
					},
				],
			});
		});
	});
});
