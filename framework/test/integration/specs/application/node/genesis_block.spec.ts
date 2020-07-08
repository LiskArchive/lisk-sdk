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

import { KVStore } from '@liskhq/lisk-db';
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { nodeUtils } from '../../../../utils';
import { createDB, removeDB } from '../../../../utils/kv_store';
import { Node } from '../../../../../src/application/node';
import { genesis, genesisBlock as getGenesisBlock } from '../../../../fixtures';

describe('genesis block', () => {
	const dbName = 'genesis_block';
	const genesisBlock = getGenesisBlock();
	let node: Node;
	let blockchainDB: KVStore;
	let forgerDB: KVStore;

	beforeAll(async () => {
		({ blockchainDB, forgerDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);
		await node['_forger'].loadDelegates();
	});

	afterAll(async () => {
		await node.cleanup();
		await blockchainDB.close();
		await forgerDB.close();
		removeDB(dbName);
	});

	describe('given the application has not been initialized', () => {
		describe('when chain module is bootstrapped', () => {
			it('should save genesis block to the database', async () => {
				const block = await node['_chain'].dataAccess.getBlockByID(genesisBlock.header.id);

				expect(block.header.version).toEqual(0);
				expect(block.header).toEqual(genesisBlock.header);
			});

			it('should save accounts from genesis block assets', async () => {
				// Get genesis accounts
				const genesisAccounts = genesisBlock.header.asset.accounts;

				// Get delegate accounts in genesis block from the database
				const accountsFromDb = await Promise.all(
					genesisAccounts.map(async account =>
						node['_chain'].dataAccess.getAccountByAddress(account.address),
					),
				);

				expect(genesisAccounts).toEqual(accountsFromDb);
			});

			it('should have correct delegate list', async () => {
				const delegateListFromChain = await nodeUtils.getDelegateList(node, 1);
				expect(delegateListFromChain).toMatchSnapshot();
			});
		});
	});

	describe('given the application was initialized earlier', () => {
		const account =
			genesisBlock.header.asset.accounts[genesisBlock.header.asset.accounts.length - 1];
		let newBalance: bigint;
		let oldBalance: bigint;

		beforeEach(async () => {
			const genesisAccount = await node['_chain'].dataAccess.getAccountByAddress(genesis.address);
			const recipient = await node['_chain'].dataAccess.getAccountByAddress(account.address);
			oldBalance = account.balance;
			newBalance = oldBalance + BigInt('100000000000');

			const transaction = new TransferTransaction({
				nonce: genesisAccount.nonce,
				senderPublicKey: genesis.publicKey,
				fee: BigInt('200000'),
				asset: {
					recipientAddress: recipient.address,
					amount: BigInt('100000000000'),
					data: '',
				},
			});
			transaction.sign(node['_networkIdentifier'], genesis.passphrase);
			const newBlock = await nodeUtils.createBlock(node, [transaction]);
			await node['_processor'].process(newBlock);
		});

		describe('when chain module is bootstrapped', () => {
			it('should not apply the genesis block again', async () => {
				// Act
				// Re-initialize the node
				node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);

				// Arrange & Assert
				const recipient = await node['_chain'].dataAccess.getAccountByAddress(account.address);
				expect(recipient.balance).toEqual(newBalance);
			});
		});
	});
});
