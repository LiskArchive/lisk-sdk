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
import { generatePeers } from './utils/peers';

describe('Peers endpoint', () => {
	let app: Application;
	const peers = generatePeers();

	beforeAll(async () => {
		app = await createApplication('peers');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('/api/peers', () => {
		describe('200 - Success', () => {
			it('should respond with 100 connected peers as limit has 100 default value', async () => {
				// Arrange
				app['_channel'].invoke = jest.fn();
				// Mock channel invoke only when app:getConnectedPeers is called
				when(app['_channel'].invoke)
					.calledWith('app:getConnectedPeers')
					.mockResolvedValue(peers as never);

				// Act
				const { response, status } = await callNetwork(axios.get(getURL('/api/peers')));

				// Assert
				expect(response.data).toEqual(peers.slice(0, 100));
				expect(response.meta).toEqual({ count: peers.length, limit: 100, offset: 0 });
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
				expect(response.data).toEqual(peers.slice(2, 102));
				expect(response.meta).toEqual({ count: peers.length, limit: 100, offset: 2 });
				expect(status).toBe(200);
			});
		});

		describe('400 - Invalid query values', () => {
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
								'Lisk validator found 1 error[s]:\nProperty \'.limit\' should match format "uint32"',
						},
					],
				});
			});

			it('should respond with 400 and error message when passed incorrect offset value', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/peers?offset=123xy')),
				);
				// Assert
				expect(status).toBe(400);
				expect(response).toEqual({
					errors: [
						{
							message:
								'Lisk validator found 1 error[s]:\nProperty \'.offset\' should match format "uint32"',
						},
					],
				});
			});
		});

		describe('500 - Some internal operation fails to process', () => {
			it('should throw 500 error when channel.invoke fails', async () => {
				// Arrange
				app['_channel'].invoke = jest.fn();
				// Mock channel invoke only when app:getConnectedPeers is called
				when(app['_channel'].invoke)
					.calledWith('app:getConnectedPeers')
					.mockRejectedValue(new Error('test') as never);
				const { response, status } = await callNetwork(axios.get(getURL('/api/peers')));
				// Assert
				expect(status).toBe(500);
				expect(response).toEqual({
					errors: [
						{
							message: 'test',
						},
					],
				});
			});
		});
	});
});
