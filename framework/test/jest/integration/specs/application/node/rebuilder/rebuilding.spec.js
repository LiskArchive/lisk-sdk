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
const {
	nodeUtils,
	storageUtils,
	configUtils,
} = require('../../../../../../utils');
const {
	accounts: { genesis },
} = require('../../../../../../fixtures');

describe('Rebuilding blocks', () => {
	// This test takes long
	jest.setTimeout(100000);

	const dbName = 'rebuild_block';
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

	describe('given a valid blockchain for 3 rounds', () => {
		const addresses = [];
		let accounts;

		beforeAll(async () => {
			for (let i = 0; i < 201; i += 1) {
				const account = nodeUtils.createAccount();
				addresses.push(account.address);
				const genesisAccount = await node.chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				const transaction = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: account.address,
					amount: convertLSKToBeddows('1000'),
					passphrase: genesis.passphrase,
				});
				const newBlock = await nodeUtils.createBlock(node, [
					node.chain.deserializeTransaction(transaction),
				]);
				await node.processor.process(newBlock);
			}
			// Freeze address
			accounts = await node.chain.dataAccess.getAccountsByAddress(addresses);
			for (let i = 0; i < 101; i += 1) {
				const genesisAccount = await node.chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				const transaction = transfer({
					nonce: genesisAccount.nonce.toString(),
					networkIdentifier: node.networkIdentifier,
					fee: convertLSKToBeddows('0.002'),
					recipientId: addresses[i],
					amount: convertLSKToBeddows('1000'),
					passphrase: genesis.passphrase,
				});
				const newBlock = await nodeUtils.createBlock(node, [
					node.chain.deserializeTransaction(transaction),
				]);
				await node.processor.process(newBlock);
			}
		});

		describe('when rebuilding up to 2nd rounds', () => {
			beforeAll(async () => {
				await node.rebuilder.rebuild(2);
			});

			it('should build the same account state as original', async () => {
				const rebuiltAccounts = await node.chain.dataAccess.getAccountsByAddress(
					addresses,
				);
				expect.assertions(accounts.length);
				for (const account of accounts) {
					const rebuiltAccount = rebuiltAccounts.find(
						acc => account.address === acc.address,
					);
					expect(account.balance.toString()).toEqual(
						rebuiltAccount.balance.toString(),
					);
				}
			});

			it('should remove blocks after 3 rounds', async () => {
				const blocks = await node.chain.dataAccess.getBlockHeadersByHeightBetween(
					203,
					303,
				);
				expect(blocks).toHaveLength(0);
			});
		});
	});
});
