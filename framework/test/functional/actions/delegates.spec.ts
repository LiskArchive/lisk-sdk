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
// TODO: Fix the test when functional test is fixed https://github.com/LiskHQ/lisk-sdk/issues/7209

// import { createApplication, closeApplication, waitNBlocks } from '../utils/application';
// import { Application } from '../../../src';

// describe('Delegate related actions', () => {
// 	let app: Application;

// 	beforeAll(async () => {
// 		app = await createApplication('actions-delegate');
// 		await waitNBlocks(app, 1);
// 	});

// 	afterAll(async () => {
// 		await closeApplication(app);
// 	});

// 	describe('getAllDelegates', () => {
// 		it('should return list of delegates', async () => {
// 			const delegates = await app['_channel'].invoke<{ [key: string]: string }[]>(
// 				'dpos:getAllDelegates',
// 			);
// 			expect(delegates).toBeArray();
// 			expect(delegates).toHaveLength(103);
// 			delegates.map(delegate => {
// 				expect(delegate.username).toBeString();
// 				return expect(delegate.address).toBeString();
// 			});
// 		});
// 	});
// });
