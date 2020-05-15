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

import { KVStore } from '@liskhq/lisk-db';
import { BlockInstance } from '@liskhq/lisk-chain';
import { transfer, TransactionJSON, utils } from '@liskhq/lisk-transactions';
import { createDB, removeDB } from '../../../../../utils/kv_store';
import { nodeUtils } from '../../../../../utils';
import { accounts } from '../../../../../fixtures';
import { Node } from '../../../../../../src/application/node';

const { convertLSKToBeddows } = utils;
const { genesis } = accounts;

describe('Delete block', () => {
	const dbName = 'delete_block';
	let node: Node;
	let blockchainDB: KVStore;
	let forgerDB: KVStore;

	beforeAll(async () => {
		({ blockchainDB, forgerDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);
		await node['_forger'].loadDelegates();
	});

	afterAll(async () => {
		await forgerDB.clear();
		await node.cleanup();
		await blockchainDB.close();
		await forgerDB.close();
		removeDB(dbName);
	});

	describe('given there is only a genesis block', () => {
		describe('when deleteLastBlock is called', () => {
			it('should fail to delete genesis block', async () => {
				await expect(node['_processor'].deleteLastBlock()).rejects.toEqual(
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

		let newBlock: BlockInstance;
		let transaction: TransactionJSON;
		let genesisAccount;

		beforeAll(async () => {
			genesisAccount = await node['_chain'].dataAccess.getAccountByAddress(
				genesis.address,
			);
			transaction = transfer({
				nonce: genesisAccount.nonce.toString(),
				networkIdentifier: node['_networkIdentifier'],
				fee: convertLSKToBeddows('0.002'),
				recipientId: account.address,
				amount: convertLSKToBeddows('1000'),
				passphrase: genesis.passphrase,
			}) as TransactionJSON;
			newBlock = await nodeUtils.createBlock(node, [
				node['_chain'].deserializeTransaction(transaction),
			]);
			await node['_processor'].process(newBlock);
		});

		describe('when deleteLastBlock is called', () => {
			beforeAll(async () => {
				await node['_processor'].deleteLastBlock();
			});

			it('should delete the block from the database', async () => {
				await expect(
					node['_chain'].dataAccess.isBlockPersisted(newBlock.id),
				).resolves.toBeFalse();
			});

			it('should delete the transactions from the database', async () => {
				await expect(
					node['_chain'].dataAccess.isTransactionPersisted(
						transaction.id as string,
					),
				).resolves.toBeFalse();
			});

			it('should match the sender account to the original state', async () => {
				const genesisAfter = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				expect(genesisAfter.balance.toString()).toEqual(
					genesisAfter.balance.toString(),
				);
			});

			it('should match the recipient account to the original state', async () => {
				const accountAfter = await node[
					'_chain'
				].dataAccess.getAccountByAddress(account.address);
				expect(accountAfter.balance.toString()).toEqual('0');
			});
		});
	});
});
