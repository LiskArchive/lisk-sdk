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
import { createApplication, closeApplication, waitNBlocks, getURL } from '../utils/application';

describe('Forger endpoint', () => {
	let app: Application;

	beforeAll(async () => {
		app = await createApplication('forger_functional');
		await waitNBlocks(app, 1);
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('GET /api/forgers/', () => {
		let result: any;

		beforeEach(async () => {
			result = await axios.get(getURL('/api/forgers'));
		});

		it('should return list of 103 forgers', () => {
			expect(result.data).toHaveLength(103);
		});

		it('should return forger username', () => {
			expect(typeof result.data[0].username).toBe('string');
		});

		it('should return forger totalVotesReceived', () => {
			expect(typeof result.data[0].totalVotesReceived).toBe('string');
		});

		it('should return forger address', () => {
			expect(typeof result.data[0].address).toBe('string');
		});
	});
});
