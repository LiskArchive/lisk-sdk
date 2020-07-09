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

		it('should respond with 400 and error message when channel.invoke throws error', async () => {
			expect.assertions(2);
			try {
				// Arrange
				app['_channel'].invoke = jest.fn();
				// Mock channel invoke only when app:getConnectedPeers is called
				when(app['_channel'].invoke)
					.calledWith('app:getConnectedPeers')
					.mockRejectedValue(new Error('Error occured') as never);
				// Act
				await axios.get(getURL('/api/peers'));
			} catch (err) {
				// Assert
				// eslint-disable-next-line jest/no-try-expect
				expect(err.response.status).toBe(500);
				// eslint-disable-next-line jest/no-try-expect
				expect(err.response.data).toEqual({
					errors: [
						{
							message: 'Something went wrong while fetching peers list: Error occured',
						},
					],
				});
			}
		});

		it('should respond with 400 and error message when passed incorrect state value', async () => {
			expect.assertions(2);
			try {
				// Act
				await axios.get(getURL('/api/peers?state=xxx'));
			} catch (err) {
				// Assert
				// eslint-disable-next-line jest/no-try-expect
				expect(err.response.status).toBe(400);
				// eslint-disable-next-line jest/no-try-expect
				expect(err.response.data).toEqual({
					errors: [
						{
							message:
								'Invalid param value(s), limit and offset should be a valid number and state can be either "connected" or "disconnected"',
						},
					],
				});
			}
		});

		it('should respond with 400 and error message when passed incorrect limit value', async () => {
			expect.assertions(2);
			try {
				// Act
				await axios.get(getURL('/api/peers?limit=123xy'));
			} catch (err) {
				// Assert
				// eslint-disable-next-line jest/no-try-expect
				expect(err.response.status).toBe(400);
				// eslint-disable-next-line jest/no-try-expect
				expect(err.response.data).toEqual({
					errors: [
						{
							message:
								'Invalid param value(s), limit and offset should be a valid number and state can be either "connected" or "disconnected"',
						},
					],
				});
			}
		});

		it('should respond with 400 and error message when passed incorrect offset value', async () => {
			expect.assertions(2);
			try {
				// Act
				await axios.get(getURL('/api/peers?offset=123xy'));
			} catch (err) {
				// Assert
				// eslint-disable-next-line jest/no-try-expect
				expect(err.response.status).toBe(400);
				// eslint-disable-next-line jest/no-try-expect
				expect(err.response.data).toEqual({
					errors: [
						{
							message:
								'Invalid param value(s), limit and offset should be a valid number and state can be either "connected" or "disconnected"',
						},
					],
				});
			}
		});
	});
});
