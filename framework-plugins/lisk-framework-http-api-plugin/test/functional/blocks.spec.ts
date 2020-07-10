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
// import { codec } from '@liskhq/lisk-codec';
import { Application } from 'lisk-framework';
import axios from 'axios';
import {
	callNetwork,
	createApplication,
	closeApplication,
	getURL,
	waitNBlocks,
} from './utils/application';

describe('Blocks endpoints', () => {
	let app: Application;

	beforeAll(async () => {
		app = await createApplication('blocks_http_functional');
		await waitNBlocks(app, 1);
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('api/blocks/', () => {
		it('should respond with block when block found for specified height', async () => {
			const result = await axios.get(getURL('/api/blocks/?height=1'));

			expect(result.status).toBe(200);
			expect(result).toHaveProperty('data');
			expect(result.data).toHaveProperty('data.header');
			expect(result.data).toHaveProperty('data.payload');
			expect(result.data).toHaveProperty('data.header.id');
			expect(result.data).toHaveProperty('data.header.version');
			expect(result.data).toHaveProperty('data.header.timestamp');
			expect(result.data).toHaveProperty('data.header.height');
			expect(result.data).toHaveProperty('data.header.previousBlockID');
			expect(result.data).toHaveProperty('data.header.transactionRoot');
			expect(result.data).toHaveProperty('data.header.generatorPublicKey');
			expect(result.data).toHaveProperty('data.header.reward');
			expect(result.data).toHaveProperty('data.header.asset');
			expect(result.data).toHaveProperty('data.header.asset.maxHeightPreviouslyForged');
			expect(result.data).toHaveProperty('data.header.asset.maxHeightPrevoted');
			expect(result.data).toHaveProperty('data.header.asset.seedReveal');

			expect(typeof result.data.data.header.id).toBe('string');
			expect(typeof result.data.data.header.version).toBe('number');
			expect(typeof result.data.data.header.timestamp).toBe('number');
			expect(typeof result.data.data.header.height).toBe('number');
			expect(typeof result.data.data.header.previousBlockID).toBe('string');
			expect(typeof result.data.data.header.transactionRoot).toBe('string');
			expect(typeof result.data.data.header.generatorPublicKey).toBe('string');
			expect(typeof result.data.data.header.reward).toBe('string');
			expect(typeof result.data.data.header.asset.maxHeightPreviouslyForged).toBe('number');
			expect(typeof result.data.data.header.asset.maxHeightPrevoted).toBe('number');
			expect(typeof result.data.data.header.asset.seedReveal).toBe('string');
		});

		it('should respond with 404 and error message when block not found for specified height', async () => {
			const { response, status } = await callNetwork(axios.get(getURL('/api/blocks/?height=2')));

			expect(status).toBe(404);
			expect(response).toEqual({
				errors: [
					{
						message: "Block with height '2' was not found",
					},
				],
			});
		});

		it('should respond with 400 and error message when height param is not number', async () => {
			const { response, status } = await callNetwork(
				axios.get(getURL('/api/blocks/?height=-nein-no')),
			);

			expect(status).toBe(400);
			expect(response).toEqual({
				errors: [{ message: 'The block height query parameter should be a number.' }],
			});
		});
	});

	describe('api/blocks/:blockID', () => {
		it('should respond with block when block found for specified id', async () => {
			const result = await axios.get(
				getURL('/api/blocks/4ILnnQEBZjLEUcnfknbkhst%2FRg3Hk%2F9bENj3HuzsKLQ%3D'),
			);

			expect(result.status).toBe(200);
			expect(result).toHaveProperty('data');
			expect(result.data).toHaveProperty('data.header');
			expect(result.data).toHaveProperty('data.payload');
			expect(result.data).toHaveProperty('data.header.id');
			expect(result.data).toHaveProperty('data.header.version');
			expect(result.data).toHaveProperty('data.header.timestamp');
			expect(result.data).toHaveProperty('data.header.height');
			expect(result.data).toHaveProperty('data.header.previousBlockID');
			expect(result.data).toHaveProperty('data.header.transactionRoot');
			expect(result.data).toHaveProperty('data.header.generatorPublicKey');
			expect(result.data).toHaveProperty('data.header.reward');
			expect(result.data).toHaveProperty('data.header.asset');
			expect(result.data).toHaveProperty('data.header.asset.maxHeightPreviouslyForged');
			expect(result.data).toHaveProperty('data.header.asset.maxHeightPrevoted');
			expect(result.data).toHaveProperty('data.header.asset.seedReveal');

			expect(typeof result.data.data.header.id).toBe('string');
			expect(typeof result.data.data.header.version).toBe('number');
			expect(typeof result.data.data.header.timestamp).toBe('number');
			expect(typeof result.data.data.header.height).toBe('number');
			expect(typeof result.data.data.header.previousBlockID).toBe('string');
			expect(typeof result.data.data.header.transactionRoot).toBe('string');
			expect(typeof result.data.data.header.generatorPublicKey).toBe('string');
			expect(typeof result.data.data.header.reward).toBe('string');
			expect(typeof result.data.data.header.asset.maxHeightPreviouslyForged).toBe('number');
			expect(typeof result.data.data.header.asset.maxHeightPrevoted).toBe('number');
			expect(typeof result.data.data.header.asset.seedReveal).toBe('string');
		});

		it('should respond with 404 and error message when block not found for specified height', async () => {
			const { response, status } = await callNetwork(
				axios.get(getURL('/api/blocks/7DrLNMCpWZ39Rs%2BpdYGr9LXdXZGxNsIglQcZO%2FUYxMU%3D')),
			);

			expect(status).toBe(404);
			expect(response).toEqual({
				errors: [
					{
						message: "Block with id '7DrLNMCpWZ39Rs+pdYGr9LXdXZGxNsIglQcZO/UYxMU=' was not found",
					},
				],
			});
		});

		it('should respond with 400 and error message when height param is not number', async () => {
			const { response, status } = await callNetwork(axios.get(getURL('/api/blocks/nein-no')));

			expect(status).toBe(400);
			expect(response).toEqual({
				errors: [{ message: 'The block id parameter should be a base64 string.' }],
			});
		});
	});
});
