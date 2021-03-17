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
import { KeysModule, SequenceModule, TokenModule, testing } from 'lisk-framework';
import axios from 'axios';
import { HTTPAPIPlugin } from '../../src';
import * as genesisBlock from './fixtures/genesis_block.json';
import { callNetwork, getURL, config } from './utils/application';

describe('Account endpoint', () => {
	let appEnv: testing.ApplicationEnv;
	const accountFixture = {
		address: '9d0149b0962d44bfc08a9f64d5afceb6281d7fb5',
		token: { balance: '0' },
		sequence: { nonce: '0' },
		keys: {
			numberOfSignatures: 0,
			mandatoryKeys: [],
			optionalKeys: [],
		},
		dpos: {
			delegate: {
				username: 'genesis_5',
				pomHeights: [],
				consecutiveMissedBlocks: 0,
				lastForgedHeight: 0,
				isBanned: false,
				totalVotesReceived: '1000000000000',
			},
			sentVotes: [
				{
					delegateAddress: '9d0149b0962d44bfc08a9f64d5afceb6281d7fb5',
					amount: '1000000000000',
				},
			],
			unlocking: [],
		},
	};

	beforeAll(async () => {
		config.label = 'account_http_functional';
		appEnv = new testing.ApplicationEnv({
			modules: [TokenModule, SequenceModule, KeysModule],
			config,
			plugins: [HTTPAPIPlugin],
			genesisBlock,
		});
		await appEnv.startApplication();
	});

	afterAll(async () => {
		const options: { clearDB: boolean } = { clearDB: true };
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication(options);
	});

	describe('/api/accounts', () => {
		it('should respond with account when account found in db', async () => {
			const result = await axios.get(
				getURL('/api/accounts/9d0149b0962d44bfc08a9f64d5afceb6281d7fb5'),
			);
			expect(result.data).toEqual({ data: accountFixture, meta: {} });
			expect(result.status).toBe(200);
		});

		it('should respond with 404 and error message when account not found in db', async () => {
			const { response, status } = await callNetwork(
				axios.get(getURL('/api/accounts/9d0149b0962d44bfc08a9d24d5afceb6281d7fb5')),
			);

			expect(status).toBe(404);
			expect(response).toEqual({
				errors: [
					{
						message:
							"Account with address '9d0149b0962d44bfc08a9d24d5afceb6281d7fb5' was not found",
					},
				],
			});
		});

		it('should respond with 400 and error message when address param is not hex', async () => {
			const { response, status } = await callNetwork(axios.get(getURL('/api/accounts/-nein-no')));

			expect(status).toBe(400);
			expect(response).toEqual({
				errors: [{ message: 'The Address parameter should be a hex string.' }],
			});
		});
	});
});
