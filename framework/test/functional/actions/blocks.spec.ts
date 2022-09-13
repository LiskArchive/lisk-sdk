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

// describe('Block related actions', () => {
// 	let app: Application;

// 	beforeAll(async () => {
// 		app = await createApplication('actions-blocks');
// 	});

// 	afterAll(async () => {
// 		await closeApplication(app);
// 	});

// 	describe('getBlockByID', () => {
// 		it('should return valid encoded block', async () => {
// 			const expectedBlock = app['_node']['_chain'].lastBlock;
// 			const encodedBlock = await app['_channel'].invoke('app_getBlockByID', {
// 				id: expectedBlock.header.id.toString('hex'),
// 			});
// 			expect(encodedBlock).toBeString();
// 			const block = app['_node']['_chain'].dataAccess.decode(
// 				Buffer.from(encodedBlock as string, 'hex'),
// 			);
// 			expect(block.header.version).toEqual(expectedBlock.header.version);
// 			expect(block.header.height).toEqual(expectedBlock.header.height);
// 		});
// 	});

// 	describe('getBlocksByIDs', () => {
// 		it('should return valid encoded blocks', async () => {
// 			const expectedBlock = app['_node']['_chain'].lastBlock;
// 			const encodedBlocks: string[] = await app['_channel'].invoke('app_getBlocksByIDs', {
// 				ids: [expectedBlock.header.id.toString('hex')],
// 			});
// 			expect(encodedBlocks).toHaveLength(1);
// 			const block = app['_node']['_chain'].dataAccess.decode(Buffer.from(encodedBlocks[0], 'hex'));
// 			expect(block.header.version).toEqual(expectedBlock.header.version);
// 			expect(block.header.height).toEqual(expectedBlock.header.height);
// 		});
// 	});

// 	describe('getBlockByHeight', () => {
// 		it('should return valid encoded block', async () => {
// 			const encodedBlock = await app['_channel'].invoke('app_getBlockByHeight', { height: 2 });
// 			expect(encodedBlock).toBeString();
// 			const block = app['_node']['_chain'].dataAccess.decode(
// 				Buffer.from(encodedBlock as string, 'hex'),
// 			);
// 			expect(block.header.height).toEqual(2);
// 		});
// 	});

// 	describe('getBlocksByHeightBetween', () => {
// 		it('should return valid encoded blocks', async () => {
// 			const encodedBlocks: string[] = await app['_channel'].invoke('app_getBlocksByHeightBetween', {
// 				from: 1,
// 				to: 2,
// 			});
// 			expect(encodedBlocks).toHaveLength(2);
// 			const block = app['_node']['_chain'].dataAccess.decode(Buffer.from(encodedBlocks[0], 'hex'));
// 			expect(block.header.height).toEqual(2);
// 		});
// 	});
// });
