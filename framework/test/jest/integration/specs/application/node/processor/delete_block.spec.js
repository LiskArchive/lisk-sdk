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

describe('Delete block', () => {
	const dbName = 'delete_block';
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

	describe('given there is only a genesis block', () => {
		describe('when deleteLastBlock is called', () => {
			it.todo('should fail to delete genesis block', async () => {});
		});
	});

	describe('given there a valid block with transfer transaction is forged', () => {
		describe('when deleteLastBlock is called', () => {
			it.todo('should delete the block from the database', async () => {});
			it.todo(
				'should delete the transactions from the database',
				async () => {},
			);
			it.todo(
				'should match the sender account to the original state',
				async () => {},
			);
			it.todo(
				'should match the recipient account to the original state',
				async () => {},
			);
		});
	});
});
