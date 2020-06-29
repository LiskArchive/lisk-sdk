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

import { KVStore, formatInt, NotFoundError } from '@liskhq/lisk-db';
import { Block, stateDiffSchema, Account } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { createDB, removeDB } from '../../../../../utils/kv_store';
import { nodeUtils } from '../../../../../utils';
import { genesis } from '../../../../../fixtures';
import { Node } from '../../../../../../src/application/node';

describe('Delete block', () => {
	const dbName = 'delete_block';
	const emptyDiffState = codec.encode(stateDiffSchema, {
		updated: [],
		created: [],
	});
	let node: Node;
	let blockchainDB: KVStore;
	let forgerDB: KVStore;
	let nodeDB: KVStore;

	beforeAll(async () => {
		({ blockchainDB, forgerDB, nodeDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB, nodeDB);
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
		const recipientAccount = nodeUtils.createAccount();

		let newBlock: Block;
		let transaction: TransferTransaction;
		let genesisAccount: Account;

		describe('when deleteLastBlock is called', () => {
			beforeEach(async () => {
				genesisAccount = await node['_chain'].dataAccess.getAccountByAddress(
					genesis.address,
				);
				transaction = new TransferTransaction({
					nonce: genesisAccount.nonce,
					senderPublicKey: genesis.publicKey,
					fee: BigInt('200000'),
					asset: {
						recipientAddress: recipientAccount.address,
						amount: BigInt('100000000000'),
						data: '',
					},
				});
				transaction.sign(node['_networkIdentifier'], genesis.passphrase);
				newBlock = await nodeUtils.createBlock(node, [transaction]);
				await blockchainDB.put(
					`diff:${formatInt(newBlock.header.height)}`,
					emptyDiffState,
				);
				await node['_processor'].process(newBlock);
				await node['_processor'].deleteLastBlock();
			});

			it('should delete the block from the database', async () => {
				await expect(
					node['_chain'].dataAccess.isBlockPersisted(newBlock.header.id),
				).resolves.toBeFalse();
			});

			it('should delete the transactions from the database', async () => {
				await expect(
					node['_chain'].dataAccess.isTransactionPersisted(transaction.id),
				).resolves.toBeFalse();
			});

			it('should match the sender account to the original state', async () => {
				const genesisAfter = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				expect(genesisAfter.balance.toString()).toEqual(
					genesisAccount.balance.toString(),
				);
			});

			it('should not persist virgin recipient account', async () => {
				await expect(
					node['_chain'].dataAccess.getAccountByAddress(
						recipientAccount.address,
					),
				).rejects.toBeInstanceOf(NotFoundError);
				await expect(
					blockchainDB.get(`diff:${formatInt(newBlock.header.height)}`),
				).rejects.toBeInstanceOf(NotFoundError);
			});
		});
	});
});
