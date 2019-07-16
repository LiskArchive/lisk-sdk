/*
 * Copyright © 2018 Lisk Foundation
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

'use strict';

const {
	createDefaultChainModule,
	StorageSandbox,
	storageConfig,
	getBlock,
} = require('../../../utils');
const genesisBlock = require('../../../../../fixtures/config/devnet/genesis_block');

describe('genesis block', () => {
	const dbName = 'genesis_block';
	let storage;
	let chainModule;

	beforeAll(async () => {
		storage = new StorageSandbox(storageConfig(dbName));
		await storage.bootstrap();
		chainModule = await createDefaultChainModule(dbName);
	});

	afterAll(async () => {
		await chainModule.unload();
		await storage.cleanup();
	});

	describe('given the application has not been initialized', () => {
		describe('when chain module is bootstrapped', () => {
			it('should save genesis block to the database', async () => {
				const block = await getBlock(storage, genesisBlock.id);
				expect(block.id).toEqual(genesisBlock.id);
				expect(block.height).toEqual(1);
			});

			it.todo('should save correct amount of transactions');
			it.todo(
				'should save create an account for the registered genesis delegates'
			);
			it.todo('should have correct vote weight for genesis delegates');
			it.todo('should have correct delegate list');
		});
	});

	describe('given the application has been initialized', () => {
		describe('when chain module is bootstrapped', () => {
			it.todo('should have genesis block in the database');
			it.todo('should save correct amount of transactions');
			it.todo(
				'should save create an account for the registered genesis delegates'
			);
			it.todo('should have correct vote weight for genesis delegates');
			it.todo('should have correct delegate list');
		});
	});
});
