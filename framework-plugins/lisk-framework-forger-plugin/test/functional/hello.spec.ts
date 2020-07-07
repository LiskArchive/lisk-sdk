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
import {
	createApplication,
	closeApplication,
	waitNBlocks,
	getURL,
} from './utils/application';

describe('Hello endpoint', () => {
	let app: Application;

	beforeAll(async () => {
		app = await createApplication('hello');
		await waitNBlocks(app, 1);
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('/v1/hello', () => {
		it('should respond with hello', async () => {
			const result = await axios.get(getURL('/v1/hello'));
			expect(result.data).toEqual({ hello: 'world' });
		});
	});
});
