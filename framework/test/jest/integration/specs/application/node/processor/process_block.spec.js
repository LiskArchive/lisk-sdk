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
	transfer,
	registerDelegate,
	utils: { convertLSKToBeddows },
} = require('@liskhq/lisk-transactions');
const {
	nodeUtils,
	storageUtils,
	configUtils,
} = require('../../../../../../utils');
const {
	accounts: { genesis },
} = require('../../../../../../fixtures');

describe('Process block', () => {
	const dbName = 'process_block';
	const account = nodeUtils.createAccount();
	let storage;
	let node;

	beforeAll(async () => {
		storage = new storageUtils.StorageSandbox(
			configUtils.storageConfig({ database: dbName }),
			dbName,
		);
		await storage.bootstrap();
		node = await nodeUtils.createAndLoadNode(storage);
		await node.forger.loadDelegates();
	});

	afterAll(async () => {
		await node.cleanup();
		await storage.cleanup();
	});

	describe('given an account has a balance', () => {
		describe('when processing a block with valid transactions', () => {
			let newBlock;
			let transaction;

			beforeAll(async () => {
				const genesisAccount = await node.chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				transaction = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: account.address,
					amount: convertLSKToBeddows('1000'),
					passphrase: genesis.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [
					node.chain.deserializeTransaction(transaction),
				]);
				await node.processor.process(newBlock);
			});

			it('should save account state changes from the transaction', async () => {
				const recipient = await node.chain.dataAccess.getAccountByAddress(
					account.address,
				);
				expect(recipient.balance.toString()).toEqual(
					convertLSKToBeddows('1000'),
				);
			});

			it('should save the block to the database', async () => {
				const processedBlock = await node.chain.dataAccess.getBlockByID(
					newBlock.id,
				);
				expect(processedBlock.id).toEqual(newBlock.id);
			});

			it('should save the transactions to the database', async () => {
				const [processedTx] = await node.chain.dataAccess.getTransactionsByIDs([
					transaction.id,
				]);
				expect(processedTx.id).toEqual(transaction.id);
			});
		});
	});

	describe('given a valid block with empty transaction', () => {
		describe('when processing the block', () => {
			let newBlock;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node);
				await node.processor.process(newBlock);
			});

			it('should add the block to the chain', async () => {
				const processedBlock = await node.chain.dataAccess.getBlockByID(
					newBlock.id,
				);
				expect(processedBlock.id).toEqual(newBlock.id);
			});
		});
	});

	describe('given a block with exsiting transactions', () => {
		describe('when processing the block', () => {
			let newBlock;
			let transaction;

			beforeAll(async () => {
				const genesisAccount = await node.chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				transaction = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: account.address,
					amount: convertLSKToBeddows('1000'),
					passphrase: genesis.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [
					node.chain.deserializeTransaction(transaction),
				]);
				await node.processor.process(newBlock);
			});

			it('should fail to process the block', async () => {
				const invalidBlock = await nodeUtils.createBlock(node, [
					node.chain.deserializeTransaction(transaction),
				]);
				await expect(node.processor.process(invalidBlock)).rejects.toEqual([
					expect.objectContaining({
						message: expect.stringContaining(
							'Transaction is already confirmed',
						),
					}),
				]);
			});
		});
	});

	describe('given a block forged by invalid delegate', () => {
		describe('when processing the block', () => {
			let newBlock;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node, [], {
					keypair: {
						publicKey: Buffer.from(account.publicKey, 'hex'),
						privateKey: Buffer.from(account.privateKey, 'hex'),
					},
				});
				newBlock.generatorPublicKey = account.publicKey;
			});

			it('should discard the block', async () => {
				await expect(node.processor.process(newBlock)).rejects.toEqual(
					expect.objectContaining({
						message: expect.stringContaining('Failed to verify slot'),
					}),
				);
			});
		});
	});

	describe('given a block which is already processed', () => {
		describe('when processing the block', () => {
			let newBlock;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node);
				await node.processor.process(newBlock);
			});

			it('should discard the block', async () => {
				await expect(node.processor.process(newBlock)).resolves.toBeUndefined();
			});
		});
	});

	describe('given a block which is not continuous to the current chain', () => {
		describe('when processing the block', () => {
			let newBlock;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node, [], {
					lastBlock: { timestamp: 10000, height: 99 },
				});
			});

			it('should discard the block', async () => {
				await expect(node.processor.process(newBlock)).resolves.toBeUndefined();
				const processedBlock = await node.chain.dataAccess.getBlockByID(
					newBlock.id,
				);
				expect(processedBlock).toBeUndefined();
			});
		});
	});

	describe('given an account is already a delegate', () => {
		let newBlock;
		let transaction;

		beforeAll(async () => {
			const targetAccount = await node.chain.dataAccess.getAccountByAddress(
				account.address,
			);
			transaction = registerDelegate({
				nonce: targetAccount.nonce.toString(),
				networkIdentifier: node.networkIdentifier,
				fee: convertLSKToBeddows('30'),
				username: 'number1',
				passphrase: account.passphrase,
			});
			newBlock = await nodeUtils.createBlock(node, [
				node.chain.deserializeTransaction(transaction),
			]);
			await node.processor.process(newBlock);
		});

		describe('when processing a block with a transaction which has delegate registration from the same account', () => {
			let invalidBlock;
			let invalidTx;
			let originalAccount;

			beforeAll(async () => {
				originalAccount = await node.chain.dataAccess.getAccountByAddress(
					account.address,
				);
				invalidTx = registerDelegate({
					nonce: originalAccount.nonce.toString(),
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('50'),
					username: 'number2',
					passphrase: account.passphrase,
				});
				invalidBlock = await nodeUtils.createBlock(node, [
					node.chain.deserializeTransaction(invalidTx),
				]);
				try {
					await node.processor.process(invalidBlock);
				} catch (err) {
					// expected error
				}
			});

			it('should have the same account state as before', async () => {
				expect(originalAccount.username).toEqual('number1');
			});

			it('should not save the block to the database', async () => {
				const processedBlock = await node.chain.dataAccess.getBlockByID(
					invalidBlock.id,
				);
				expect(processedBlock).toBeUndefined();
			});

			it('should not save the transaction to the database', async () => {
				const processedTxs = await node.chain.dataAccess.getTransactionsByIDs([
					invalidTx.id,
				]);
				expect(processedTxs).toHaveLength(0);
			});
		});
	});
});
