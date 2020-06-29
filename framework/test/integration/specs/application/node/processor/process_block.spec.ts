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

import {
	utils,
	TransferTransaction,
	DelegateTransaction,
} from '@liskhq/lisk-transactions';
import { Block, Account } from '@liskhq/lisk-chain';
import { KVStore } from '@liskhq/lisk-db';
import { nodeUtils } from '../../../../../utils';
import { createDB, removeDB } from '../../../../../utils/kv_store';
import { genesis } from '../../../../../fixtures';
import { Node } from '../../../../../../src/application/node';

const { convertLSKToBeddows } = utils;

describe('Process block', () => {
	const dbName = 'process_block';
	const account = nodeUtils.createAccount();
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

	describe('given an account has a balance', () => {
		describe('when processing a block with valid transactions', () => {
			let newBlock: Block;
			let transaction: TransferTransaction;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				transaction = new TransferTransaction({
					nonce: genesisAccount.nonce,
					senderPublicKey: genesis.publicKey,
					fee: BigInt('200000'),
					asset: {
						recipientAddress: account.address,
						amount: BigInt('100000000000'),
						data: '',
					},
				});
				transaction.sign(node['_networkIdentifier'], genesis.passphrase);
				newBlock = await nodeUtils.createBlock(node, [transaction]);
				await node['_processor'].process(newBlock);
			});

			it('should save account state changes from the transaction', async () => {
				const recipient = await node['_chain'].dataAccess.getAccountByAddress(
					account.address,
				);
				expect(recipient.balance.toString()).toEqual(
					convertLSKToBeddows('1000'),
				);
			});

			it('should save the block to the database', async () => {
				const processedBlock = await node['_chain'].dataAccess.getBlockByID(
					newBlock.header.id,
				);
				expect(processedBlock.header.id).toEqual(newBlock.header.id);
			});

			it('should save the transactions to the database', async () => {
				const [processedTx] = await node[
					'_chain'
				].dataAccess.getTransactionsByIDs([transaction.id]);
				expect(processedTx.id).toEqual(transaction.id);
			});
		});
	});

	describe('given a valid block with empty transaction', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node);
				await node['_processor'].process(newBlock);
			});

			it('should add the block to the chain', async () => {
				const processedBlock = await node['_chain'].dataAccess.getBlockByID(
					newBlock.header.id,
				);
				expect(processedBlock.header.id).toEqual(newBlock.header.id);
			});
		});
	});

	describe('given a block with exsiting transactions', () => {
		describe('when processing the block', () => {
			let newBlock: Block;
			let transaction: TransferTransaction;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				transaction = new TransferTransaction({
					nonce: genesisAccount.nonce,
					senderPublicKey: genesis.publicKey,
					fee: BigInt('200000'),
					asset: {
						recipientAddress: account.address,
						amount: BigInt('100000000000'),
						data: '',
					},
				});
				transaction.sign(node['_networkIdentifier'], genesis.passphrase);
				newBlock = await nodeUtils.createBlock(node, [transaction]);
				await node['_processor'].process(newBlock);
			});

			it('should fail to process the block', async () => {
				const invalidBlock = await nodeUtils.createBlock(node, [transaction]);
				await expect(node['_processor'].process(invalidBlock)).rejects.toEqual([
					expect.objectContaining({
						message: expect.stringContaining(
							'Incompatible transaction nonce for account',
						),
					}),
				]);
			});
		});
	});

	describe('given a block forged by invalid delegate', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node, [], {
					keypair: {
						publicKey: account.publicKey,
						privateKey: account.privateKey,
					},
				});
				(newBlock.header as any).generatorPublicKey = account.publicKey;
			});

			it('should discard the block', async () => {
				await expect(node['_processor'].process(newBlock)).rejects.toEqual(
					expect.objectContaining({
						message: expect.stringContaining('Failed to verify slot'),
					}),
				);
			});
		});
	});

	describe('given a block which is already processed', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node);
				await node['_processor'].process(newBlock);
			});

			it('should discard the block', async () => {
				await expect(
					node['_processor'].process(newBlock),
				).resolves.toBeUndefined();
			});
		});
	});

	describe('given a block which is not continuous to the current chain', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node, [], {
					lastBlock: {
						header: {
							timestamp: Math.floor(new Date().getTime() / 1000),
							height: 99,
						},
					} as Block,
				});
			});

			it('should discard the block', async () => {
				await expect(
					node['_processor'].process(newBlock),
				).resolves.toBeUndefined();
				await expect(
					node['_chain'].dataAccess.isBlockPersisted(newBlock.header.id),
				).resolves.toBeFalse();
			});
		});
	});

	describe('given an account is already a delegate', () => {
		let newBlock: Block;
		let transaction: DelegateTransaction;

		beforeAll(async () => {
			const targetAccount = await node['_chain'].dataAccess.getAccountByAddress(
				account.address,
			);
			transaction = new DelegateTransaction({
				nonce: targetAccount.nonce,
				fee: BigInt('3000000000'),
				senderPublicKey: account.publicKey,
				asset: {
					username: 'number1',
				},
			});
			transaction.sign(node['_networkIdentifier'], account.passphrase);
			newBlock = await nodeUtils.createBlock(node, [transaction]);
			await node['_processor'].process(newBlock);
		});

		describe('when processing a block with a transaction which has delegate registration from the same account', () => {
			let invalidBlock: Block;
			let invalidTx: DelegateTransaction;
			let originalAccount: Account;

			beforeAll(async () => {
				originalAccount = await node['_chain'].dataAccess.getAccountByAddress(
					account.address,
				);
				invalidTx = new DelegateTransaction({
					nonce: originalAccount.nonce,
					fee: BigInt('5000000000'),
					senderPublicKey: account.publicKey,
					asset: {
						username: 'number1',
					},
				});
				transaction.sign(node['_networkIdentifier'], account.passphrase);
				invalidBlock = await nodeUtils.createBlock(node, [invalidTx]);
				try {
					await node['_processor'].process(invalidBlock);
				} catch (err) {
					// expected error
				}
			});

			it('should have the same account state as before', () => {
				expect(originalAccount.asset.delegate.username).toEqual('number1');
			});

			it('should not save the block to the database', async () => {
				await expect(
					node['_chain'].dataAccess.isBlockPersisted(invalidBlock.header.id),
				).resolves.toBeFalse();
			});

			it('should not save the transaction to the database', async () => {
				await expect(
					node['_chain'].dataAccess.isTransactionPersisted(invalidTx.id),
				).resolves.toBeFalse();
			});
		});
	});
});
