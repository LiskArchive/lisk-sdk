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
	nodeUtils,
	storageUtils,
	configUtils,
} = require('../../../../../../utils');

describe('Process block', () => {
	const dbName = 'process_block';
	let storage;
	let node;

	beforeAll(async () => {
		storage = new storageUtils.StorageSandbox(
			configUtils.storageConfig({ database: dbName }),
			dbName,
		);
		await storage.bootstrap();
		node = await nodeUtils.createAndLoadNode(storage, console);
	});

	afterAll(async () => {
		await node.cleanup();
		await storage.cleanup();
	});

	describe('given an account has a balance', () => {
		describe('when processing a block with valid transactions', () => {
			it.todo('should process the block', async () => {});
			it.todo(
				'should save account state changes from the transaction',
				async () => {},
			);
			it.todo('should save the block to the database', async () => {});
			it.todo('should save the transactions to the database', async () => {});
		});
	});

	describe('given a valid block with empty transaction', () => {
		describe('when processing the block', () => {
			it.todo('should add the block to the chain', async () => {});
			it.todo('should verify DPoS properties', async () => {});
			it.todo('should verify BFT properties', async () => {});
			it.todo('should verify block properties', async () => {});
			it.todo('should apply chain', async () => {});
			it.todo('should apply BFT', async () => {});
			it.todo('should apply DPoS', async () => {});
			it.todo('should cleanup DPoS', async () => {});
		});
	});

	describe('given a block with exsiting transactions', () => {
		describe('when processing the block', () => {
			it.todo('should fail to process the block', async () => {});
		});
	});

	describe('given a block forged by invalid delegate', () => {
		describe('when processing the block', () => {
			it.todo('should discard the block', async () => {});
		});
	});

	describe('given a block which is already processed', () => {
		describe('when processing the block', () => {
			it.todo('should discard the block', async () => {});
		});
	});

	describe('given a block which is not continuous to the current chain', () => {
		describe('when processing the block', () => {
			it.todo('should discard the block', async () => {});
		});
	});

	describe('given an account is already a delegate', () => {
		describe('when processing a block with a transaction which has delegate registration from the same account', () => {
			it.todo('should fail to process the block', async () => {});
			it.todo('should have the same account state as before', async () => {});
			it.todo('should not save the block to the database', async () => {});
			it.todo(
				'should not save the transaction to the database',
				async () => {},
			);
		});
	});
});
