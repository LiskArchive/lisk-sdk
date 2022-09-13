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

// import { createApplication, closeApplication } from '../utils/application';
// import { Application } from '../../../src';
// import { genesis } from '../../fixtures';

// describe('Account related actions', () => {
// 	let app: Application;

// 	beforeAll(async () => {
// 		app = await createApplication('actions-account');
// 	});

// 	afterAll(async () => {
// 		await closeApplication(app);
// 	});

// 	describe('getAccount', () => {
// 		it('should return valid encoded account', async () => {
// 			const encodedAccount = await app['_channel'].invoke('app_getAccount', {
// 				address: genesis.address,
// 			});
// 			expect(encodedAccount).toBeString();
// 			const account = app['_node']['_chain'].dataAccess.decodeAccount(
// 				Buffer.from(encodedAccount as string, 'hex'),
// 			);
// 			expect(account.address).toEqual(genesis.address);
// 		});
// 	});

// 	describe('getAccounts', () => {
// 		it('should return valid encoded account', async () => {
// 			const encodedAccounts: string[] = await app['_channel'].invoke('app_getAccounts', {
// 				address: [genesis.address.toString('hex')],
// 			});
// 			expect(encodedAccounts).toHaveLength(1);
// 			const account = app['_node']['_chain'].dataAccess.decodeAccount(
// 				Buffer.from(encodedAccounts[0], 'hex'),
// 			);
// 			expect(account.address).toEqual(genesis.address);
// 		});
// 	});
// });
