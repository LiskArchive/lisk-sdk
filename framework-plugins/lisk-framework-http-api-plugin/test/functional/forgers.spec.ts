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
import { getURL, config } from './utils/application';

describe('Forger endpoint', () => {
	let appEnv: testing.ApplicationEnv;

	beforeAll(async () => {
		config.label = 'forger_functional';
		appEnv = new testing.ApplicationEnv({
			modules: [TokenModule, SequenceModule, KeysModule],
			config,
			plugins: [HTTPAPIPlugin],
			genesisBlock,
		});
		await appEnv.startApplication();
		await appEnv.waitNBlocks(1);
	});

	afterAll(async () => {
		const options: { clearDB: boolean } = { clearDB: true };
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication(options);
	});

	describe('GET /api/forgers/', () => {
		let result: any;

		beforeEach(async () => {
			result = await axios.get(getURL('/api/forgers'));
		});

		it('should return list of 103 forgers', () => {
			expect(result.data.data).toHaveLength(103);
			expect(result.data.meta).toEqual({
				count: 103,
			});
		});

		it('should return forger username', () => {
			expect(typeof result.data.data[0].username).toBe('string');
		});

		it('should return forger totalVotesReceived', () => {
			expect(typeof result.data.data[0].totalVotesReceived).toBe('string');
		});

		it('should return forger address', () => {
			expect(typeof result.data.data[0].address).toBe('string');
		});

		it('should return forger nextForgingTime', () => {
			expect(typeof result.data.data[0].nextForgingTime).toBe('number');
		});
	});
});
