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
import { testing, PartialApplicationConfig } from 'lisk-framework';
import axios from 'axios';

import { callNetwork, getURL } from './utils/application';
import { HTTPAPIPlugin } from '../../src/http_api_plugin';

describe('Blocks endpoints', () => {
	let appEnv: testing.ApplicationEnv;
	const label = 'blocks_http_functional';

	beforeAll(async () => {
		const rootPath = '~/.lisk/http-plugin';
		const config = {
			rootPath,
			label,
		} as PartialApplicationConfig;

		appEnv = testing.createDefaultApplicationEnv({
			config,
			plugins: [HTTPAPIPlugin],
		});
		await appEnv.startApplication();
		await appEnv.waitNBlocks(1);
	});

	afterAll(async () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication();
	});

	describe('api/blocks/', () => {
		it('should respond with block when block found for specified height', async () => {
			const result = await axios.get(getURL('/api/blocks/?height=1'));

			const returnedBlocks = result.data.data;
			expect(result.data).toEqual({ data: returnedBlocks, meta: {} });
			expect(returnedBlocks).toBeArrayOfSize(1);

			const [returnedBlock] = returnedBlocks;

			expect(Object.keys(returnedBlock)).toEqual(['header', 'payload']);
			expect(Object.keys(returnedBlock.header)).toEqual([
				'version',
				'timestamp',
				'height',
				'previousBlockID',
				'transactionRoot',
				'generatorPublicKey',
				'reward',
				'asset',
				'signature',
				'id',
			]);

			expect(Object.keys(returnedBlock.header.asset)).toEqual([
				'maxHeightPreviouslyForged',
				'maxHeightPrevoted',
				'seedReveal',
			]);

			expect(typeof returnedBlock.header.id).toBe('string');
			expect(typeof returnedBlock.header.version).toBe('number');
			expect(typeof returnedBlock.header.timestamp).toBe('number');
			expect(typeof returnedBlock.header.height).toBe('number');
			expect(typeof returnedBlock.header.previousBlockID).toBe('string');
			expect(typeof returnedBlock.header.transactionRoot).toBe('string');
			expect(typeof returnedBlock.header.generatorPublicKey).toBe('string');
			expect(typeof returnedBlock.header.reward).toBe('string');
			expect(typeof returnedBlock.header.asset.maxHeightPreviouslyForged).toBe('number');
			expect(typeof returnedBlock.header.asset.maxHeightPrevoted).toBe('number');
			expect(typeof returnedBlock.header.asset.seedReveal).toBe('string');
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
				errors: [{ message: 'The block height query parameter should be a number within uint32.' }],
			});
		});

		it('should respond with 400 and error message when height is bigger than uint32', async () => {
			const { response, status } = await callNetwork(
				axios.get(getURL('/api/blocks/?height=-2394890238432')),
			);

			expect(status).toBe(400);
			expect(response).toEqual({
				errors: [{ message: 'The block height query parameter should be a number within uint32.' }],
			});
		});
	});

	describe('api/blocks/:blockID', () => {
		it('should respond with block when block found for specified id', async () => {
			await appEnv.waitNBlocks(1);
			const {
				data: {
					data: [
						{
							header: { id },
						},
					],
				},
			} = await axios.get(getURL('/api/blocks/?height=1'));

			await appEnv.waitNBlocks(1);
			const result = await axios.get(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				getURL(`/api/blocks/${encodeURIComponent(id)}`),
			);

			const returnedBlock = result.data.data;

			expect(Object.keys(returnedBlock)).toEqual(['header', 'payload']);
			expect(Object.keys(returnedBlock.header)).toEqual([
				'version',
				'timestamp',
				'height',
				'previousBlockID',
				'transactionRoot',
				'generatorPublicKey',
				'reward',
				'asset',
				'signature',
				'id',
			]);

			expect(Object.keys(returnedBlock.header.asset)).toEqual([
				'maxHeightPreviouslyForged',
				'maxHeightPrevoted',
				'seedReveal',
			]);

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

		it('should respond with 404 and error message when block not found for specified id', async () => {
			const { response, status } = await callNetwork(
				axios.get(
					getURL('/api/blocks/ec3acb34c0a9599dfd46cfa97581abf4b5dd5d91b136c2209507193bf518c4c5'),
				),
			);

			expect(status).toBe(404);
			expect(response).toEqual({
				errors: [
					{
						message:
							"Block with id 'ec3acb34c0a9599dfd46cfa97581abf4b5dd5d91b136c2209507193bf518c4c5' was not found",
					},
				],
			});
		});

		it('should respond with 400 and error message when id param is not number', async () => {
			const { response, status } = await callNetwork(axios.get(getURL('/api/blocks/nein-no')));

			expect(status).toBe(400);
			expect(response).toEqual({
				errors: [{ message: 'The block id parameter should be a hex string.' }],
			});
		});
	});
});
