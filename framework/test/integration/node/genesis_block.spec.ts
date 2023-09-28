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

import { Database } from '@liskhq/lisk-db';
import { Account } from '@liskhq/lisk-chain';
import { validator } from '@liskhq/lisk-validator';
import { nodeUtils } from '../../utils';
import { createDB, removeDB } from '../../utils/kv_store';
import { Node } from '../../../src/node';
import { genesis, genesisBlock as getGenesisBlock, DefaultAccountProps } from '../../fixtures';
import { createTransferTransaction } from '../../utils/node/transaction';

describe('genesis block', () => {
	const dbName = 'genesis_block';
	const genesisBlock = getGenesisBlock();
	let node: Node;
	let blockchainDB: Database;
	let forgerDB: Database;

	beforeAll(async () => {
		({ blockchainDB, forgerDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);
		// Since node start the forging so we have to stop the job
		// Our test make use of manual forging of blocks
		node['_forgingJob'].stop();
	});

	afterAll(async () => {
		await node.cleanup();
		blockchainDB.close();
		forgerDB.close();
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
				const delegateListFromChain = await nodeUtils.getDelegateList(node);
				expect(delegateListFromChain).toMatchSnapshot();
			});
		});
	});

	describe('given the application was initialized earlier', () => {
		const account = (genesisBlock.header.asset.accounts[
			genesisBlock.header.asset.accounts.length - 1
		] as unknown) as Account<DefaultAccountProps>;
		let newBalance: bigint;
		let oldBalance: bigint;

		beforeEach(async () => {
			// FIXME: Remove with #5572
			validator.removeSchema('/block/header');
			const genesisAccount = await node[
				'_chain'
			].dataAccess.getAccountByAddress<DefaultAccountProps>(genesis.address);
			const recipient = await node['_chain'].dataAccess.getAccountByAddress<DefaultAccountProps>(
				account.address,
			);
			oldBalance = account.token.balance;
			newBalance = oldBalance + BigInt('100000000000');

			const transaction = createTransferTransaction({
				amount: BigInt('100000000000'),
				recipientAddress: recipient.address,
				networkIdentifier: node['_networkIdentifier'],
				nonce: genesisAccount.sequence.nonce,
				passphrase: genesis.passphrase,
			});
			const newBlock = await nodeUtils.createBlock(node, [transaction]);
			await node['_processor'].process(newBlock);
		});

		describe('when chain module is bootstrapped', () => {
			it('should not apply the genesis block again', async () => {
				// Act
				// Re-initialize the node
				node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);

				// Arrange & Assert
				const recipient = await node['_chain'].dataAccess.getAccountByAddress<DefaultAccountProps>(
					account.address,
				);
				expect(recipient.token.balance).toEqual(newBalance);
			});
		});
	});
});
