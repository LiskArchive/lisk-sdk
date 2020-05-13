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

'use strict';

const {
	transfer,
	utils: { convertLSKToBeddows },
} = require('@liskhq/lisk-transactions');
const { KVStore } = require('@liskhq/lisk-db');
const {
	nodeUtils,
	storageUtils,
	configUtils,
} = require('../../../../../../utils');
const {
	accounts: { genesis },
} = require('../../../../../../fixtures');

describe('Delete block', () => {
	const dbName = 'delete_block';
	let storage;
	let node;
	let forgerDB;

	beforeAll(async () => {
		storage = new storageUtils.StorageSandbox(
			configUtils.storageConfig({ database: dbName }),
			dbName,
		);
		await storage.bootstrap();
		forgerDB = new KVStore(`/tmp/${dbName}.db`);
		node = await nodeUtils.createAndLoadNode(storage, forgerDB);
		await node._forger.loadDelegates();
	});

	afterAll(async () => {
		await forgerDB.clear();
		await node.cleanup();
		await storage.cleanup();
	});

	describe('given there is only a genesis block', () => {
		describe('when deleteLastBlock is called', () => {
			it('should fail to delete genesis block', async () => {
				await expect(node._processor.deleteLastBlock()).rejects.toEqual(
					expect.objectContaining({
						message: expect.stringContaining(
							'Can not delete block below or same as finalized height',
						),
					}),
				);
			});
		});
	});

	describe('given there a valid block with transfer transaction is forged', () => {
		const account = nodeUtils.createAccount();

		let newBlock;
		let transaction;
		let genesisAccount;

		beforeAll(async () => {
			genesisAccount = await node._chain.dataAccess.getAccountByAddress(
				genesis.address,
			);
			transaction = transfer({
				nonce: genesisAccount.nonce.toString(),
				networkIdentifier: node._networkIdentifier,
				fee: convertLSKToBeddows('0.002'),
				recipientId: account.address,
				amount: convertLSKToBeddows('1000'),
				passphrase: genesis.passphrase,
			});
			newBlock = await nodeUtils.createBlock(node, [
				node._chain.deserializeTransaction(transaction),
			]);
			await node._processor.process(newBlock);
		});

		describe('when deleteLastBlock is called', () => {
			beforeAll(async () => {
				await node._processor.deleteLastBlock();
			});

			it('should delete the block from the database', async () => {
				const processedBlock = await node._chain.dataAccess.getBlockByID(
					newBlock.id,
				);
				expect(processedBlock).toBeUndefined();
			});

			it('should delete the transactions from the database', async () => {
				const processedTxs = await node._chain.dataAccess.getTransactionsByIDs([
					transaction.id,
				]);
				expect(processedTxs).toHaveLength(0);
			});

			it('should match the sender account to the original state', async () => {
				const genesisAfter = await node._chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				expect(genesisAfter.balance.toString()).toEqual(
					genesisAfter.balance.toString(),
				);
			});

			it('should match the recipient account to the original state', async () => {
				const accountAfter = await node._chain.dataAccess.getAccountByAddress(
					account.address,
				);
				expect(accountAfter.balance.toString()).toEqual('0');
			});
		});
	});
});
